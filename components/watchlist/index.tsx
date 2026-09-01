/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import MovieCard from '@/components/ui/movie-card';
import Button from '@/components/ui/button';
import { useWatchlist } from '@/context/WatchlistContext';
import { Bookmark, Rocket, Trash2, Loader2, List as ListIcon } from 'lucide-react';
import Link from 'next/link';
import { notify as toast } from '@/lib/notify';
import { useAuth } from '@/context/AuthContext';
import { app } from '@/lib/firebase';
import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore';
import { Movie } from '@/types';


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function WatchlistPage() {

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const { watchlist, customWatchlists, removeFromWatchlist, removeFromCustomWatchlist } = useWatchlist();

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const { user } = useAuth();
  
  const [selectedListId, setSelectedListId] = useState<string>('default');
  const [customListMovies, setCustomListMovies] = useState<Movie[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    if (selectedListId === 'default' || !user) {
      setCustomListMovies([]);
      return;
    }

    setIsLoadingCustom(true);
    const path = `users/${user.uid}/customWatchlists/${selectedListId}/movies`;
    const q = query(collection(getFirestore(app), path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Movie[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Movie);
      });
      setCustomListMovies(items);
      setIsLoadingCustom(false);
    }, (error) => {
      console.error("Error fetching custom list movies:", error);
      toast.error("Failed to load list");
      setIsLoadingCustom(false);
    });

    return () => unsubscribe();
  }, [selectedListId, user]);


  /*
   * ============================================================
   * EVENT HANDLERS
   * ============================================================
   */
  const handleRemove = async (movieId: number) => {
    try {
      if (selectedListId === 'default') {
        await removeFromWatchlist(movieId);
        toast.success("Removed from watchlist");
      } else {
        await removeFromCustomWatchlist(selectedListId, movieId);
        toast.success("Removed from list");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove movie");
    }
  };

  const currentMovies = selectedListId === 'default' ? watchlist : customListMovies;
  const currentListName = selectedListId === 'default' 
    ? 'My Watchlist' 
    : customWatchlists.find(l => l.id === selectedListId)?.name || 'Custom List';


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-6 lg:px-12 max-w-7xl py-12 min-h-[70vh]"
    >
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex-1">
          <h1 className="text-4xl md:text-7xl font-black text-white mb-4 uppercase tracking-tighter">{currentListName}</h1>
          <p className="text-white/40 max-w-xl text-base md:text-lg">Your curated collection of movies to experience later. Save now, stream whenever.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
          <select 
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold uppercase tracking-widest outline-none focus:border-brand appearance-none pr-10 relative cursor-pointer hover:bg-white/10 transition-colors"
            style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          >
            <option value="default" className="bg-[#111]">Default Watchlist</option>
            {customWatchlists.map(list => (
              <option key={list.id} value={list.id} className="bg-[#111]">{list.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-brand/10 border border-brand/20 text-brand">
             <Bookmark className="w-5 h-5 fill-current" />
             <span className="font-bold uppercase tracking-widest text-xs">{currentMovies.length} MOVIES SAVED</span>
          </div>
        </div>
      </div>

      {isLoadingCustom ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      ) : currentMovies.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
           {currentMovies.map(movie => (
             <div key={movie.id} className="relative group">
               <MovieCard movie={movie} />
               <button 
                 onClick={() => handleRemove(movie.id)}
                 className="absolute top-2 right-2 z-20 p-2 bg-black/60 hover:bg-red-600 backdrop-blur-sm border border-white/10 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all shadow-xl"
                 title="Remove from list"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
             </div>
           ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center text-white/10 mb-8">
            {selectedListId === 'default' ? <Bookmark className="w-12 h-12" /> : <ListIcon className="w-12 h-12" />}
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">This list is empty</h3>
          <p className="text-white/40 max-w-sm mb-10 leading-relaxed font-light">
            You haven't saved any movies here yet. Explore our library and add some!
          </p>
          <Link href="/browse">
            <Button className="font-black uppercase tracking-widest text-xs gap-3">
               <Rocket className="w-5 h-5" /> START EXPLORING
            </Button>
          </Link>
        </div>
      )}
    </motion.div>
  );
}
