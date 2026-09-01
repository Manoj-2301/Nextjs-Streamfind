import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  query, 
  limit, 
  collectionGroup 
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { AdminUser, AdminRating, FeaturedCuration } from '@/components/admin/types';
import { ContactQuery } from '@/components/admin/ContactQueriesView';

const db = getFirestore(app);

export function subscribeToContactQueries(
  onUpdate: (queries: ContactQuery[]) => void,
  onError: (err: Error) => void
) {
  return onSnapshot(collection(db, 'contact_queries'), (snap) => {
    const items: ContactQuery[] = [];
    snap.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() } as ContactQuery));
    onUpdate(items);
  }, onError);
}

export function subscribeToFeaturedCurations(
  onUpdate: (curations: FeaturedCuration[]) => void,
  onError: (err: Error) => void
) {
  return onSnapshot(collection(db, 'featured_curations'), (snap) => {
    const items: FeaturedCuration[] = [];
    snap.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() } as FeaturedCuration));
    items.sort((a, b) => (a.slotNo || '').localeCompare(b.slotNo || ''));
    onUpdate(items);
  }, onError);
}

export function subscribeToUsers(
  onUpdate: (users: AdminUser[]) => void,
  onError: (err: Error) => void
) {
  const usersQuery = query(collection(db, 'users'), limit(500));
  return onSnapshot(usersQuery, (snap) => {
    const items: AdminUser[] = [];
    snap.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() } as AdminUser));
    
    // Auto-mark inactive
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    items.forEach(u => {
      if (u.status === 'Inactive') return;
      const lastActive = u.lastActive?.toDate ? u.lastActive.toDate().getTime() : null;
      if (lastActive !== null && lastActive < thirtyDaysAgo) {
        updateDoc(doc(db, 'users', u.id), { status: 'Inactive' }).catch(e => console.warn(e));
        u.status = 'Inactive';
        if (u.email) {
          fetch('/api/notify/moderation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail: u.email,
              userName: u.displayName || u.email.split('@')[0] || 'Cinephile',
              type: 'inactive'
            })
          }).catch(e => console.warn(e));
        }
      }
    });
    onUpdate(items);
  }, onError);
}

export function subscribeToRatings(
  onUpdate: (ratings: AdminRating[]) => void,
  onError: (err: Error) => void
) {
  const ratingsQuery = query(collectionGroup(db, 'ratings'), limit(500));
  return onSnapshot(ratingsQuery, (snap) => {
    const items: AdminRating[] = [];
    snap.forEach(docSnap => {
      const parts = docSnap.ref.path.split('/');
      const userId = parts[1] || '';
      const movieId = parts[3] || '';
      items.push({ id: docSnap.id, userId, movieId, ...docSnap.data() } as AdminRating);
    });
    onUpdate(items);
  }, onError);
}

// ── Mutations ────────────────────────────────────────────────

export async function updateUserDB(
  userId: string,
  data: { displayName: string; status: string; flagged: boolean }
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), data);
}

export async function deleteUserAndDataDB(userId: string, userRatings: AdminRating[]): Promise<void> {
  // Delete public movie review subcollection docs
  for (const rating of userRatings) {
    try {
      await deleteDoc(doc(db, `movies/${rating.movieId}/reviews/${userId}`));
    } catch (e) {
      console.warn(`Could not delete public review for movie ${rating.movieId}:`, e);
    }
  }

  // Delete all rating subcollection docs
  for (const rating of userRatings) {
    try {
      await deleteDoc(doc(db, `users/${userId}/ratings/${rating.movieId}`));
    } catch (e) {
      console.warn(`Could not delete rating ${rating.movieId}:`, e);
    }
  }

  // Delete all watchlist documents
  try {
    const watchlistSnap = await getDocs(collection(db, `users/${userId}/watchlist`));
    for (const docSnap of watchlistSnap.docs) {
      await deleteDoc(docSnap.ref);
    }
  } catch (e) {
    console.warn('Could not delete watchlist subcollection:', e);
  }

  // Delete main user profile document
  await deleteDoc(doc(db, 'users', userId));
}

export async function deleteReviewDB(userId: string, movieId: string): Promise<void> {
  await deleteDoc(doc(db, `users/${userId}/ratings/${movieId}`));
  try {
    await deleteDoc(doc(db, `movies/${movieId}/reviews/${userId}`));
  } catch (e) {
    console.warn(`Could not delete public review for movie ${movieId}:`, e);
  }
}

export async function approveReviewDB(userId: string, movieId: string): Promise<void> {
  await updateDoc(doc(db, `users/${userId}/ratings/${movieId}`), { approved: true });
}

export async function deleteQueryDB(id: string): Promise<void> {
  await deleteDoc(doc(db, 'contact_queries', id));
}

export async function markQueryReadDB(id: string): Promise<void> {
  await updateDoc(doc(db, 'contact_queries', id), { status: 'Read' });
}

