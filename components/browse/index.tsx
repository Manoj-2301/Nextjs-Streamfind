'use client';
import { getFirestore } from 'firebase/firestore';

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
import { app } from '@/lib/firebase';
import { searchMovies, getTrendingMovies, getMoviesByGenre, browseSearchMovies, browseDiscoverMovies, getWatchProviders, WatchProvider } from '@/services/tmdbService';
import { toast } from 'react-hot-toast';

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

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
  ta: "Tamil",
  ml: "Malayalam",
  kn: "Kannada",
  ko: "Korean",
  ja: "Japanese",
  es: "Spanish",
  fr: "French"
};

const matchGenre = (selectedGenre: string, movieGenres: string[]) => {
  if (selectedGenre === 'All') return true;
  if (!movieGenres || movieGenres.length === 0) return false;
  
  const normSelected = selectedGenre.toLowerCase().trim();
  
  return movieGenres.some(g => {
    const normG = g.toLowerCase().trim();
    if (normG === normSelected) return true;
    if (normSelected === 'sci-fi' && (normG.includes('science fiction') || normG.includes('sci-fi'))) {
      return true;
    }
    return normG.includes(normSelected);
  });
};

export default function Browse() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [genre, setGenre] = useState("All");
  const [rating, setRating] = useState<number | null>(null);
  const [yearRange, setYearRange] = useState<[number, number] | null>(null);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>("All");
  const [contentType, setContentType] = useState<'movies' | 'tv' | 'both'>("both");
  const [sortBy, setSortBy] = useState("popularity");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);

  const [apiTotalPages, setApiTotalPages] = useState(1);
  const [allAvailablePlatforms, setAllAvailablePlatforms] = useState<WatchProvider[]>([]);

  const { user } = useAuth();
  const [profile, setProfile] = useState<{
    subscriptions: string[];
    autoFilter: boolean;
    prefLanguage?: string;
    dnaMinRating?: number | null;
    prefContentType?: 'movies' | 'tv' | 'both';
  } | null>(null);
  const [isDnaExpanded, setIsDnaExpanded] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let unsubscribe = () => {};

    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      const docRef = doc(getFirestore(app), `users/${user.uid}`);
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            subscriptions: data.subscriptions || [],
            autoFilter: data.autoFilter ?? false,
            prefLanguage: data.prefLanguage || 'All',
            dnaMinRating: data.dnaMinRating || null,
            prefContentType: data.prefContentType || 'both'
          });
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  // Always sync Firestore preferences → local filter state whenever profile changes
  // This ensures navigating back from Profile Settings reflects latest preferences
  useEffect(() => {
    if (!profile) return;
    if (profile.prefLanguage && profile.prefLanguage !== 'All') {
      setLanguage(profile.prefLanguage);
    } else {
      setLanguage('All');
    }
    if (profile.dnaMinRating) {
      setRating(profile.dnaMinRating);
    } else {
      setRating(null);
    }
    if (profile.subscriptions && profile.subscriptions.length > 0) {
      setPlatforms(profile.subscriptions);
    } else {
      setPlatforms([]);
    }
    if (profile.prefContentType) {
      setContentType(profile.prefContentType);
    } else {
      setContentType('both');
    }
    setCurrentPage(1);
  }, [profile]);

  useEffect(() => {
    const loadPlatforms = async () => {
      try {
        let watchRegion = 'IN';
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (!tz.includes('India') && !tz.includes('Kolkata') && !tz.includes('Calcutta') && !tz.includes('Asia/Kolkata')) {
            watchRegion = 'US';
          }
        } catch (e) {}

        const list = await getWatchProviders(watchRegion);
        setAllAvailablePlatforms(list);
      } catch (err) {
        console.error('Failed to load platforms:', err);
      }
    };
    loadPlatforms();
  }, []);

  const matchPlatform = (userSub: string, moviePlatform: string) => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const u = norm(userSub);
    const m = norm(moviePlatform);
    return u.includes(m) || m.includes(u);
  };

  const activePlatforms = useMemo(() => {
    if (profile && profile.autoFilter && profile.subscriptions.length > 0) {
      return profile.subscriptions;
    }
    return platforms;
  }, [profile, platforms]);

  useEffect(() => {
    // If a year is at the end of the search, sync it to the year filter
    let extractedYear: number | undefined;
    if (search) {
      const match = search.match(/(.*)\s+(\d{4})$/);
      if (match) {
        extractedYear = parseInt(match[2]);
        // Update year range dynamically if it's not already set to this year
        if (!yearRange || yearRange[0] !== extractedYear || yearRange[1] !== extractedYear) {
           setYearRange([extractedYear, extractedYear]);
        }
      }
    }

    const loadMovies = async () => {
      setIsLoading(true);
      setError(false);
      try {
        let results: Movie[] = [];
        let pages = 1;

        let providerIds: number[] | undefined;
        let watchRegion: string | undefined;

        if (activePlatforms.length > 0 && allAvailablePlatforms.length > 0) {
          providerIds = activePlatforms
            .map(pName => {
              const found = allAvailablePlatforms.find(
                ap => ap.name.toLowerCase() === pName.toLowerCase() ||
                      ap.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(pName.toLowerCase().replace(/[^a-z0-9]/g, ''))
              );
              return found?.id;
            })
            .filter((id): id is number => id !== undefined);

          if (providerIds.length > 0) {
            try {
              const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
              if (tz.includes('India') || tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('Asia/Kolkata')) {
                watchRegion = 'IN';
              } else {
                watchRegion = 'US';
              }
            } catch (e) {
              watchRegion = 'IN';
            }
          }
        }

        if (search) {
          // TMDB search API doesn't support advanced filtering natively, but we now pass yearRange
          const data = await browseSearchMovies(search, currentPage, yearRange);
          results = data.movies;
          pages = data.totalPages;
          
          // Apply active genre filter locally to search results
          if (genre !== "All") {
            results = results.filter(m => matchGenre(genre, m.genre));
          }

          if (results.length === 0) {
            toast.error("search correct movie name or show");
          }
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
            sortBy,
            language,
            providerIds,
            watchRegion,
            contentType
          );

          results = data.movies;
          pages = data.totalPages;
        }

        // Apply activePlatforms filter locally for Search mode ONLY, or if server-side provider mapping failed
        // Only apply local filter if it would produce results (don't blank out due to missing watch provider data)
        if (activePlatforms.length > 0 && (search || !providerIds || providerIds.length === 0)) {
          const localFiltered = results.filter(m => m.platforms?.some(p => activePlatforms.some(sub => matchPlatform(sub, p.name))));
          // Only apply if we still have results; otherwise show unfiltered (API-side filter already applied)
          if (localFiltered.length > 0) {
            results = localFiltered;
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
  }, [search, genre, rating, yearRange, activePlatforms, sortBy, sortOrder, currentPage, language, contentType, allAvailablePlatforms]);

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
      
      <div className="flex flex-col gap-4 md:gap-6 mb-4 md:mb-6">
        <div>
          <h1 className="text-4xl md:text-7xl font-black text-white mb-2 uppercase tracking-tighter">Browse Library</h1>
          <p className="text-white/40 max-w-xl text-base md:text-lg">Discover your next obsession. Filter through our curated collection of cinematic masterpieces.</p>
        </div>

        <div className="flex flex-col gap-4 md:gap-8 bg-surface/30 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-brand/20 backdrop-blur-sm shadow-2xl shadow-brand/10 transition-all duration-300 hover:border-brand/40 hover:shadow-brand/20 relative z-40">
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
            onLanguageChange={(l) => {
              setLanguage(l);
              setCurrentPage(1);
            }}
            onContentTypeChange={(c) => {
              setContentType(c);
              setCurrentPage(1);
            }}
            onSortChange={(s, o) => { setSortBy(s); setSortOrder(o); setCurrentPage(1); }}
            activeGenre={genre}
            activeLanguage={language}
            activeContentType={contentType}
            activeRating={rating}
            activeYearRange={yearRange}
            selectedPlatforms={platforms}
            sortBy={sortBy}
            sortOrder={sortOrder}
            totalResults={movies.length}
            availablePlatforms={allAvailablePlatforms}
          />
        </div>
      </div>

      {/* Active Filters Pills */}
      {(genre !== "All" || language !== "All" || contentType !== "both" || rating !== null || yearRange !== null || platforms.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-6 items-center bg-white/[0.02] border border-white/5 p-3 rounded-xl backdrop-blur-sm z-30 relative">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mr-2">Active Filters:</span>
          
          {genre !== "All" && (
            <button
              onClick={() => { setGenre("All"); setCurrentPage(1); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0abfc]/5 border border-[#f0abfc]/40 text-xs text-[#f0abfc] hover:bg-[#f0abfc]/15 hover:border-[#f0abfc]/80 hover:shadow-[0_0_12px_rgba(240,171,252,0.4)] transition-all duration-300 font-medium backdrop-blur-md cursor-pointer"
            >
              Genre: {genre}
              <span className="text-[10px] opacity-60">×</span>
            </button>
          )}

          {contentType !== "both" && (
            <button
              onClick={() => { setContentType("both"); setCurrentPage(1); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0abfc]/5 border border-[#f0abfc]/40 text-xs text-[#f0abfc] hover:bg-[#f0abfc]/15 hover:border-[#f0abfc]/80 hover:shadow-[0_0_12px_rgba(240,171,252,0.4)] transition-all duration-300 font-medium backdrop-blur-md cursor-pointer"
            >
              Format: {contentType === 'movies' ? 'Movies Only' : 'TV Shows Only'}
              <span className="text-[10px] opacity-60">×</span>
            </button>
          )}

          {language !== "All" && (
            <button
              onClick={() => { setLanguage("All"); setCurrentPage(1); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0abfc]/5 border border-[#f0abfc]/40 text-xs text-[#f0abfc] hover:bg-[#f0abfc]/15 hover:border-[#f0abfc]/80 hover:shadow-[0_0_12px_rgba(240,171,252,0.4)] transition-all duration-300 font-medium backdrop-blur-md cursor-pointer"
            >
              Language: {LANGUAGE_LABELS[language] || language}
              <span className="text-[10px] opacity-60">×</span>
            </button>
          )}

          {rating !== null && (
            <button
              onClick={() => { setRating(null); setCurrentPage(1); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0abfc]/5 border border-[#f0abfc]/40 text-xs text-[#f0abfc] hover:bg-[#f0abfc]/15 hover:border-[#f0abfc]/80 hover:shadow-[0_0_12px_rgba(240,171,252,0.4)] transition-all duration-300 font-medium backdrop-blur-md cursor-pointer"
            >
              Rating: {rating}+ Stars
              <span className="text-[10px] opacity-60">×</span>
            </button>
          )}

          {yearRange !== null && (
            <button
              onClick={() => { setYearRange(null); setCurrentPage(1); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0abfc]/5 border border-[#f0abfc]/40 text-xs text-[#f0abfc] hover:bg-[#f0abfc]/15 hover:border-[#f0abfc]/80 hover:shadow-[0_0_12px_rgba(240,171,252,0.4)] transition-all duration-300 font-medium backdrop-blur-md cursor-pointer"
            >
              Year: {yearRange[0] === yearRange[1] ? yearRange[0] : `${yearRange[0]}-${yearRange[1]}`}
              <span className="text-[10px] opacity-60">×</span>
            </button>
          )}

          {platforms.map(p => (
            <button
              key={p}
              onClick={() => {
                setPlatforms(prev => prev.filter(x => x !== p));
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0abfc]/5 border border-[#f0abfc]/40 text-xs text-[#f0abfc] hover:bg-[#f0abfc]/15 hover:border-[#f0abfc]/80 hover:shadow-[0_0_12px_rgba(240,171,252,0.4)] transition-all duration-300 font-medium backdrop-blur-md cursor-pointer"
            >
              {p}
              <span className="text-[10px] opacity-60">×</span>
            </button>
          ))}

          <button
            onClick={() => {
              setGenre("All");
              setLanguage("All");
              setContentType("both");
              setRating(null);
              setYearRange(null);
              setPlatforms([]);
              setCurrentPage(1);
            }}
            className="text-[10px] font-black text-white/40 hover:text-brand uppercase tracking-widest ml-auto transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

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
              <MovieCard key={movie.id} movie={movie} activeGenre={genre} />
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
                            await updateDoc(doc(getFirestore(app), `users/${user!.uid}`), { autoFilter: false });
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
                    await updateDoc(doc(getFirestore(app), `users/${user!.uid}`), { autoFilter: true });
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
