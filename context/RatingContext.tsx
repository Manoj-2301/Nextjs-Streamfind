'use client';
import { getFirestore } from 'firebase/firestore';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { app } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';
import { logUserActivity } from '@/lib/genreTracker';
import { toast } from 'react-hot-toast';

export interface UserReview {
  movieId: number;
  rating: number;
  movieTitle: string;
  moviePoster: string;
  reviewText?: string;
  updatedAt: any;
  liked?: boolean;
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

    let isMounted = true;
    let unsubscribe = () => {};

    import('firebase/firestore').then(({ collection, query, onSnapshot }) => {
      if (!isMounted) return;
      const path = `users/${user.uid}/ratings`;
      const q = query(collection(getFirestore(app), path));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
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
        setUserRatings(ratings);
        setUserReviews(reviews);
      }, (error: any) => {
        handleFirestoreError(error, OperationType.LIST, path);
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

  const setUserRating = async (
    movieId: number, 
    rating: number, 
    movieDetails?: { title: string; posterUrl: string },
    reviewText?: string
  ) => {
    if (!user) return;
    const path = `users/${user.uid}/ratings/${movieId}`;
    const globalPath = `movies/${movieId}/reviews/${user.uid}`;
    try {
      const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Check review limits before adding a NEW review text
      if (reviewText && reviewText.trim() !== '') {
        const existingReview = userReviews.find(r => r.movieId === movieId);
        if (!existingReview || !existingReview.reviewText || existingReview.reviewText.trim() === '') {
          // This is a NEW review (not an edit of an existing review)
          const totalReviews = userReviews.filter(r => r.reviewText && r.reviewText.trim() !== '').length;
          if (totalReviews >= 5) {
            const userDoc = await getDoc(doc(getFirestore(app), `users/${user.uid}`));
            if (userDoc.data()?.plan !== 'premium') {
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
        updatedAt: serverTimestamp(),
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

      await setDoc(doc(getFirestore(app), path), dataToSet, { merge: true });

      // Save to global reviews as well (wrapped in individual try-catch to be resilient to security rule restrictions)
      try {
        const existingReview = userReviews.find(r => r.movieId === movieId);
        const textToWrite = reviewText !== undefined ? reviewText : (existingReview?.reviewText || '');

        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const globalData = {
          userId: user.uid,
          userName: user.displayName || user.email?.split('@')[0] || 'Anonymous Film Buff',
          userPhoto: user.photoURL || '',
          rating,
          reviewText: textToWrite,
          updatedAt: serverTimestamp()
        };
        await setDoc(doc(getFirestore(app), globalPath), globalData, { merge: true });
      } catch (globalErr) {
        console.warn("Failed to write to public global reviews collection (check security rules):", globalErr);
      }
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
