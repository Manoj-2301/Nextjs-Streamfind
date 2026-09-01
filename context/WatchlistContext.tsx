/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';
import React, { createContext, useContext, useState } from 'react';
import { Movie } from '@/types';
import dynamic from 'next/dynamic';
import { useWatchlistData } from '@/hooks/firebase/useWatchlistData';
import { notify as toast } from '@/lib/notify';

/*
 * ============================================================
 * LAZY IMPORTS
 * ============================================================
 */
const AddToListModal = dynamic(() => import('@/components/ui/AddToListModal'), {
  ssr: false
});

/*
 * ============================================================
 * TYPES
 * ============================================================
 */
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

/*
 * ============================================================
 * CONTEXT
 * ============================================================
 */
const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

/*
 * ============================================================
 * PROVIDER COMPONENT
 * ============================================================
 */
export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const watchlistData = useWatchlistData();
  
  /*
   * ============================================================
   * STATE & HELPERS
   * ============================================================
   */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movieToAdd, setMovieToAdd] = useState<Movie | null>(null);

  /*
   * ============================================================
   * EVENT HANDLERS
   * ============================================================
   */
  const requestAddToList = React.useCallback((movie: Movie) => {
    // If no custom watchlists exist, just add it directly to the main watchlist
    if (watchlistData.customWatchlists.length === 0) {
      watchlistData.addToWatchlist(movie);
      toast.success(`Added to Watchlist`);
    } else {
      // Open modal
      setMovieToAdd(movie);
      setIsModalOpen(true);
    }
  }, [watchlistData]);

  const closeModal = React.useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setMovieToAdd(null), 200);
  }, []);

  /*
   * ============================================================
   * RENDER / DERIVED VALUE
   * ============================================================
   */
  const value = React.useMemo(() => ({
    ...watchlistData,
    requestAddToList,
    isModalOpen,
    closeModal,
    movieToAdd
  }), [watchlistData, requestAddToList, isModalOpen, closeModal, movieToAdd]);

  return (
    <WatchlistContext.Provider value={value}>
      {children}
      <AddToListModal />
    </WatchlistContext.Provider>
  );
}

/*
 * ============================================================
 * HOOK
 * ============================================================
 */
export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
}

