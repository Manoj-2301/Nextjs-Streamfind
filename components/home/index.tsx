'use client';

import HeroSection from '@/components/ui/hero-section';
import ScrollableRow from '@/components/ui/scrollable-row';
import SponsorBanner from '@/components/ui/sponsor-banner';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { getTrendingMovies, getMoviesByGenre, getRecommendations, getPopularMovies } from '@/services/tmdbService';
import { Movie } from '@/types';
import { Loader2, Sparkles } from 'lucide-react';
import { useWatchlist } from '@/context/WatchlistContext';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

export default function Home() {
  const [trending, setTrending] = useState<Movie[]>([]);
  const [sciFi, setSciFi] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [recSource, setRecSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { watchlist } = useWatchlist();
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ subscriptions: string[]; autoFilter: boolean } | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const docRef = doc(db, `users/${user.uid}`);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          subscriptions: data.subscriptions || [],
          autoFilter: data.autoFilter ?? false
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [trendingData, sciFiData] = await Promise.all([
          getTrendingMovies(),
          getMoviesByGenre(878) // 878 is Sci-Fi genre ID in TMDB
        ]);
        setTrending(trendingData);
        setSciFi(sciFiData);

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
          const popularData = await getPopularMovies();
          setRecommendations(popularData);
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-background"
    >
      <HeroSection movies={featuredMovies} />

      <div className="relative z-20 space-y-4 md:space-y-8 pb-14 -mt-10 md:-mt-20">
        {filteredRecs.length > 0 && (
          <div className="pt-4 md:pt-8">
            <div className="px-6 md:px-12 flex items-center gap-2 text-brand text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-2 drop-shadow-lg">
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
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="fixed bottom-6 right-6 z-50 max-w-xs md:max-w-sm"
          >
            {profile.autoFilter ? (
              <div className="bg-black/90 border border-brand/30 shadow-[0_12px_40px_rgba(255,40,78,0.25)] rounded-3xl p-5 backdrop-blur-md">
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 animate-pulse text-lg">
                    🍿
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-brand tracking-widest">Subscription DNA Active</p>
                    <p className="text-[10px] text-white/50 mt-1.5 leading-relaxed">
                      Filtering library to show only movies on your active subscriptions: <strong className="text-white font-bold">{profile.subscriptions.join(', ')}</strong>.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, `users/${user!.uid}`), { autoFilter: false });
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
                        className="text-[9px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-3 py-2 rounded-xl cursor-pointer transition-all duration-300 text-center"
                      >
                        Customize DNA
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, `users/${user!.uid}`), { autoFilter: true });
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
    </motion.div>
  );
}
