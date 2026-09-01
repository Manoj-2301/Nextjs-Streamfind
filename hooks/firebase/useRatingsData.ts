/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { logUserActivity } from '@/lib/genreTracker';
import { toast } from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';
import {
  fetchUserRatings,
  saveUserRatingDB,
  saveGlobalReviewDB,
  isUserPremium,
  UserReview
} from '@/services/firebase/ratingService';

const EMPTY_RATINGS = { ratings: {}, reviews: [] as UserReview[] };


/*
 * ============================================================
 * HOOK
 * ============================================================
 */
export function useRatingsData() {

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const [userRatings, setUserRatings] = useState<Record<number, number>>({});
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const { user } = useAuth();
  const queryClient = useQueryClient();


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const { data: fetchedRatings = EMPTY_RATINGS } = useQuery({
    queryKey: ['ratings', user?.uid],
    queryFn: () => user ? fetchUserRatings(user.uid) : Promise.resolve(EMPTY_RATINGS),
    enabled: !!user,
  });


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    if (user) {
      setUserRatings(fetchedRatings.ratings);
      setUserReviews(fetchedRatings.reviews);
    } else {
      setUserRatings({});
      setUserReviews([]);
    }
  }, [fetchedRatings, user]);

  const setUserRating = async (
    movieId: number, 
    rating: number, 
    movieDetails?: { title: string; posterUrl: string },
    reviewText?: string
  ) => {
    if (!user) return;
    try {
      // Check review limits before adding a NEW review text
      if (reviewText && reviewText.trim() !== '') {
        const existingReview = userReviews.find(r => r.movieId === movieId);
        if (!existingReview || !existingReview.reviewText || existingReview.reviewText.trim() === '') {
          // This is a NEW review (not an edit of an existing review)
          const totalReviews = userReviews.filter(r => r.reviewText && r.reviewText.trim() !== '').length;
          if (totalReviews >= 5) {
            const isPremium = await isUserPremium(user.uid);
            if (!isPremium) {
              toast.error("Upgrade to Premium to write more than 5 reviews!");
              return;
            }
          }
        }
      }

      if (reviewText) {
        logUserActivity("Review", `Reviewed "${movieDetails?.title || 'Movie'}" (Rated ${rating}/5)`);
      } else {
        logUserActivity("Rating", `Rated "${movieDetails?.title || 'Movie'}" ${rating}/5 stars`);
      }

      const dataToSet: any = {
        movieId,
        rating,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous Film Buff',
        userPhoto: user.photoURL || '',
      };
      
      if (movieDetails) {
        dataToSet.movieTitle = movieDetails.title;
        dataToSet.moviePoster = movieDetails.posterUrl;
      }
      
      if (reviewText !== undefined) {
        dataToSet.reviewText = reviewText;
      }

      await saveUserRatingDB(user.uid, movieId, dataToSet);

      // Save to global reviews as well
      try {
        const existingReview = userReviews.find(r => r.movieId === movieId);
        const textToWrite = reviewText !== undefined ? reviewText : (existingReview?.reviewText || '');

        const globalData = {
          userId: user.uid,
          userName: user.displayName || user.email?.split('@')[0] || 'Anonymous Film Buff',
          userPhoto: user.photoURL || '',
          rating,
          reviewText: textToWrite
        };
        await saveGlobalReviewDB(movieId, user.uid, globalData);
      } catch (globalErr) {
        console.warn("Failed to write to public global reviews collection (check security rules):", globalErr);
      }
      
      queryClient.invalidateQueries({ queryKey: ['ratings', user.uid] });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/ratings/${movieId}`);
    }
  };

  const getUserRating = (movieId: number) => {
    return userRatings[movieId] || null;
  };

  const getUserReviewText = (movieId: number) => {
    const found = userReviews.find(r => r.movieId === movieId);
    return found?.reviewText || null;
  };

  return {
    userRatings,
    userReviews,
    setUserRating,
    getUserRating,
    getUserReviewText
  };
}
