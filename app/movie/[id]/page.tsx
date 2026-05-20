import MovieDetails from '@/components/movie-details';
import { getMovieDetails } from '@/services/tmdbService';
import { Suspense } from 'react';

export default async function MovieDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const id = Number(resolvedParams.id);
  const type = resolvedSearchParams.type as 'movie' | 'tv' | undefined;

  let initialMovie = null;
  try {
    if (id) {
      initialMovie = await getMovieDetails(id, type);
    }
  } catch (error) {
    console.error('Error pre-fetching movie details on server:', error);
  }

  return (
    <Suspense fallback={null}>
      <MovieDetails initialMovie={initialMovie || undefined} />
    </Suspense>
  );
}
