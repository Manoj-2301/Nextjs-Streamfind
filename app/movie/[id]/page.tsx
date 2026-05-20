import MovieDetails from '@/components/movie-details';
import { Suspense } from 'react';

export default function MovieDetailPage() {
  return (
    <Suspense fallback={null}>
      <MovieDetails />
    </Suspense>
  );
}
