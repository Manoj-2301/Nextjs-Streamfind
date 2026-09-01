import { getFirestore, collection, query, limit, getDocs, doc, setDoc, serverTimestamp, deleteDoc, addDoc, getDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { Movie } from '@/types';
import { CustomWatchlist } from '@/context/WatchlistContext'; // Wait, I should probably move the CustomWatchlist interface to types, but let's just export it from here or use it. Actually, I will redefine it or import it.

const db = getFirestore(app);

export interface LocalWatchlistItem {
  movie: Movie;
  addedAt: number;
}

/** Fetch user's main watchlist (limited to 100 to prevent memory bloat on load) */
export async function fetchWatchlist(uid: string): Promise<Movie[]> {
  const path = `users/${uid}/watchlist`;
  const q = query(collection(db, path), limit(100));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as Movie);
}

/** Fetch all custom watchlists for a user */
export async function fetchCustomWatchlists(uid: string): Promise<CustomWatchlist[]> {
  const path = `users/${uid}/customWatchlists`;
  const q = query(collection(db, path));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomWatchlist));
}

/** Merge anonymous local watchlist to Firestore upon login */
export async function mergeLocalWatchlistDB(uid: string, validItems: LocalWatchlistItem[]): Promise<void> {
  if (validItems.length === 0) return;
  for (const item of validItems) {
    const path = `users/${uid}/watchlist/${item.movie.id}`;
    await setDoc(doc(db, path), {
      ...item.movie,
      addedAt: serverTimestamp()
    }, { merge: true });
  }
}

/** Check if the user is on the premium plan (used for enforcing watchlist limits) */
export async function isUserPremium(uid: string): Promise<boolean> {
  const userDoc = await getDoc(doc(db, `users/${uid}`));
  return userDoc.data()?.plan === 'premium';
}

/** Add a movie to the main watchlist */
export async function addToWatchlistDB(uid: string, movie: Movie): Promise<void> {
  const path = `users/${uid}/watchlist/${movie.id}`;
  await setDoc(doc(db, path), {
    ...movie,
    addedAt: serverTimestamp()
  });
}

/** Remove a movie from the main watchlist */
export async function removeFromWatchlistDB(uid: string, movieId: number): Promise<void> {
  const path = `users/${uid}/watchlist/${movieId}`;
  await deleteDoc(doc(db, path));
}

/** Create a new custom watchlist */
export async function createCustomWatchlistDB(uid: string, name: string): Promise<void> {
  await addDoc(collection(db, `users/${uid}/customWatchlists`), {
    name,
    createdAt: serverTimestamp(),
  });
}

/** Delete a custom watchlist */
export async function deleteCustomWatchlistDB(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, `users/${uid}/customWatchlists/${id}`));
}

/** Add a movie to a custom watchlist */
export async function addToCustomWatchlistDB(uid: string, listId: string, movie: Movie): Promise<void> {
  const path = `users/${uid}/customWatchlists/${listId}/movies/${movie.id}`;
  await setDoc(doc(db, path), {
    ...movie,
    addedAt: serverTimestamp()
  });
}

/** Remove a movie from a custom watchlist */
export async function removeFromCustomWatchlistDB(uid: string, listId: string, movieId: number): Promise<void> {
  const path = `users/${uid}/customWatchlists/${listId}/movies/${movieId}`;
  await deleteDoc(doc(db, path));
}
