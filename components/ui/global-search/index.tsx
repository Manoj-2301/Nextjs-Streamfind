'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Movie } from '@/types';
import { searchMovies } from '@/services/tmdbService';

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchMovies(query);
        setResults(results.slice(0, 5));
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (movie: Movie) => {
    setIsOpen(false);
    setQuery('');
    const typeParam = movie.type ? `?type=${movie.type}` : '';
    router.push(`/movie/${movie.id}${typeParam}`);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-white/70 hover:text-brand transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-[300px] md:w-[400px] glass-dark border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[60]"
          >
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <Search className="w-4 h-4 text-white/40" />
              <input
                autoFocus
                type="text"
                placeholder="Search movies, TV shows, anime..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-white text-sm w-full"
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X className="w-4 h-4 text-white/40 hover:text-white" />
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2" data-lenis-prevent>
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="w-6 h-6 text-brand animate-spin" />
                  <p className="text-xs text-white/40">Searching library...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {results.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => handleSelect(movie)}
                      className="flex items-center gap-4 p-2 rounded-lg hover:bg-white/5 transition-all text-left group"
                    >
                      <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0">
                        <img 
                          src={movie.posterUrl} 
                          alt={movie.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{movie.title}</h4>
                        <p className="text-[10px] text-white/40 flex items-center gap-2">
                          <span>{movie.year}</span>
                          <span>•</span>
                          <span className="text-brand">{movie.genre[0]}</span>
                        </p>
                      </div>
                    </button>
                  ))}
                  <Link 
                    href={`/browse?q=${query}`} 
                    onClick={() => setIsOpen(false)}
                    className="mt-2 text-center py-3 text-xs font-bold text-brand hover:bg-brand/10 transition-colors rounded-lg border border-brand/20 mx-2 mb-2"
                  >
                    VIEW ALL RESULTS
                  </Link>
                </div>
              ) : query ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-white/40">No movies found for "{query}"</p>
                </div>
              ) : (
                <div className="py-8 text-center text-white/20 select-none">
                  <Search className="w-10 h-10 mx-auto mb-2 opacity-10" />
                  <p className="text-xs uppercase tracking-widest font-black">Find your favorite</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
