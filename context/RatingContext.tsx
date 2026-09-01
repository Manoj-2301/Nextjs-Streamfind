/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';
import React, { createContext, useContext } from 'react';
import { useRatingsData } from '@/hooks/firebase/useRatingsData';
import { UserReview } from '@/services/firebase/ratingService';

/*
 * ============================================================
 * TYPES
 * ============================================================
 */
export type { UserReview };

interface RatingContextType {
  userRatings: Record<number, number>;
  userReviews: UserReview[];
  setUserRating: (
    movieId: number, 
    rating: number, 
    movieDetails?: { title: string; posterUrl: string },
    reviewText?: string
  ) => Promise<void>;
  getUserRating: (movieId: number) => number | null;
  getUserReviewText: (movieId: number) => string | null;
}

/*
 * ============================================================
 * CONTEXT
 * ============================================================
 */
const RatingContext = createContext<RatingContextType | undefined>(undefined);

/*
 * ============================================================
 * PROVIDER COMPONENT
 * ============================================================
 */
export function RatingProvider({ children }: { children: React.ReactNode }) {
  const ratingsData = useRatingsData();

  return (
    <RatingContext.Provider value={ratingsData}>
      {children}
    </RatingContext.Provider>
  );
}

/*
 * ============================================================
 * HOOK
 * ============================================================
 */
export function useRatings() {
  const context = useContext(RatingContext);
  if (context === undefined) {
    throw new Error('useRatings must be used within a RatingProvider');
  }
  return context;
}

