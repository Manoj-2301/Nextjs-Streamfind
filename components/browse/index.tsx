'use client';

import { motion, AnimatePresence } from 'motion/react';
import FilterBar from '@/components/ui/filter-bar';
import SearchBar from '@/components/ui/search-bar';
import MovieCard from '@/components/ui/movie-card';
import Pagination from '@/components/ui/pagination';
import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import ErrorMessage from '@/components/ui/error-message';
import { Movie } from '@/types';
import { searchMovies, getTrendingMovies, getMoviesByGenre, browseSearchMovies, browseDiscoverMovies } from '@/services/tmdbService';

const ITEMS_PER_PAGE = 20;

const GENRE_MAP: Record<string, number> = {
  "Action": 28,
  "Adventure": 12,
  "Animation": 16,
  "Comedy": 35,
  "Crime": 80,
  "Documentary": 99,
  "Drama": 18,
  "Family": 10751,
  "Fantasy": 14,
  "History": 36,
  "Horror": 27,
  "Music": 10402,
  "Mystery": 9648,
  "Romance": 10749,
  "Sci-Fi": 878,
  "TV Movie": 10770,
  "Thriller": 53,
  "War": 10752,
  "Western": 37
};

export default function Browse() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [genre, setGenre] = useState("All");
  const [rating, setRating] = useState<number | null>(null);
  const [yearRange, setYearRange] = useState<[number, number] | null>(null);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("popularity");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);

  const [apiTotalPages, setApiTotalPages] = useState(1);

  useEffect(() => {
    const loadMovies = async () => {
      setIsLoading(true);
      setError(false);
      try {
        let results: Movie[] = [];
        let pages = 1;

        if (search) {
          // TMDB search API doesn't support advanced filtering, so we only use the query and page
          const data = await browseSearchMovies(search, currentPage);
          results = data.movies;
          pages = data.totalPages;
        } else {
          // Use discover API for advanced filtering
          const genreId = genre !== "All" ? GENRE_MAP[genre] : undefined;
          const minRating = rating || undefined;
          const minYear = yearRange ? yearRange[0] : undefined;
          const maxYear = yearRange ? yearRange[1] : undefined;

          const data = await browseDiscoverMovies(
            currentPage,
            genreId,
            minRating,
            minYear,
            maxYear,
            sortBy
          );

          results = data.movies;
          pages = data.totalPages;

          // Note: Platforms filter is still client-side because TMDB requires Watch Providers API
          // which requires a region parameter. To keep it simple, we filter the returned page if needed.
          if (platforms.length > 0) {
            results = results.filter(m => m.platforms?.some(p => platforms.includes(p.name)));
          }
        }

        setMovies(results);
        setApiTotalPages(pages);
      } catch (err) {
        console.error('Error loading browse movies:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(loadMovies, 500);
    return () => clearTimeout(timer);
  }, [search, genre, rating, yearRange, platforms, sortBy, sortOrder, currentPage]);

  const totalPages = apiTotalPages;
  const currentMovies = movies;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const retry = () => {
    setError(false);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  if (error) return <div className="pt-20"><ErrorMessage onRetry={retry} /></div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 md:px-6 lg:px-12 max-w-7xl py-6 md:py-6 overflow-hidden"
    >
      
      <div className="flex flex-col gap-6 md:gap-12 mb-8 md:mb-16">
        <div>
          <h1 className="text-4xl md:text-7xl font-black text-white mb-4 uppercase tracking-tighter">Browse Library</h1>
          <p className="text-white/40 max-w-xl text-base md:text-lg">Discover your next obsession. Filter through our curated collection of cinematic masterpieces.</p>
        </div>

        <div className="flex flex-col gap-4 md:gap-8 bg-surface/30 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-white/5 backdrop-blur-sm">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setCurrentPage(1); }}
            placeholder="Filter by title or genre..."
            className="max-w-xl"
          />
          <FilterBar
            onGenreChange={(g) => { setGenre(g); setCurrentPage(1); }}
            onRatingChange={(r) => { setRating(r); setCurrentPage(1); }}
            onYearChange={(y) => { setYearRange(y); setCurrentPage(1); }}
            onPlatformChange={(p) => { setPlatforms(p); setCurrentPage(1); }}
            onSortChange={(s, o) => { setSortBy(s); setSortOrder(o); setCurrentPage(1); }}
            activeGenre={genre}
            activeRating={rating}
            activeYearRange={yearRange}
            selectedPlatforms={platforms}
            sortBy={sortBy}
            sortOrder={sortOrder}
            totalResults={movies.length}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="w-12 h-12 text-brand animate-spin" />
          <p className="text-white/40 font-black uppercase tracking-widest text-xs">Curating Library...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          <AnimatePresence>
            {currentMovies.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </AnimatePresence>

          {movies.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="text-brand text-6xl mb-6 font-display font-black">404</div>
              <h3 className="text-2xl font-bold text-white mb-2 uppercase">No Movies Found</h3>
              <p className="text-white/40 max-w-sm mx-auto">Try adjusting your search or filters. We couldn't find any matches for your current selection.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setGenre("All");
                  setRating(null);
                  setYearRange(null);
                  setPlatforms([]);
                }}
                className="mt-8 text-brand font-black text-xs uppercase tracking-widest hover:underline"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {!isLoading && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </motion.div>
  );
}
