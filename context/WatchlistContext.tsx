'use client';
import { getFirestore } from 'firebase/firestore';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Movie } from '@/types';
import { useAuth } from './AuthContext';
import { app } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';
import { logUserActivity } from '@/lib/genreTracker';
import { notify as toast } from '../lib/notify';
import dynamic from 'next/dynamic';

const AddToListModal = dynamic(() => import('@/components/ui/AddToListModal'), {
  ssr: false
});

export interface CustomWatchlist {
  id: string;
  name: string;
  count?: number;
}

interface WatchlistContextType {
  watchlist: Movie[];
  addToWatchlist: (movie: Movie) => Promise<void>;
  removeFromWatchlist: (movieId: number) => Promise<void>;
  isInWatchlist: (movieId: number) => boolean;
  
  // Custom Lists
  customWatchlists: CustomWatchlist[];
  createCustomWatchlist: (name: string) => Promise<void>;
  deleteCustomWatchlist: (id: string) => Promise<void>;
  addToCustomWatchlist: (listId: string, movie: Movie) => Promise<void>;
  removeFromCustomWatchlist: (listId: string, movieId: number) => Promise<void>;

  // Global Modal
  requestAddToList: (movie: Movie) => void;
  isModalOpen: boolean;
  closeModal: () => void;
  movieToAdd: Movie | null;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'streamfind_anonymous_watchlist';
const EXPIRY_TIME_MS = 2 * 60 * 60 * 1000; // 2 hours

interface LocalWatchlistItem {
  movie: Movie;
  addedAt: number;
}

const EMPTY_WATCHLIST: Movie[] = [];

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [customWatchlists, setCustomWatchlists] = useState<CustomWatchlist[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movieToAdd, setMovieToAdd] = useState<Movie | null>(null);

  // inside the provider
  const queryClient = useQueryClient();

  const { data: fetchedWatchlist = EMPTY_WATCHLIST } = useQuery({
    queryKey: ['watchlist', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const { collection, getDocs, query, limit } = await import('firebase/firestore');
      const pathWatchlist = `users/${user.uid}/watchlist`;
      // Fetch paginated or limited to prevent memory bloat on profile load
      const qWatchlist = query(collection(getFirestore(app), pathWatchlist), limit(100));
      const snapshot = await getDocs(qWatchlist);
      return snapshot.docs.map(doc => doc.data() as Movie);
    },
    enabled: !!user,
  });

  const { data: fetchedCustomLists = [] } = useQuery({
    queryKey: ['customWatchlists', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const { collection, getDocs, query } = await import('firebase/firestore');
      const pathCustom = `users/${user.uid}/customWatchlists`;
      const qCustom = query(collection(getFirestore(app), pathCustom));
      const snapshot = await getDocs(qCustom);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomWatchlist));
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      setWatchlist(fetchedWatchlist);
      setCustomWatchlists(fetchedCustomLists);
    }
  }, [fetchedWatchlist, fetchedCustomLists, user]);

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
      setCustomWatchlists([]);
      return;
    }

    // User is logged in: Merge local items to Firebase
    import('firebase/firestore').then(async ({ doc, setDoc, serverTimestamp }) => {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          const parsed: LocalWatchlistItem[] = JSON.parse(stored);
          const now = Date.now();
          const validItems = parsed.filter(item => now - item.addedAt < EXPIRY_TIME_MS);
          
          if (validItems.length > 0) {
            for (const item of validItems) {
              const path = `users/${user.uid}/watchlist/${item.movie.id}`;
              await setDoc(doc(getFirestore(app), path), {
                ...item.movie,
                addedAt: serverTimestamp()
              }, { merge: true });
            }
            queryClient.invalidateQueries({ queryKey: ['watchlist', user.uid] });
          }
          
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch (e) {
          console.error("Error merging local watchlist:", e);
        }
      }
    });

  }, [user, queryClient]);

  const isInWatchlist = React.useCallback((movieId: number) => {
    return watchlist.some(m => m.id === movieId);
  }, [watchlist]);

  const addToWatchlist = React.useCallback(async (movie: Movie) => {
    logUserActivity("Watchlist", `Added "${movie.title}" to watchlist`);
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
      const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Check limit for new additions
      if (!isInWatchlist(movie.id) && watchlist.length >= 15) {
        const userDoc = await getDoc(doc(getFirestore(app), `users/${user.uid}`));
        if (userDoc.data()?.plan !== 'premium') {
          toast.error("Upgrade to Premium to add more than 15 movies to your Watchlist!");
          return;
        }
      }

      await setDoc(doc(getFirestore(app), path), {
        ...movie,
        addedAt: serverTimestamp()
      });
      queryClient.invalidateQueries({ queryKey: ['watchlist', user.uid] });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }, [user, watchlist, isInWatchlist, queryClient]);

  const removeFromWatchlist = React.useCallback(async (movieId: number) => {
    const targetMovie = watchlist.find(m => m.id === movieId);
    if (targetMovie) {
      logUserActivity("Watchlist", `Removed "${targetMovie.title}" from watchlist`);
    }
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
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(getFirestore(app), path));
      queryClient.invalidateQueries({ queryKey: ['watchlist', user.uid] });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }, [user, watchlist, queryClient]);

  const requestAddToList = React.useCallback((movie: Movie) => {
    if (!user || customWatchlists.length === 0) {
      // Direct add
      addToWatchlist(movie);
      toast.success(`Added to Watchlist`);
    } else {
      // Open modal
      setMovieToAdd(movie);
      setIsModalOpen(true);
    }
  }, [user, customWatchlists, addToWatchlist]);

  const closeModal = React.useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setMovieToAdd(null), 200);
  }, []);

  // Custom List Functions
  const createCustomWatchlist = React.useCallback(async (name: string) => {
    if (!user) return;
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(getFirestore(app), `users/${user.uid}/customWatchlists`), {
        name,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to create custom watchlist", error);
      throw error;
    }
  }, [user]);

  const deleteCustomWatchlist = React.useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(getFirestore(app), `users/${user.uid}/customWatchlists/${id}`));
    } catch (error) {
      console.error("Failed to delete custom watchlist", error);
      throw error;
    }
  }, [user]);

  const addToCustomWatchlist = React.useCallback(async (listId: string, movie: Movie) => {
    if (!user) return;
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const path = `users/${user.uid}/customWatchlists/${listId}/movies/${movie.id}`;
      await setDoc(doc(getFirestore(app), path), {
        ...movie,
        addedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to add to custom watchlist", error);
      throw error;
    }
  }, [user]);

  const removeFromCustomWatchlist = React.useCallback(async (listId: string, movieId: number) => {
    if (!user) return;
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const path = `users/${user.uid}/customWatchlists/${listId}/movies/${movieId}`;
      await deleteDoc(doc(getFirestore(app), path));
    } catch (error) {
      console.error("Failed to remove from custom watchlist", error);
      throw error;
    }
  }, [user]);

  const value = React.useMemo(() => ({
    watchlist, 
    addToWatchlist, 
    removeFromWatchlist, 
    isInWatchlist,
    customWatchlists,
    createCustomWatchlist,
    deleteCustomWatchlist,
    addToCustomWatchlist,
    removeFromCustomWatchlist,
    requestAddToList,
    isModalOpen,
    closeModal,
    movieToAdd
  }), [
    watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, customWatchlists,
    createCustomWatchlist, deleteCustomWatchlist, addToCustomWatchlist, removeFromCustomWatchlist,
    requestAddToList, isModalOpen, closeModal, movieToAdd
  ]);

  return (
    <WatchlistContext.Provider value={value}>
      {children}
      <AddToListModal />
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
