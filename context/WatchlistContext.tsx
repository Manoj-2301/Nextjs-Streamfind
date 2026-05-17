'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Movie } from '@/types';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';

interface WatchlistContextType {
  watchlist: Movie[];
  addToWatchlist: (movie: Movie) => Promise<void>;
  removeFromWatchlist: (movieId: number) => Promise<void>;
  isInWatchlist: (movieId: number) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setWatchlist([]);
      return;
    }

    const path = `users/${user.uid}/watchlist`;
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Movie[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Movie);
      });
      setWatchlist(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  const addToWatchlist = async (movie: Movie) => {
    if (!user) return;
    const path = `users/${user.uid}/watchlist/${movie.id}`;
    try {
      await setDoc(doc(db, path), {
        ...movie,
        addedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const removeFromWatchlist = async (movieId: number) => {
    if (!user) return;
    const path = `users/${user.uid}/watchlist/${movieId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const isInWatchlist = (movieId: number) => {
    return watchlist.some(m => m.id === movieId);
  };

  return (
    <WatchlistContext.Provider value={{ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
}
