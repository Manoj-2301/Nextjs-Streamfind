/*
 * ============================================================
 * RATING & REVIEW DATA SERVICE
 * ============================================================
 *
 * Responsibility:
 * Handles Firestore operations for user ratings, user reviews, 
 * and global movie community reviews.
 *
 * Used by:
 * - hooks/firebase/useRatingsData.ts
 * - components/movie-details/index.tsx
 *
 * Important:
 * Contains only data-access logic. Realtime subscription functions
 * return cleanup functions that must be called on unmount.
 * ============================================================
 */

/*
 * ============================================================
 * IMPORTS & INITIALIZATION
 * ============================================================
 */
import { getFirestore, collection, collectionGroup, query, limit, onSnapshot, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

export interface UserReview {
  movieId: number;
  rating: number;
  movieTitle: string;
  moviePoster: string;
  reviewText?: string;
  updatedAt: any;
  liked?: boolean;
}

/*
 * ============================================================
 * USER DATA FETCHING
 * ============================================================
 */

/** 
 * Fetch user's ratings and reviews.
 * 
 * Limited to 100 to prevent massive initial payloads. If a user 
 * has thousands of reviews, cursor pagination should be added later.
 */
export async function fetchUserRatings(uid: string): Promise<{ ratings: Record<number, number>; reviews: UserReview[] }> {
  const path = `users/${uid}/ratings`;
  const q = query(collection(db, path), limit(100));
  const snapshot = await getDocs(q);
  
  const ratings: Record<number, number> = {};
  const reviews: UserReview[] = [];
  
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const rVal = data.rating;
    ratings[Number(docSnap.id)] = rVal;
    
    reviews.push({
      movieId: Number(docSnap.id),
      rating: rVal,
      movieTitle: data.movieTitle || 'Unknown Movie',
      moviePoster: data.moviePoster || '',
      reviewText: data.reviewText || '',
      updatedAt: data.updatedAt,
      liked: !!data.liked
    });
  });
  return { ratings, reviews };
}

/*
 * ============================================================
 * RATING MUTATIONS
 * ============================================================
 */

/** 
 * Write rating to user document. 
 */
export async function saveUserRatingDB(
  uid: string, 
  movieId: number, 
  dataToSet: any
): Promise<void> {
  const path = `users/${uid}/ratings/${movieId}`;
  await setDoc(doc(db, path), {
    ...dataToSet,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/** 
 * Write review to global movies collection. 
 * This enables querying reviews by movie without scanning all users.
 */
export async function saveGlobalReviewDB(
  movieId: number, 
  uid: string, 
  globalData: any
): Promise<void> {
  const globalPath = `movies/${movieId}/reviews/${uid}`;
  await setDoc(doc(db, globalPath), {
    ...globalData,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/** Check if the user is on the premium plan (used for enforcing review limits) */
export async function isUserPremium(uid: string): Promise<boolean> {
  const userDoc = await getDoc(doc(db, `users/${uid}`));
  return userDoc.data()?.plan === 'premium';
}
/*
 * ============================================================
 * COMMUNITY REVIEWS
 * ============================================================
 */
export interface CommunityReview {
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  reviewText: string;
  isCritic: boolean;
}

/**
 * Subscribe to real-time community reviews for a single movie.
 * 
 * Why realtime:
 * Keeps the movie details page updated instantly as other users rate it.
 * 
 * Why collectionGroup:
 * Reviews are nested under `users/{uid}/ratings`. A collectionGroup query 
 * finds all `ratings` subcollections across the database matching the movieId,
 * which is much faster than scanning every user manually.
 * 
 * Cleanup:
 * Requires calling the returned unsubscribe function on unmount.
 */
export function subscribeToMovieReviews(
  movieId: number,
  onUpdate: (reviews: CommunityReview[]) => void,
  onError: (err: Error) => void
) {
  const q = query(collectionGroup(db, 'ratings'), where('movieId', '==', movieId));
  return onSnapshot(q, (snapshot) => {
    const list: CommunityReview[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.reviewText) {
        list.push({
          userId: data.userId || docSnap.ref.parent.parent?.id || 'anonymous',
          userName: data.userName || 'Anonymous Film Buff',
          userPhoto: data.userPhoto || '',
          rating: data.rating || 5,
          reviewText: data.reviewText,
          isCritic: false
        });
      }
    });
    onUpdate(list);
  }, onError);
}
