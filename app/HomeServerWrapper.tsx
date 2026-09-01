/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { Suspense } from 'react';
import Home from '@/components/home';
import { getTrendingMovies, getUpcomingMovies, getMoviesByGenre, getPopularMovies, getNowPlayingMovies } from '@/services/tmdbService';
import { Loader2 } from 'lucide-react';

export default async function HomeServerWrapper() {
  const [trending, upcoming, sciFi, popular, nowPlaying] = await Promise.all([
    getTrendingMovies(),
    getUpcomingMovies(),
    getMoviesByGenre(878),
    getPopularMovies(),
    getNowPlayingMovies()
  ]);

  return (
    <Home 
      initialTrending={trending}
      initialUpcoming={upcoming}
      initialSciFi={sciFi}
      initialPopular={popular}
      initialNowPlaying={nowPlaying}
    />
  );
}


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export function HomeFallback() {

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-black">
      <Loader2 className="w-12 h-12 text-brand animate-spin" />
      <p className="text-white/40 font-black tracking-[0.4em] uppercase text-xs">Loading Content...</p>
    </div>
  );
}
