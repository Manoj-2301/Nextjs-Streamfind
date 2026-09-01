import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { ProfileSettings } from '@/types';
import { Movie } from '@/types';
import { UserReview } from '@/context/RatingContext';
import { AuditEvent } from '@/lib/auditLogger';

const db = () => getFirestore(app);

// ─────────────────────────────────────────────────────────────
// Subscriptions (realtime)
// ─────────────────────────────────────────────────────────────

/**
 * Subscribe to a user's profile document in Firestore.
 * Calls `onUpdate` whenever the document changes.
 * Returns an unsubscribe function.
 */
export function subscribeToProfile(
  uid: string,
  onUpdate: (data: Partial<ProfileSettings & { frameId?: string; email?: string; displayName?: string }> | null) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db(), `users/${uid}`);
  return onSnapshot(
    docRef,
    (snap) => {
      onUpdate(snap.exists() ? (snap.data() as any) : null);
    },
    (error) => {
      console.error('[profileService] subscribeToProfile error:', error);
      onError?.(error);
    }
  );
}

/**
 * Subscribe to a shared user's watchlist (read-only, for viewing another user's profile).
 * Returns an unsubscribe function.
 */
export function subscribeToSharedWatchlist(
  uid: string,
  onUpdate: (movies: Movie[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(db(), `users/${uid}/watchlist`));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Movie[] = snapshot.docs.map((d) => d.data() as Movie);
      onUpdate(items);
    },
    (error) => {
      console.error('[profileService] subscribeToSharedWatchlist error:', error);
      onError?.(error);
    }
  );
}

/**
 * Subscribe to a shared user's ratings (read-only, for viewing another user's profile).
 * Returns an unsubscribe function.
 */
export function subscribeToSharedRatings(
  uid: string,
  onUpdate: (reviews: UserReview[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(db(), `users/${uid}/ratings`));
  return onSnapshot(
    q,
    (snapshot) => {
      const reviews: UserReview[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          movieId: Number(docSnap.id),
          rating: data.rating,
          movieTitle: data.movieTitle || 'Unknown Movie',
          moviePoster: data.moviePoster || '',
          reviewText: data.reviewText || '',
          updatedAt: data.updatedAt,
          liked: !!data.liked,
        };
      });
      onUpdate(reviews);
    },
    (error) => {
      console.error('[profileService] subscribeToSharedRatings error:', error);
      onError?.(error);
    }
  );
}

// ─────────────────────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────────────────────

/** Merge arbitrary fields into a user's profile document. */
export async function updateUserProfile(uid: string, fields: Record<string, unknown>): Promise<void> {
  const docRef = doc(db(), `users/${uid}`);
  await setDoc(docRef, fields, { merge: true });
}

/** Initialize a brand-new user document in Firestore if it does not exist yet. */
export async function initUserProfile(uid: string, data: Record<string, unknown>): Promise<void> {
  const docRef = doc(db(), `users/${uid}`);
  await setDoc(docRef, data);
}

/** Toggle the liked status on a single rating document. */
export async function toggleRatingLike(uid: string, movieId: number, liked: boolean): Promise<void> {
  const ratingRef = doc(db(), `users/${uid}/ratings/${movieId}`);
  await setDoc(ratingRef, { liked }, { merge: true });
}

/** Persist the user's photo URL to Firestore (used after image upload). */
export async function savePhotoURL(uid: string, photoURL: string): Promise<void> {
  await updateUserProfile(uid, { photoURL });
}

/** Save core profile edits (bio, display name, avatar frame). */
export async function saveProfileEdit(
  uid: string,
  fields: { bio: string; avatarFrame: string; displayName: string }
): Promise<void> {
  await updateUserProfile(uid, {
    bio: fields.bio,
    avatarFrame: fields.avatarFrame,
    // Keep frameId in sync for backward compatibility with the Vite version
    frameId: fields.avatarFrame,
    displayName: fields.displayName,
  });
}

/** Toggle a user's streaming platform subscription. */
export async function saveSubscriptions(uid: string, subscriptions: string[]): Promise<void> {
  await updateUserProfile(uid, { subscriptions });
}

/** Toggle a boolean preference field. */
export async function savePreference(uid: string, field: string, value: boolean): Promise<void> {
  await updateUserProfile(uid, { [field]: value });
}

/** Save the user's watch region. */
export async function saveWatchRegion(uid: string, region: string): Promise<void> {
  await updateUserProfile(uid, { watchRegion: region });
}

/** Save the user's favorite genres array. */
export async function saveFavoriteGenres(uid: string, genres: string[]): Promise<void> {
  await updateUserProfile(uid, { favoriteGenres: genres });
}

/** Save any single field with any value (used for DNA moods, language, etc.) */
export async function saveFieldValue(uid: string, field: string, value: unknown): Promise<void> {
  await updateUserProfile(uid, { [field]: value });
}

/** Save the user's Top 5 movies list. */
export async function saveTop5(uid: string, top5: unknown[]): Promise<void> {
  const sanitized = JSON.parse(JSON.stringify(top5));
  await updateUserProfile(uid, { top10: sanitized });
}

/** Save DNA moods array. */
export async function saveDnaMoods(uid: string, moods: string[]): Promise<void> {
  await updateUserProfile(uid, { dnaMoods: moods });
}

// ─────────────────────────────────────────────────────────────
// Tracked Releases
// ─────────────────────────────────────────────────────────────

/** Subscribe to a user's tracked release IDs. Returns unsubscribe. */
export function subscribeToTrackedReleases(
  uid: string,
  onUpdate: (ids: number[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = collection(db(), `users/${uid}/trackedReleases`);
  return onSnapshot(
    q,
    (snap) => onUpdate(snap.docs.map((d) => Number(d.id))),
    (err) => {
      if ((err as any).code !== 'permission-denied') {
        console.error('[profileService] subscribeToTrackedReleases error:', err);
      }
      onError?.(err);
    }
  );
}

/** Track or untrack a release. */
export async function setTrackedRelease(
  uid: string,
  movieId: number,
  track: boolean,
  movieTitle?: string
): Promise<void> {
  const ref = doc(db(), `users/${uid}/trackedReleases/${movieId}`);
  if (track) {
    await setDoc(ref, { movieId, title: movieTitle || '', trackedAt: new Date() });
  } else {
    await deleteDoc(ref);
  }
}

// ─────────────────────────────────────────────────────────────
// Active Sessions
// ─────────────────────────────────────────────────────────────

/** Subscribe to a user's active sessions list. Returns unsubscribe. */
export function subscribeToActiveSessions(
  uid: string,
  onUpdate: (sessions: any[]) => void,
  currentSessionId?: string | null
): () => void {
  const q = query(
    collection(db(), 'users', uid, 'sessions'),
    orderBy('lastActive', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      let lastActiveStr = 'Unknown';
      if (data.lastActive) {
        const date = data.lastActive.toDate();
        const diffMs = Date.now() - date.getTime();
        if (diffMs < 5 * 60 * 1000) lastActiveStr = 'Active now';
        else if (diffMs < 60 * 60 * 1000) lastActiveStr = `${Math.floor(diffMs / 60000)} mins ago`;
        else if (diffMs < 24 * 60 * 60 * 1000) lastActiveStr = `${Math.floor(diffMs / 3600000)} hours ago`;
        else lastActiveStr = date.toLocaleDateString();
      }
      return {
        id: docSnap.id,
        device: data.deviceInfo?.fullString || 'Unknown Device',
        browser: data.deviceInfo?.browser || 'Unknown',
        location: data.location || 'Location unavailable',
        lastActive: lastActiveStr,
        current: docSnap.id === currentSessionId,
      };
    });
    onUpdate(sessions);
  });
}

// ─────────────────────────────────────────────────────────────
// Audit Logs + Billing
// ─────────────────────────────────────────────────────────────

/** Subscribe to audit logs (last 5) + get total count. Returns unsubscribe. */
export function subscribeToAuditLogs(
  uid: string,
  onUpdate: (logs: AuditEvent[], totalCount: number) => void,
  onError?: (e: Error) => void
): () => void {
  const auditRef = collection(db(), `users/${uid}/audit_logs`);
  const q = query(auditRef, orderBy('timestamp', 'desc'), limit(5));

  // Fire off one-shot count fetch (doesn't need to be realtime)
  getCountFromServer(auditRef)
    .then((snap) => {
      // Will be re-called when the snapshot fires; this is for the initial badge
    })
    .catch((err) => {
      if ((err as any).code !== 'permission-denied') console.error('[profileService] audit count error:', err);
    });

  return onSnapshot(
    q,
    async (snapshot) => {
      const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditEvent));
      try {
        const countSnap = await getCountFromServer(auditRef);
        onUpdate(logs, countSnap.data().count);
      } catch {
        onUpdate(logs, 0);
      }
    },
    (err) => {
      if ((err as any).code !== 'permission-denied') {
        console.error('[profileService] subscribeToAuditLogs error:', err);
      }
      onError?.(err);
    }
  );
}

/** Subscribe to billing/plan data from user document. Returns unsubscribe. */
export function subscribeToBilling(
  uid: string,
  onUpdate: (billing: { plan: string; invoices: any[]; renewalDate: string }) => void,
  onError?: (e: Error) => void
): () => void {
  const userDocRef = doc(db(), `users/${uid}`);
  return onSnapshot(
    userDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let renewalDate = 'N/A';
        if (data.subscriptionUpdatedAt) {
          const date = data.subscriptionUpdatedAt.toDate();
          date.setFullYear(date.getFullYear() + 1);
          renewalDate = date.toLocaleDateString();
        }
        onUpdate({
          plan: data.plan || 'free',
          invoices: data.invoices || [],
          renewalDate,
        });
      }
    },
    (err) => {
      if ((err as any).code !== 'permission-denied') {
        console.error('[profileService] subscribeToBilling error:', err);
      }
      onError?.(err);
    }
  );
}
