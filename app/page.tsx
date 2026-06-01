import Home from '@/components/home';
import { Movie } from '@/types';
import { getTrendingMovies, getMoviesByGenre, getPopularMovies, getUpcomingMovies } from '@/services/tmdbService';

export const revalidate = 3600; // ISR: cache the page for 1 hour, revalidate in background

export default async function HomePage() {
  let initialTrending: Movie[] = [];
  let initialUpcoming: Movie[] = [];
  let initialSciFi: Movie[] = [];
  let initialPopular: Movie[] = [];

  try {
    const [trending, upcoming, sciFi, popular] = await Promise.all([
      getTrendingMovies(),
      getUpcomingMovies(),
      getMoviesByGenre(878),
      getPopularMovies()
    ]);
    initialTrending = trending;
    initialUpcoming = upcoming;
    initialSciFi = sciFi;
    initialPopular = popular;
  } catch (error) {
    console.error('Error fetching homepage data on server:', error);
  }

  return (
    <Home 
      initialTrending={initialTrending}
      initialUpcoming={initialUpcoming}
      initialSciFi={initialSciFi}
      initialPopular={initialPopular}
    />
  );
}

