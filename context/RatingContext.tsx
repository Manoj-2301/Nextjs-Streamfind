'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';

interface RatingContextType {
  userRatings: Record<number, number>;
  setUserRating: (movieId: number, rating: number) => Promise<void>;
  getUserRating: (movieId: number) => number | null;
}

const RatingContext = createContext<RatingContextType | undefined>(undefined);

export function RatingProvider({ children }: { children: React.ReactNode }) {
  const [userRatings, setUserRatings] = useState<Record<number, number>>({});
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setUserRatings({});
      return;
    }

    const path = `users/${user.uid}/ratings`;
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ratings: Record<number, number> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        ratings[Number(docSnap.id)] = data.rating;
      });
      setUserRatings(ratings);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  const setUserRating = async (movieId: number, rating: number) => {
    if (!user) return;
    const path = `users/${user.uid}/ratings/${movieId}`;
    try {
      await setDoc(doc(db, path), {
        movieId,
        rating,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const getUserRating = (movieId: number) => {
    return userRatings[movieId] || null;
  };

  return (
    <RatingContext.Provider value={{ userRatings, setUserRating, getUserRating }}>
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
