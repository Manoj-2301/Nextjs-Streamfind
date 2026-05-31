'use client';

import { motion } from 'motion/react';
import SearchBar from '@/components/ui/search-bar';
import MovieCard from '@/components/ui/movie-card';
import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Search as SearchIcon, RotateCcw } from 'lucide-react';
import { searchMovies } from '@/services/tmdbService';
import { Movie } from '@/types';
import { toast } from 'react-hot-toast';

export default function SearchPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!search) {
      setResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchMovies(search);
        setResults(data);
        if (data.length === 0) {
          toast.error("search correct movie name or show");
        }
        import('@/lib/genreTracker').then(({ trackGenreSearch, logUserActivity }) => {
          trackGenreSearch(search);
          logUserActivity("Search", `Searched for "${search}"`);
        });
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-6 lg:px-12 max-w-7xl py-20"
    >
      
      <div className="max-w-3xl mx-auto text-center mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-brand/10 border border-brand/20 text-brand text-[10px] font-black tracking-widest uppercase mb-6">
          <Sparkles className="w-3 h-3" /> Search Intelligence
        </div>
        <h1 className="text-4xl md:text-7xl font-black text-white mb-8 uppercase tracking-tighter leading-tight">What are we watching?</h1>
        <SearchBar value={search} onChange={setSearch} placeholder="Search movies, actors, or keywords..." />
      </div>

      {search ? (
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Search Results <span className="text-white/20">({results.length})</span>
            </h2>
            {isLoading && <p className="text-brand text-xs font-black animate-pulse">SEARCHING...</p>}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
             {results.map(movie => (
               <MovieCard key={movie.id} movie={movie} />
             ))}
          </div>

          {!isLoading && results.length === 0 && (
             <div className="text-center py-20 bg-surface/20 rounded-3xl border border-white/5">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                  <SearchIcon className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase">No results found</h3>
                <p className="text-white/40 max-w-sm mx-auto mb-8">We couldn't find any movies matching "<span className="text-white font-bold">{search}</span>". Try different keywords or browse our collection.</p>
                <button 
                  onClick={() => setSearch("")}
                  className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand hover:text-white transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> Reset Search
                </button>
             </div>
          )}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <h3 className="text-white/40 font-bold uppercase tracking-[0.2em] text-xs mb-8 flex items-center gap-3">
             <TrendingUp className="w-4 h-4 text-brand" /> Popular Searches
          </h3>
          <div className="flex flex-wrap gap-4">
            {["Science Fiction", "Inception", "Avengers", "The Matrix", "Christopher Nolan", "IMDb 8.5+", "Action Thrillers"].map(tag => (
              <button 
                key={tag}
                onClick={() => setSearch(tag)}
                className="px-5 py-2.5 rounded-2xl glass border-white/5 hover:border-brand/40 hover:text-brand transition-all text-xs font-medium"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="mt-20 bg-surface/30 rounded-3xl p-12 border border-white/5 text-center">
             <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                <SearchIcon className="text-white/20" />
             </div>
             <h4 className="text-white font-bold text-xl mb-3">Discover something new</h4>
             <p className="text-white/40 max-w-sm mx-auto">Use the search bar above to look through our catalog of movies and find where to stream them instantly.</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
