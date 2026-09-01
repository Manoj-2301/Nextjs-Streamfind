/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Movie, CastMember } from '@/types';
import { searchMovies, searchPeople } from '@/services/tmdbService';
import Image from 'next/image';

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function GlobalSearch() {

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'movies' | 'people'>('movies');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {

  /*
   * ============================================================
   * EVENT HANDLERS
   * ============================================================
   */
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Clear results and show loader immediately on type or query change
    setResults([]);
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = searchType === 'movies' ? await searchMovies(query) : await searchPeople(query);
        setResults(results.slice(0, 5));
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, searchType]);

  const handleSelect = (item: any) => {
    setIsOpen(false);
    setQuery('');
    if (searchType === 'people') {
      router.push(`/cast/${item.id}`);
    } else {
      const typeParam = item.type ? `?type=${item.type}` : '';
      router.push(`/movie/${item.id}${typeParam}`);
    }
  };


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(true)}
        aria-label="Toggle Search"
        aria-expanded={isOpen}
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
                placeholder={searchType === 'movies' ? "Search movies, TV shows, anime..." : "Search actors, directors, crew..."}
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

            <div className="flex border-b border-white/5">
              <button 
                onClick={() => setSearchType('movies')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${searchType === 'movies' ? 'text-brand border-b-2 border-brand bg-brand/5' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
              >
                Movies & Shows
              </button>
              <button 
                onClick={() => setSearchType('people')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${searchType === 'people' ? 'text-brand border-b-2 border-brand bg-brand/5' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
              >
                People
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2" data-lenis-prevent>
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="w-6 h-6 text-brand animate-spin" />
                  <p className="text-xs text-white/40">Searching library...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {results.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="flex items-center gap-4 p-2 rounded-lg hover:bg-white/5 transition-all text-left group"
                    >
                      <div className={`w-12 h-16 rounded overflow-hidden flex-shrink-0 relative ${searchType === 'people' ? 'rounded-full w-14 h-14' : ''}`}>
                        {(searchType === 'people' ? item.imageUrl : item.posterUrl) ? (
                          <Image 
                            src={searchType === 'people' ? item.imageUrl : item.posterUrl} 
                            alt={searchType === 'people' ? item.name : item.title} 
                            fill
                            sizes="56px"
                            className="object-cover group-hover:scale-110 transition-transform"
                            referrerPolicy="no-referrer"
                            unoptimized={true}
                          />
                        ) : (
                          <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand/20 to-purple-900/20 border border-white/5 ${searchType === 'people' ? 'rounded-full' : ''}`}>
                            <span className="font-sans font-black text-white/40 text-xl tracking-tighter uppercase">{getInitials(searchType === 'people' ? item.name : item.title)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{searchType === 'people' ? item.name : item.title}</h4>
                        {searchType === 'people' ? (
                          <p className="text-[10px] text-white/40 flex items-center gap-2">
                            <span className="text-brand">{item.role}</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-white/40 flex items-center gap-2">
                            <span>{item.year}</span>
                            <span>•</span>
                            <span className="text-brand">{item.genre && item.genre[0]}</span>
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                  {searchType === 'movies' && (
                    <Link 
                      href={`/browse?q=${query}`} 
                      onClick={() => setIsOpen(false)}
                      className="mt-2 text-center py-3 text-xs font-bold text-brand hover:bg-brand/10 transition-colors rounded-lg border border-brand/20 mx-2 mb-2"
                    >
                      VIEW ALL RESULTS
                    </Link>
                  )}
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
