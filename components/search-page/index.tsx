/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import { motion } from 'motion/react';
import SearchBar from '@/components/ui/search-bar';
import MovieCard from '@/components/ui/movie-card';
import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Search as SearchIcon, RotateCcw } from 'lucide-react';
import { useSearchMovies, useSearchPeople } from '@/hooks/useTmdbQueries';
import { Movie, CastMember } from '@/types';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';

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
export default function SearchPage() {

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchType, setSearchType] = useState<'movies' | 'people'>('movies');


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
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    if (debouncedSearch && searchType === 'movies') {
      import('@/lib/genreTracker').then(({ trackGenreSearch, logUserActivity }) => {
        trackGenreSearch(debouncedSearch);
        logUserActivity("Search", `Searched for "${debouncedSearch}"`);
      });
    }
  }, [debouncedSearch, searchType]);


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const { data: movieResults = [], isFetching: isMovieLoading } = useSearchMovies(searchType === 'movies' ? debouncedSearch : "");

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const { data: peopleResults = [], isFetching: isPeopleLoading } = useSearchPeople(searchType === 'people' ? debouncedSearch : "");

  const results = searchType === 'movies' ? movieResults : peopleResults;
  const isLoading = searchType === 'movies' ? isMovieLoading : isPeopleLoading;


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    if (debouncedSearch && !isLoading && results.length === 0) {
      toast.error("No results found");
    }
  }, [results.length, isLoading, debouncedSearch]);


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
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
        <SearchBar value={search} onChange={setSearch} placeholder={searchType === 'movies' ? "Search movies, TV shows, anime..." : "Search actors, directors, crew..."} />
        
        <div className="flex justify-center mt-8 gap-4">
           <button 
             onClick={() => setSearchType('movies')}
             className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${searchType === 'movies' ? 'bg-brand text-black border-brand shadow-[0_0_20px_rgba(var(--brand-rgb),0.3)]' : 'bg-surface border-white/5 text-white/40 hover:border-white/20 hover:text-white'}`}
           >
             Movies & Shows
           </button>
           <button 
             onClick={() => setSearchType('people')}
             className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${searchType === 'people' ? 'bg-brand text-black border-brand shadow-[0_0_20px_rgba(var(--brand-rgb),0.3)]' : 'bg-surface border-white/5 text-white/40 hover:border-white/20 hover:text-white'}`}
           >
             People
           </button>
        </div>
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
             {results.map((item: any) => (
               searchType === 'movies' ? (
                 <MovieCard key={item.id} movie={item} />
               ) : (
                 <Link href={`/cast/${item.id}`} key={item.id} className="block group">
                    <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-4 bg-surface border border-white/5 shadow-xl shadow-black/50">
                      {item.imageUrl ? (
                        <Image 
                          src={item.imageUrl} 
                          alt={item.name} 
                          fill 
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                          unoptimized={true}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-brand/20 to-purple-900/20">
                          <span className="font-sans font-black text-white/20 text-6xl uppercase tracking-tighter shadow-sm">{getInitials(item.name)}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white font-bold text-lg mb-1">{item.name}</h3>
                        <p className="text-brand text-xs uppercase tracking-widest font-black">{item.role}</p>
                      </div>
                    </div>
                 </Link>
               )
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
