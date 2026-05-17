'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';

export interface UserReview {
  movieId: number;
  rating: number;
  movieTitle: string;
  moviePoster: string;
  reviewText?: string;
  updatedAt: any;
}

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

const RatingContext = createContext<RatingContextType | undefined>(undefined);

export function RatingProvider({ children }: { children: React.ReactNode }) {
  const [userRatings, setUserRatings] = useState<Record<number, number>>({});
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setUserRatings({});
      setUserReviews([]);
      return;
    }

    const path = `users/${user.uid}/ratings`;
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
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
          updatedAt: data.updatedAt
        });
      });
      setUserRatings(ratings);
      setUserReviews(reviews);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  const setUserRating = async (
    movieId: number, 
    rating: number, 
    movieDetails?: { title: string; posterUrl: string },
    reviewText?: string
  ) => {
    if (!user) return;
    const path = `users/${user.uid}/ratings/${movieId}`;
    try {
      const dataToSet: any = {
        movieId,
        rating,
        updatedAt: serverTimestamp()
      };
      
      if (movieDetails) {
        dataToSet.movieTitle = movieDetails.title;
        dataToSet.moviePoster = movieDetails.posterUrl;
      }
      
      if (reviewText !== undefined) {
        dataToSet.reviewText = reviewText;
      }

      await setDoc(doc(db, path), dataToSet, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const getUserRating = (movieId: number) => {
    return userRatings[movieId] || null;
  };

  const getUserReviewText = (movieId: number) => {
    const found = userReviews.find(r => r.movieId === movieId);
    return found?.reviewText || null;
  };

  return (
    <RatingContext.Provider value={{ userRatings, userReviews, setUserRating, getUserRating, getUserReviewText }}>
      {children}
    </RatingContext.Provider>
  );
}

export function useRatings() {
  const context = useContext(RatingContext);
  if (context === undefined) {
    throw new Error('useRatings must be used within a RatingProvider');
  }
  return context;
}
