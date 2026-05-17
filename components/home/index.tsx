'use client';

import HeroSection from '@/components/ui/hero-section';
import ScrollableRow from '@/components/ui/scrollable-row';
import SponsorBanner from '@/components/ui/sponsor-banner';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { getTrendingMovies, getMoviesByGenre, getRecommendations, getPopularMovies } from '@/services/tmdbService';
import { Movie } from '@/types';
import { Loader2, Sparkles } from 'lucide-react';
import { useWatchlist } from '@/context/WatchlistContext';

export default function Home() {
  const [trending, setTrending] = useState<Movie[]>([]);
  const [sciFi, setSciFi] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [recSource, setRecSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { watchlist } = useWatchlist();

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

  const featuredMovies = trending.slice(0, 5);
  const topRated = [...trending].sort((a, b) => b.rating - a.rating);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-background"
    >
      <HeroSection movies={featuredMovies} />

      <div className="relative z-20 space-y-4 md:space-y-8 pb-14 -mt-10 md:-mt-20">
        {recommendations.length > 0 && (
          <div className="pt-4 md:pt-8">
            <div className="px-6 md:px-12 flex items-center gap-2 text-brand text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-2 drop-shadow-lg">
              <Sparkles className="w-4 h-4 fill-current" />
              {recSource ? `Because of ${recSource}` : "Recommended for You"}
            </div>
            <ScrollableRow title="" movies={recommendations} className="!py-0" />
          </div>
        )}

        <ScrollableRow title="Trending Now" movies={trending} />

        <SponsorBanner />

        <ScrollableRow title="Top Rated" movies={topRated} />
        <ScrollableRow title="By Genre: Sci-Fi" movies={sciFi} />
      </div>
    </motion.div>
  );
}
