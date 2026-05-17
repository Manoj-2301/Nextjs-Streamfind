'use client';

import { motion } from 'motion/react';
import MovieCard from '@/components/ui/movie-card';
import { useWatchlist } from '@/context/WatchlistContext';
import { Bookmark, Rocket } from 'lucide-react';
import Link from 'next/link';

export default function WatchlistPage() {
  const { watchlist } = useWatchlist();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-6 lg:px-12 max-w-7xl py-12 min-h-[70vh]"
    >
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-7xl font-black text-white mb-4 uppercase tracking-tighter">My Watchlist</h1>
          <p className="text-white/40 max-w-xl text-base md:text-lg">Your curated collection of movies to experience later. Save now, stream whenever.</p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-brand/10 border border-brand/20 text-brand">
           <Bookmark className="w-5 h-5 fill-current" />
           <span className="font-bold uppercase tracking-widest text-xs">{watchlist.length} MOVIES SAVED</span>
        </div>
      </div>

      {watchlist.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
           {watchlist.map(movie => (
             <MovieCard key={movie.id} movie={movie} />
           ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center text-white/10 mb-8">
            <Bookmark className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Your watchlist is empty</h3>
          <p className="text-white/40 max-w-sm mb-10 leading-relaxed font-light">
            You haven't saved any movies yet. Explore our library and add some to your list!
          </p>
          <Link href="/browse">
            <button className="px-8 py-3 bg-brand text-white font-black rounded-lg hover:bg-red-700 transition-all glow-hover flex items-center gap-3 uppercase tracking-widest text-xs">
               <Rocket className="w-5 h-5" /> START EXPLORING
            </button>
          </Link>
        </div>
      )}
    </motion.div>
  );
}
