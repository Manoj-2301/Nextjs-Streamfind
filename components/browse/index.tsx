'use client';

import { motion, AnimatePresence } from 'motion/react';
import FilterBar from '@/components/ui/filter-bar';
import SearchBar from '@/components/ui/search-bar';
import MovieCard from '@/components/ui/movie-card';
import Pagination from '@/components/ui/pagination';
import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import ErrorMessage from '@/components/ui/error-message';
import MovieCardSkeleton from '@/components/ui/movie-card-skeleton';
import { Movie } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
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

  const { user } = useAuth();
  const [profile, setProfile] = useState<{ subscriptions: string[]; autoFilter: boolean } | null>(null);
  const [isDnaExpanded, setIsDnaExpanded] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let unsubscribe = () => {};

    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      const docRef = doc(db, `users/${user.uid}`);
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            subscriptions: data.subscriptions || [],
            autoFilter: data.autoFilter ?? false
          });
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  const matchPlatform = (userSub: string, moviePlatform: string) => {
    const norm = (s: string) => s.toLowerCase().replace(/amazon/g, '').replace(/video/g, '').replace(/prime/g, 'prime').trim();
    return norm(userSub) === norm(moviePlatform);
  };

  const activePlatforms = useMemo(() => {
    if (profile && profile.autoFilter && profile.subscriptions.length > 0) {
      return profile.subscriptions;
    }
    return platforms;
  }, [profile, platforms]);

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
          // Filter by active platforms
          if (activePlatforms.length > 0) {
            // Inline platforms filter disabled
          }
        }

        // Apply activePlatforms filter at the top level for both Search and Discover
        if (activePlatforms.length > 0) {
          results = results.filter(m => m.platforms?.some(p => activePlatforms.some(sub => matchPlatform(sub, p.name))));
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
  }, [search, genre, rating, yearRange, activePlatforms, sortBy, sortOrder, currentPage]);

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
    <div className="container mx-auto px-4 md:px-6 lg:px-12 max-w-7xl py-6 md:py-6 overflow-hidden">
      
      <div className="flex flex-col gap-6 md:gap-12 mb-8 md:mb-16">
        <div>
          <h1 className="text-4xl md:text-7xl font-black text-white mb-4 uppercase tracking-tighter">Browse Library</h1>
          <p className="text-white/40 max-w-xl text-base md:text-lg">Discover your next obsession. Filter through our curated collection of cinematic masterpieces.</p>
        </div>

        <div className="flex flex-col gap-4 md:gap-8 bg-surface/30 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-white/5 backdrop-blur-sm relative z-[60]">
          <SearchBar
            value={search}
            onChange={(val) => { 
              setSearch(val); 
              setCurrentPage(1); 
              if (val) {
                import('@/lib/genreTracker').then(({ trackGenreSearch, logUserActivity }) => {
                  trackGenreSearch(val);
                  logUserActivity("Search", `Searched for "${val}"`);
                });
              }
            }}
            placeholder="Filter by title or genre..."
            className="max-w-xl"
          />
          <FilterBar
            onGenreChange={(g) => { 
              setGenre(g); 
              setCurrentPage(1); 
              if (g !== "All") {
                import('@/lib/genreTracker').then(({ trackGenreSearch, logUserActivity }) => {
                  trackGenreSearch(g);
                  logUserActivity("Filter", `Filtered by Genre: ${g}`);
                });
              }
            }}
            onRatingChange={(r) => { 
              setRating(r); 
              setCurrentPage(1); 
              import('@/lib/genreTracker').then(({ logUserActivity }) => {
                logUserActivity("Filter", `Filtered by Rating: ${r}+ Stars`);
              });
            }}
            onYearChange={(y) => { 
              setYearRange(y); 
              setCurrentPage(1); 
              if (y) {
                import('@/lib/genreTracker').then(({ logUserActivity }) => {
                  logUserActivity("Filter", `Filtered by Year: ${y[0]}-${y[1]}`);
                });
              }
            }}
            onPlatformChange={(p) => { 
              setPlatforms(p); 
              setCurrentPage(1); 
              if (p.length > 0) {
                import('@/lib/genreTracker').then(({ logUserActivity }) => {
                  logUserActivity("Filter", `Filtered by Platforms: ${p.join(', ')}`);
                });
              }
            }}
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <MovieCardSkeleton key={idx} />
          ))}
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
      {/* Premium Floating Subscription DNA Pill */}
      <AnimatePresence>
        {profile && profile.subscriptions.length > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`fixed bottom-6 right-6 z-50 select-none ${
              profile.autoFilter
                ? `bg-black/90 border border-brand/30 shadow-[0_12px_40px_rgba(255,40,78,0.25)] backdrop-blur-md ${
                    isDnaExpanded
                      ? "rounded-3xl p-5 max-w-xs md:max-w-sm"
                      : "rounded-full p-2 md:p-2.5 md:px-5 md:py-3 cursor-pointer hover:border-brand"
                  }`
                : "max-w-xs md:max-w-sm"
            }`}
            onClick={
              profile.autoFilter && !isDnaExpanded 
                ? () => setIsDnaExpanded(true) 
                : undefined
            }
          >
            {profile.autoFilter ? (
              isDnaExpanded ? (
                <div className="flex gap-4">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDnaExpanded(false);
                    }}
                    className="w-9 h-9 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 animate-pulse text-lg cursor-pointer hover:bg-brand/20 transition-colors"
                    title="Click to collapse"
                  >
                    🍿
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDnaExpanded(false);
                        }}
                        className="text-[10px] font-black uppercase text-brand tracking-widest cursor-pointer hover:text-white transition-colors"
                      >
                        Subscription DNA Active
                      </p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDnaExpanded(false);
                        }}
                        className="text-white/40 hover:text-white text-[10px] font-bold transition-colors ml-2"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[10px] text-white/50 mt-1.5 leading-relaxed">
                      Filtering library to show only movies on your active subscriptions: <strong className="text-white font-bold">{profile.subscriptions.join(', ')}</strong>.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const { doc, updateDoc } = await import('firebase/firestore');
                            await updateDoc(doc(db, `users/${user!.uid}`), { autoFilter: false });
                            setIsDnaExpanded(false);
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="text-[9px] font-black uppercase tracking-wider bg-brand/10 hover:bg-brand/20 border border-brand/20 text-brand px-3 py-2 rounded-xl cursor-pointer transition-all duration-300 active:scale-95"
                      >
                        Disable Filter
                      </button>
                      <a 
                        href="/profile"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[9px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-3 py-2 rounded-xl cursor-pointer transition-all duration-300 text-center"
                      >
                        Customize DNA
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 text-base animate-pulse">
                    🍿
                  </div>
                  <span className="hidden md:inline text-[10px] font-black uppercase text-brand tracking-widest">
                    Subscription DNA Active
                  </span>
                </div>
              )
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const { doc, updateDoc } = await import('firebase/firestore');
                    await updateDoc(doc(db, `users/${user!.uid}`), { autoFilter: true });
                    setIsDnaExpanded(true);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="bg-black/95 hover:bg-black/100 border border-white/10 hover:border-brand/40 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-full px-5 py-3 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/80 hover:text-brand cursor-pointer transition-all duration-300 backdrop-blur-md animate-bounce-subtle"
              >
                <span>🍿</span>
                <span>Enable Subs DNA Filter</span>
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
