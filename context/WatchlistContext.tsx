'use client';
import { getFirestore } from 'firebase/firestore';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Movie } from '@/types';
import { useAuth } from './AuthContext';
import { app } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';
import { logUserActivity } from '@/lib/genreTracker';
import { notify as toast } from '../lib/notify';
import AddToListModal from '@/components/ui/AddToListModal';

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

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [customWatchlists, setCustomWatchlists] = useState<CustomWatchlist[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movieToAdd, setMovieToAdd] = useState<Movie | null>(null);

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
      setCustomWatchlists([]);
      return;
    }

    // User is logged in: Merge local items to Firebase
    let isMounted = true;
    let unsubscribeWatchlist = () => {};
    let unsubscribeCustomLists = () => {};

    import('firebase/firestore').then(({ collection, doc, setDoc, onSnapshot, query, serverTimestamp }) => {
      if (!isMounted) return;
      
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          const parsed: LocalWatchlistItem[] = JSON.parse(stored);
          const now = Date.now();
          const validItems = parsed.filter(item => now - item.addedAt < EXPIRY_TIME_MS);
          
          validItems.forEach(async (item) => {
            const path = `users/${user.uid}/watchlist/${item.movie.id}`;
            await setDoc(doc(getFirestore(app), path), {
              ...item.movie,
              addedAt: serverTimestamp()
            }, { merge: true });
          });
          
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch (e) {
          console.error("Error merging local watchlist:", e);
        }
      }

      // Default Watchlist listener
      const pathWatchlist = `users/${user.uid}/watchlist`;
      const qWatchlist = query(collection(getFirestore(app), pathWatchlist));
      
      unsubscribeWatchlist = onSnapshot(qWatchlist, (snapshot) => {
        const items: Movie[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as Movie);
        });
        setWatchlist(items);
      }, (error: any) => {
        handleFirestoreError(error, OperationType.LIST, pathWatchlist);
      });

      // Custom Watchlists listener
      const pathCustom = `users/${user.uid}/customWatchlists`;
      const qCustom = query(collection(getFirestore(app), pathCustom));
      
      unsubscribeCustomLists = onSnapshot(qCustom, (snapshot) => {
        const lists: CustomWatchlist[] = [];
        snapshot.forEach((docSnap) => {
          lists.push({ id: docSnap.id, ...docSnap.data() } as CustomWatchlist);
        });
        setCustomWatchlists(lists);
      }, (error: any) => {
        console.error("Error fetching custom lists:", error);
      });
    });

    return () => {
      isMounted = false;
      unsubscribeWatchlist();
      unsubscribeCustomLists();
    };
  }, [user]);

  const requestAddToList = (movie: Movie) => {
    if (!user || customWatchlists.length === 0) {
      // Direct add
      addToWatchlist(movie);
      toast.success(`Added to Watchlist`);
    } else {
      // Open modal
      setMovieToAdd(movie);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setMovieToAdd(null), 200);
  };

  const addToWatchlist = async (movie: Movie) => {
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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const removeFromWatchlist = async (movieId: number) => {
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
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const isInWatchlist = (movieId: number) => {
    return watchlist.some(m => m.id === movieId);
  };

  // Custom List Functions
  const createCustomWatchlist = async (name: string) => {
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
  };

  const deleteCustomWatchlist = async (id: string) => {
    if (!user) return;
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(getFirestore(app), `users/${user.uid}/customWatchlists/${id}`));
    } catch (error) {
      console.error("Failed to delete custom watchlist", error);
      throw error;
    }
  };

  const addToCustomWatchlist = async (listId: string, movie: Movie) => {
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
  };

  const removeFromCustomWatchlist = async (listId: string, movieId: number) => {
    if (!user) return;
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const path = `users/${user.uid}/customWatchlists/${listId}/movies/${movieId}`;
      await deleteDoc(doc(getFirestore(app), path));
    } catch (error) {
      console.error("Failed to remove from custom watchlist", error);
      throw error;
    }
  };

  return (
    <WatchlistContext.Provider value={{ 
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
    }}>
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
