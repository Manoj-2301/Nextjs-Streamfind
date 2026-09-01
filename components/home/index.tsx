'use client';
import { getFirestore } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import HeroSection from '@/components/ui/hero-section';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState, useMemo } from 'react';
import { getTrendingMovies, getMoviesByGenre, getRecommendations, getPopularMovies, getUpcomingMovies } from '@/services/tmdbService';
import { Movie } from '@/types';
import { Loader2, Sparkles } from 'lucide-react';
import { useWatchlist } from '@/context/WatchlistContext';
import { useAuth } from '@/context/AuthContext';
import { app } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { getNowPlayingMovies } from '@/services/tmdbService';

const ScrollableRow = dynamic(() => import('@/components/ui/scrollable-row'), {
  ssr: true,
  loading: () => <div className="h-64 w-full animate-pulse bg-white/5 rounded-xl my-4" />
});
const SponsorBanner = dynamic(() => import('@/components/ui/sponsor-banner'), { ssr: true });

interface HomeProps {
  initialTrending?: Movie[];
  initialUpcoming?: Movie[];
  initialSciFi?: Movie[];
  initialPopular?: Movie[];
  initialNowPlaying?: Movie[];
}

export default function Home({
  initialTrending = [],
  initialUpcoming = [],
  initialSciFi = [],
  initialPopular = [],
  initialNowPlaying = []
}: HomeProps) {
  const router = useRouter();
  const [trending, setTrending] = useState<Movie[]>(initialTrending);
  const [upcoming, setUpcoming] = useState<Movie[]>(initialUpcoming);
  const [sciFi, setSciFi] = useState<Movie[]>(initialSciFi);
  const [recommendations, setRecommendations] = useState<Movie[]>(initialPopular);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>(initialNowPlaying);
  const [recSource, setRecSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(initialTrending.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { watchlist } = useWatchlist();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [isDnaExpanded, setIsDnaExpanded] = useState(false);
  const [heroFallback, setHeroFallback] = useState<Movie[]>(initialTrending);
  const [featuredPartner, setFeaturedPartner] = useState<{
    movieName: string;
    providerName: string;
    offerText?: string;
    affiliateUrl: string;
  } | null>(null);
  const [affiliateLinks, setAffiliateLinks] = useState<any>({});
  // Track whether the profile has been fetched at least once to avoid flicker
  const [profileReady, setProfileReady] = useState(!user); // true immediately if no user

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileReady(true);
      return;
    }
    setProfileReady(false);
    let unsubscribe = () => { };

    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      const docRef = doc(getFirestore(app), `users/${user.uid}`);
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            subscriptions: data.subscriptions || [],
            autoFilter: data.autoFilter ?? false,
            prefLanguage: data.prefLanguage || 'en',
            watchRegion: data.watchRegion || 'IN',
            dnaMoods: data.dnaMoods || [],
            dnaRuntime: data.dnaRuntime,

            prefContentType: data.prefContentType || 'both'
          });
        }
        // Mark profile as ready after first snapshot (even if doc doesn't exist)
        setProfileReady(true);
      });
    });

    return () => unsubscribe();
  }, [user]);

  const filterKey = useMemo(() => JSON.stringify({
    autoFilter: profile?.autoFilter,
    dnaMoods: profile?.dnaMoods,
    subscriptions: profile?.subscriptions,
    prefLanguage: profile?.prefLanguage,
    watchRegion: profile?.watchRegion,
    dnaRuntime: profile?.dnaRuntime,

    prefContentType: profile?.prefContentType,
  }), [profile]);

  useEffect(() => {
    // Wait until the authenticated user's profile has been fetched from Firestore
    if (!profileReady) return;

    const abortController = new AbortController();
    const signal = abortController.signal;

    const loadData = async () => {
      // First load with no data: show full spinner. Re-fetches: show subtle refreshing bar.
      const hasData = trending.length > 0 || heroFallback.length > 0;
      if (!hasData) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      try {
        // Always fetch fresh data when profile preferences change
        const [trendingData, upcomingData, sciFiData, nowPlayingData] = await Promise.all([
          getTrendingMovies(profile || undefined, { signal }),
          getUpcomingMovies(profile || undefined, { signal }),
          getMoviesByGenre(878, profile || undefined, { signal }), // 878 is Sci-Fi genre ID in TMDB
          getNowPlayingMovies(profile || undefined, { signal })
        ]);

        setTrending(trendingData);
        setUpcoming(upcomingData);
        setSciFi(sciFiData);
        setNowPlaying(nowPlayingData);

        console.log("CLIENT FETCH RESULTS:", {
          trendingCount: trendingData.length,
          upcomingCount: upcomingData.length,
          sciFiCount: sciFiData.length,
          nowPlayingCount: nowPlayingData.length
        });

        // If filters narrowed results to 0, fetch unfiltered popular content for the hero
        if (trendingData.length === 0) {
          const fallbackData = await getPopularMovies(undefined, { signal });
          setHeroFallback(fallbackData.slice(0, 5));
        } else {
          setHeroFallback(trendingData.slice(0, 5));
        }

        // Fetch Recommendations based on watchlist
        if (watchlist.length > 0) {
          // Take recommendations from the most recent 2 items for a diverse set
          const recentItems = watchlist.slice(-2);
          const recPromises = recentItems.map(item => getRecommendations(item.id));
          const recResults = await Promise.all(recPromises);

          // Flatten and remove duplicates
          const seen = new Set(watchlist.map(m => m.id));
          const allRecs: Movie[] = [];

          recResults.forEach(list => {
            list.forEach(movie => {
              if (!seen.has(movie.id)) {
                allRecs.push(movie);
                seen.add(movie.id);
              }
            });
          });

          setRecommendations(allRecs.slice(0, 20));
          if (recentItems.length === 1) {
            setRecSource(recentItems[0].title);
          } else {
            setRecSource("your watchlist");
          }
        } else {
          const popularData = await getPopularMovies(profile || undefined, { signal });
          setRecommendations(popularData);
          setRecSource(null);
        }

        // Fetch Featured Partner
        const { getAffiliateLinks } = await import('@/services/affiliateService');
        const links = await getAffiliateLinks();
        setAffiliateLinks(links);
        const featuredKey = Object.keys(links).find(key => {
          const linkData = links[key];
          return typeof linkData === 'object' && linkData?.isFeatured;
        });

        if (featuredKey && trendingData.length > 0) {
          const topMovie = trendingData[0];
          const linkData = links[featuredKey] as any;

          const providerName = featuredKey.charAt(0).toUpperCase() + featuredKey.slice(1);

          let movieName = topMovie.title || 'Top Movie';
          if (movieName.includes(':')) {
            const parts = movieName.split(':');
            movieName = parts[parts.length - 1].trim();
          }

          setFeaturedPartner({
            movieName,
            providerName,
            offerText: linkData.offerText,
            affiliateUrl: linkData.url,
          });
        } else {
          setFeaturedPartner(null);
        }

      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Error loading home data:', error);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };
    loadData();

    return () => {
      abortController.abort('Component unmounted');
    };
  }, [watchlist.length, profileReady, filterKey]);
  if (isLoading && trending.length === 0 && heroFallback.length === 0) {
    return (
      <div className="w-full h-[75vh] md:h-[90vh] bg-surface animate-pulse rounded-none" />
    );
  }

  const filteredTrending = trending;
  const filteredUpcoming = upcoming;
  const filteredSciFi = sciFi;
  const filteredRecs = recommendations;
  const filteredNowPlaying = nowPlaying;

  // Hero always uses the best available: filtered trending, or fallback popular content
  const featuredMovies = filteredTrending.length > 0
    ? filteredTrending.slice(0, 5)
    : heroFallback.slice(0, 5);
  const topRated = [...filteredTrending].sort((a, b) => b.rating - a.rating);

  return (
    <div className="bg-background">
      {/* Subtle refresh indicator at top */}
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-brand/20 overflow-hidden">
          <div className="h-full bg-brand animate-[slide-right_1.2s_ease-in-out_infinite]" style={{ width: '40%', animation: 'slideRight 1.2s ease-in-out infinite' }} />
        </div>
      )}
      <HeroSection movies={featuredMovies} affiliateLinks={affiliateLinks} />

      <div className="relative z-20 space-y-4 md:space-y-8 pb-14 -mt-10 md:-mt-20">
        {filteredRecs.length > 0 && (
          <div className="pt-4 md:pt-8">
            <div className="px-6 md:px-12 flex items-center gap-2 text-brand text-xs font-black uppercase tracking-[0.2em] mb-2 drop-shadow-lg">
              <Sparkles className="w-4 h-4 fill-current" />
              {recSource ? `Because of ${recSource}` : "Recommended for You"}
            </div>
            <ScrollableRow title="" movies={filteredRecs} className="!py-0" />
          </div>
        )}

        {filteredUpcoming.length > 0 && (
          <ScrollableRow title="Upcoming Movies" movies={filteredUpcoming} />
        )}

        {filteredNowPlaying.length > 0 && (
          <ScrollableRow
            title="In Theaters"
            movies={filteredNowPlaying}
          />
        )}

        <ScrollableRow title="Trending Now" movies={filteredTrending} />

        {featuredPartner && (
          <SponsorBanner
            movieName={featuredPartner.movieName}
            providerName={featuredPartner.providerName}
            offerText={featuredPartner.offerText}
            affiliateUrl={featuredPartner.affiliateUrl}
          />
        )}

        <ScrollableRow title="Top Rated" movies={topRated} />
        <ScrollableRow title="By Genre: Sci-Fi" movies={filteredSciFi} />
      </div>

      {/* Premium Floating Subscription DNA Pill */}
      <AnimatePresence>
        {profile && profile.subscriptions.length > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`fixed bottom-6 right-6 z-50 select-none ${profile.autoFilter
                ? `bg-black/90 border border-brand/30 shadow-[0_12px_40px_rgba(255,40,78,0.25)] backdrop-blur-md ${isDnaExpanded
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
                        className="text-xs font-black uppercase text-brand tracking-widest cursor-pointer hover:text-white transition-colors"
                      >
                        Subscription DNA Active
                      </p>
                      <button
                        aria-label="Close subscription filter details"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDnaExpanded(false);
                        }}
                        className="text-white/40 hover:text-white text-xs font-bold transition-colors ml-2 p-2 min-h-[48px] min-w-[48px] flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
                      Filtering library to match your Cinema DNA: <strong className="text-white font-bold">{[...(profile.subscriptions || []), ...(profile.dnaMoods || [])].join(', ') || 'Custom Filters'}</strong>.
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
                        className="text-xs font-black uppercase tracking-wider bg-brand/10 hover:bg-brand/20 border border-brand/20 text-brand px-3 py-2 rounded-xl cursor-pointer transition-all duration-300 active:scale-95"
                      >
                        Disable Filter
                      </button>
                      <a
                        href="/profile"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-3 py-2 rounded-xl cursor-pointer transition-all duration-300 text-center flex items-center"
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
                  <span className="hidden md:inline text-xs font-black uppercase text-brand tracking-widest">
                    Subscription DNA Active
                  </span>
                </div>
              )
            ) : (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (profile.plan !== 'premium') {
                    toast.error("Upgrade to Premium to unlock!"); router.push('/profile?tab=payment');
                    return;
                  }
                  try {
                    const { doc, updateDoc } = await import('firebase/firestore');
                    await updateDoc(doc(getFirestore(app), `users/${user!.uid}`), { autoFilter: true });
                    setIsDnaExpanded(true);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className={`bg-black/95 border hover:border-brand/40 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-full px-5 py-3 flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] backdrop-blur-md animate-bounce-subtle ${profile.plan !== 'premium'
                    ? 'border-white/5 text-white/40 cursor-not-allowed opacity-80'
                    : 'border-white/10 text-white/80 hover:text-brand hover:bg-black/100 cursor-pointer'
                  }`}
              >
                <span>🍿</span>
                <span>Enable Subs DNA Filter</span>
                {profile.plan !== 'premium' && <span className="ml-1 opacity-50">🔒</span>}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
