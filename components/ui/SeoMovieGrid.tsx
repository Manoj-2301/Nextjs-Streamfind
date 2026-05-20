import React from 'react';
import { Movie } from '@/types';
import MovieCard from '@/components/ui/movie-card';

export default function SeoMovieGrid({ movies, title, description }: { movies: Movie[], title: string, description?: string }) {
  if (!movies || movies.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-white/50 text-xl font-medium">No titles found for this category.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <div className="text-center mb-10 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight italic mb-3">
          {title}
        </h1>
        {description && (
          <p className="text-white/60 text-sm md:text-base font-medium leading-relaxed">
            {description}
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
