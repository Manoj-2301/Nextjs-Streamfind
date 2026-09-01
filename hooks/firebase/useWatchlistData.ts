import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Movie } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { logUserActivity } from '@/lib/genreTracker';
import { notify as toast } from '@/lib/notify';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';
import {
  fetchWatchlist,
  fetchCustomWatchlists,
  mergeLocalWatchlistDB,
  isUserPremium,
  addToWatchlistDB,
  removeFromWatchlistDB,
  createCustomWatchlistDB,
  deleteCustomWatchlistDB,
  addToCustomWatchlistDB,
  removeFromCustomWatchlistDB,
  LocalWatchlistItem
} from '@/services/firebase/watchlistService';
import { CustomWatchlist } from '@/context/WatchlistContext'; // will need to export or move it. Wait, I will move it to types later.

const LOCAL_STORAGE_KEY = 'streamfind_anonymous_watchlist';
const EXPIRY_TIME_MS = 2 * 60 * 60 * 1000; // 2 hours

export function useWatchlistData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [customWatchlists, setCustomWatchlists] = useState<CustomWatchlist[]>([]);

  const { data: fetchedWatchlist = [] } = useQuery({
    queryKey: ['watchlist', user?.uid],
    queryFn: () => user ? fetchWatchlist(user.uid) : Promise.resolve([]),
    enabled: !!user,
  });

  const { data: fetchedCustomLists = [] } = useQuery({
    queryKey: ['customWatchlists', user?.uid],
    queryFn: () => user ? fetchCustomWatchlists(user.uid) : Promise.resolve([]),
    enabled: !!user,
  });

  // Sync state with fetched data
  useEffect(() => {
    if (user) {
      setWatchlist(fetchedWatchlist);
      setCustomWatchlists(fetchedCustomLists);
    }
  }, [fetchedWatchlist, fetchedCustomLists, user]);

  // Handle local storage logic and merging
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
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: LocalWatchlistItem[] = JSON.parse(stored);
        const now = Date.now();
        const validItems = parsed.filter(item => now - item.addedAt < EXPIRY_TIME_MS);
        
        if (validItems.length > 0) {
          mergeLocalWatchlistDB(user.uid, validItems)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['watchlist', user.uid] });
            })
            .catch(e => console.error("Error merging local watchlist to DB:", e));
        }
        
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {
        console.error("Error merging local watchlist:", e);
      }
    }
  }, [user, queryClient]);

  const isInWatchlist = useCallback((movieId: number) => {
    return watchlist.some(m => m.id === movieId);
  }, [watchlist]);

  const addToWatchlist = useCallback(async (movie: Movie) => {
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

    try {
      // Check limit for new additions
      if (!isInWatchlist(movie.id) && watchlist.length >= 15) {
        const isPremium = await isUserPremium(user.uid);
        if (!isPremium) {
          toast.error("Upgrade to Premium to add more than 15 movies to your Watchlist!");
          return;
        }
      }

      await addToWatchlistDB(user.uid, movie);
      queryClient.invalidateQueries({ queryKey: ['watchlist', user.uid] });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/watchlist/${movie.id}`);
    }
  }, [user, watchlist, isInWatchlist, queryClient]);

  const removeFromWatchlist = useCallback(async (movieId: number) => {
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

    try {
      await removeFromWatchlistDB(user.uid, movieId);
      queryClient.invalidateQueries({ queryKey: ['watchlist', user.uid] });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/watchlist/${movieId}`);
    }
  }, [user, watchlist, queryClient]);

  // Custom List Functions
  const createCustomWatchlist = useCallback(async (name: string) => {
    if (!user) return;
    try {
      await createCustomWatchlistDB(user.uid, name);
      queryClient.invalidateQueries({ queryKey: ['customWatchlists', user.uid] });
    } catch (error) {
      console.error("Failed to create custom watchlist", error);
      throw error;
    }
  }, [user, queryClient]);

  const deleteCustomWatchlist = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteCustomWatchlistDB(user.uid, id);
      queryClient.invalidateQueries({ queryKey: ['customWatchlists', user.uid] });
    } catch (error) {
      console.error("Failed to delete custom watchlist", error);
      throw error;
    }
  }, [user, queryClient]);

  const addToCustomWatchlist = useCallback(async (listId: string, movie: Movie) => {
    if (!user) return;
    try {
      await addToCustomWatchlistDB(user.uid, listId, movie);
    } catch (error) {
      console.error("Failed to add to custom watchlist", error);
      throw error;
    }
  }, [user]);

  const removeFromCustomWatchlist = useCallback(async (listId: string, movieId: number) => {
    if (!user) return;
    try {
      await removeFromCustomWatchlistDB(user.uid, listId, movieId);
    } catch (error) {
      console.error("Failed to remove from custom watchlist", error);
      throw error;
    }
  }, [user]);

  return {
    watchlist,
    customWatchlists,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    createCustomWatchlist,
    deleteCustomWatchlist,
    addToCustomWatchlist,
    removeFromCustomWatchlist
  };
}
