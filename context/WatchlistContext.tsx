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

const LOCAL_STORAGE_KEY = 'streamfind_anonymous_watchlist';
const EXPIRY_TIME_MS = 2 * 60 * 60 * 1000; // 2 hours

interface LocalWatchlistItem {
  movie: Movie;
  addedAt: number;
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!user) {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          const parsed: LocalWatchlistItem[] = JSON.parse(stored);
          const now = Date.now();
          const validItems = parsed.filter(item => now - item.addedAt < EXPIRY_TIME_MS);
          
          if (validItems.length !== parsed.length) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(validItems));
          }
          
          setWatchlist(validItems.map(item => item.movie));
        } catch (e) {
          console.error("Error parsing local watchlist:", e);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      } else {
        setWatchlist([]);
      }
      return;
    }

    // User is logged in: Merge local items to Firebase
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: LocalWatchlistItem[] = JSON.parse(stored);
        const now = Date.now();
        const validItems = parsed.filter(item => now - item.addedAt < EXPIRY_TIME_MS);
        
        validItems.forEach(async (item) => {
          const path = `users/${user.uid}/watchlist/${item.movie.id}`;
          await setDoc(doc(db, path), {
            ...item.movie,
            addedAt: serverTimestamp()
          }, { merge: true });
        });
        
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {
        console.error("Error merging local watchlist:", e);
      }
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
    if (!user) {
      if (typeof window !== 'undefined') {
        const now = Date.now();
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        let items: LocalWatchlistItem[] = stored ? JSON.parse(stored) : [];
        
        items = items.filter(i => i.movie.id !== movie.id);
        items.push({ movie, addedAt: now });
        
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
        setWatchlist(items.map(i => i.movie));
      }
      return;
    }

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
    if (!user) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          let items: LocalWatchlistItem[] = JSON.parse(stored);
          items = items.filter(i => i.movie.id !== movieId);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
          setWatchlist(items.map(i => i.movie));
        }
      }
      return;
    }

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
