'use client';
import { getFirestore } from 'firebase/firestore';
import HeroSection from '@/components/ui/hero-section';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { getTrendingMovies, getMoviesByGenre, getRecommendations, getPopularMovies } from '@/services/tmdbService';
import { Movie } from '@/types';
import { Loader2, Sparkles } from 'lucide-react';
import { useWatchlist } from '@/context/WatchlistContext';
import { useAuth } from '@/context/AuthContext';
import { app } from '@/lib/firebase';

const ScrollableRow = dynamic(() => import('@/components/ui/scrollable-row'), { 
  ssr: true,
  loading: () => <div className="h-64 w-full animate-pulse bg-white/5 rounded-xl my-4" /> 
});
const SponsorBanner = dynamic(() => import('@/components/ui/sponsor-banner'), { ssr: true });

interface HomeProps {
  initialTrending?: Movie[];
  initialSciFi?: Movie[];
  initialPopular?: Movie[];
}

export default function Home({
  initialTrending = [],
  initialSciFi = [],
  initialPopular = []
}: HomeProps) {
  const [trending, setTrending] = useState<Movie[]>(initialTrending);
  const [sciFi, setSciFi] = useState<Movie[]>(initialSciFi);
  const [recommendations, setRecommendations] = useState<Movie[]>(initialPopular);
  const [recSource, setRecSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(initialTrending.length === 0);
  const { watchlist } = useWatchlist();
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
      const docRef = doc(getFirestore(app), `users/${user.uid}`);
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

  useEffect(() => {
    const loadData = async () => {
      try {
        let currentTrending = trending;
        let currentSciFi = sciFi;

        if (trending.length === 0 || sciFi.length === 0) {
          const [trendingData, sciFiData] = await Promise.all([
            getTrendingMovies(),
            getMoviesByGenre(878) // 878 is Sci-Fi genre ID in TMDB
          ]);
          currentTrending = trendingData;
          currentSciFi = sciFiData;
          setTrending(trendingData);
          setSciFi(sciFiData);
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
          if (recommendations.length === 0) {
            const popularData = await getPopularMovies();
            setRecommendations(popularData);
          }
          setRecSource(null);
        }
      } catch (error) {
        console.error('Error loading home data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [watchlist.length]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
        <p className="text-white/40 font-black tracking-widest uppercase text-xs">Syncing with Cinema...</p>
      </div>
    );
  }

  const matchPlatform = (userSub: string, moviePlatform: string) => {
    const norm = (s: string) => s.toLowerCase().replace(/amazon/g, '').replace(/video/g, '').replace(/prime/g, 'prime').trim();
    return norm(userSub) === norm(moviePlatform);
  };

  const filterBySubs = (movieList: Movie[]) => {
    if (!profile || !profile.autoFilter || profile.subscriptions.length === 0) {
      return movieList;
    }
    return movieList.filter(movie => 
      movie.platforms && movie.platforms.some(platform => 
        profile.subscriptions.some(sub => matchPlatform(sub, platform.name))
      )
    );
  };

  const filteredTrending = filterBySubs(trending);
  const filteredSciFi = filterBySubs(sciFi);
  const filteredRecs = filterBySubs(recommendations);

  const featuredMovies = filteredTrending.length > 0 ? filteredTrending.slice(0, 5) : trending.slice(0, 5);
  const topRated = [...filteredTrending].sort((a, b) => b.rating - a.rating);

  return (
    <div className="bg-background">
      <HeroSection movies={featuredMovies} />

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

        <ScrollableRow title="Trending Now" movies={filteredTrending} />

        <SponsorBanner />

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
                className="bg-black/95 hover:bg-black/100 border border-white/10 hover:border-brand/40 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-full px-5 py-3 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white/80 hover:text-brand cursor-pointer transition-all duration-300 backdrop-blur-md animate-bounce-subtle"
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
