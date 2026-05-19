import Home from '@/components/home';
import { Movie } from '@/types';
import { getTrendingMovies, getMoviesByGenre, getPopularMovies } from '@/services/tmdbService';

export const revalidate = 3600; // Revalidate every 3600 seconds (1 hour)

export default async function HomePage() {
  let initialTrending: Movie[] = [];
  let initialSciFi: Movie[] = [];
  let initialPopular: Movie[] = [];

  try {
    const [trending, sciFi, popular] = await Promise.all([
      getTrendingMovies(),
      getMoviesByGenre(878),
      getPopularMovies()
    ]);
    initialTrending = trending;
    initialSciFi = sciFi;
    initialPopular = popular;
  } catch (error) {
    console.error('Error fetching homepage data on server:', error);
  }

  return (
    <Home 
      initialTrending={initialTrending}
      initialSciFi={initialSciFi}
      initialPopular={initialPopular}
    />
  );
}

