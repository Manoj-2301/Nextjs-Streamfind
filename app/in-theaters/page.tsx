import React from 'react';
import { Metadata } from 'next';
import { getNowPlayingMovies } from '@/services/tmdbService';
import SeoMovieGrid from '@/components/ui/SeoMovieGrid';

export const revalidate = 86400; // 24 hours ISR

export const metadata: Metadata = {
  title: 'Running In Theaters | StreamFind',
  description: 'Discover the latest movies currently playing in theaters worldwide. Find showtimes and book tickets.',
};

export default async function InTheatersPage() {
  const movies = await getNowPlayingMovies();

  return (
    <div className="pt-24 min-h-screen">
      <SeoMovieGrid 
        movies={movies as any} 
        title="Running In Theaters" 
        description="Discover the newest movies currently playing in theaters near you."
      />
    </div>
  );
}
