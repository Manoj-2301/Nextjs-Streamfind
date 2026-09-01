import { getFirestore, doc, collection, getDocs, deleteDoc, updateDoc, deleteField, writeBatch, addDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

/**
 * Submits a new support ticket to the database.
 */
export async function submitSupportTicket(data: { uid: string; email: string; type: string; message: string }): Promise<void> {
  await addDoc(collection(db, 'support_tickets'), {
    userId: data.uid || 'anonymous',
    email: data.email || '',
    type: data.type,
    message: data.message,
    status: 'open',
    createdAt: new Date().toISOString()
  });
}

/**
 * Clears search history from Firebase for the given user.
 */
export async function clearSearchHistory(uid: string): Promise<void> {
  // Delete the fields on the user document
  await updateDoc(doc(db, `users/${uid}`), {
    searchHistory: deleteField(),
    recentSearches: deleteField(),
  });

  // Delete all documents in the search_history subcollection
  try {
    const shDocs = await getDocs(collection(db, `users/${uid}/search_history`));
    if (!shDocs.empty) {
      const batch = writeBatch(db);
      shDocs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.error('Failed to clear search_history collection', err);
  }
}

/**
 * Clears watch history (watchlist and reviews) for the given user.
 */
export async function clearWatchHistory(uid: string): Promise<void> {
  const batch = writeBatch(db);
  const wlDocs = await getDocs(collection(db, `users/${uid}/watchlist`));
  wlDocs.forEach(d => batch.delete(d.ref));
  const rvDocs = await getDocs(collection(db, `users/${uid}/reviews`));
  rvDocs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

/**
 * Deletes curation data (DNA moods, runtime, top 10) for the given user.
 */
export async function deleteCurationData(uid: string): Promise<void> {
  await updateDoc(doc(db, `users/${uid}`), {
    dnaMoods: deleteField(),
    dnaRuntime: deleteField(),
    top10: deleteField(),
  });
}

/**
 * Fetches all audit logs for a given user.
 */
export async function fetchUserAuditLogs(uid: string): Promise<any[]> {
  const auditSnap = await getDocs(collection(db, 'users', uid, 'audit_logs'));
  return auditSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Fetches all search history entries for a given user.
 */
export async function fetchUserSearchHistory(uid: string): Promise<any[]> {
  const searchSnap = await getDocs(collection(db, 'users', uid, 'search_history'));
  return searchSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}
