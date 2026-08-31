'use client';

import { Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Movie } from '@/types';
import React, { useState } from 'react';
import PlatformBadge from '@/components/ui/platform-badge';

interface MovieCardProps {
  movie: Movie;
  accentColor?: string;
  priority?: boolean;
  activeGenre?: string;
}

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function MovieCard({ movie, accentColor = '#999', priority = false, activeGenre }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const [posterIndex, setPosterIndex] = useState(0);

  // Collect available image URLs to try, and downsize poster from w500 to w342 for the card thumbnail
  const possibleUrls = [
    movie.posterUrl?.replace('/w500/', '/w342/'),
    movie.backdropUrl?.replace('/w1280/', '/w780/')
  ].filter(Boolean) as string[];
  const currentPoster = possibleUrls[posterIndex];

  const BLUR_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

  const handleImgError = () => {
    if (posterIndex < possibleUrls.length - 1) {
      setPosterIndex(p => p + 1);
    } else {
      setImgError(true);
    }
  };

  const primaryPlatform = movie.platforms?.[0];
  
  // Prioritize displaying the selected/active genre if it matches one of the movie's genres
  const displayGenre = React.useMemo(() => {
    if (!movie.genre || movie.genre.length === 0) return '';
    if (activeGenre && activeGenre !== 'All') {
      const normSelected = activeGenre.toLowerCase().trim();
      const matched = movie.genre.find(g => {
        const normG = g.toLowerCase().trim();
        return normG === normSelected || 
               normG.includes(normSelected) || 
               (normSelected === 'sci-fi' && normG.includes('science fiction'));
      });
      if (matched) return matched;
    }
    return movie.genre[0];
  }, [movie.genre, activeGenre]);

  const formatDate = (dateString?: string, year?: number | string) => {
    if (dateString) {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (year) return year.toString();
    return '';
  };

  return (
    <Link href={`/movie/${movie.id}${movie.type ? `?type=${movie.type}` : ''}`}>
      <div
        className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-[#0f0f0f] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-all hover:scale-[1.03] duration-300 flex-shrink-0"
      >
        {/* Background Image / Fallback */}
        {imgError || !currentPoster ? (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-brand/20 to-purple-900/20 border border-white/5 text-center">
            <span className="font-sans font-black text-white/20 text-6xl uppercase tracking-tighter shadow-sm">{getInitials(movie.title)}</span>
          </div>
        ) : (
          <Image
            src={currentPoster}
            alt={movie.title}
            fill
            className="object-cover"
            onError={handleImgError}
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        )}

        {/* Dark Gradient bottom 60% */}
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent pointer-events-none" />

        {/* Top-Left: Platform Badge (if trending/active, for now show if we have platform) */}
        {primaryPlatform && (
          <div className="absolute top-2.5 left-2.5 z-10 border border-white/15 rounded-md overflow-hidden shadow-lg flex items-center justify-center bg-[#0f0f0f]">
            <PlatformBadge platform={primaryPlatform} showLabel={false} size="md" className="!gap-0" />
          </div>
        )}

        {/* Top-Right: Genre Chip */}
        {displayGenre && (
          <div className="absolute top-2.5 right-2.5 z-10 bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 px-2 py-1 rounded-md shadow-md flex items-center justify-center">
            <span className="font-sans text-[9px] font-black uppercase tracking-wider text-white/95 leading-none">
              {displayGenre}
            </span>
          </div>
        )}

        {/* Bottom Content */}
        <div className="absolute bottom-0 inset-x-0 p-3 z-10 flex flex-col">
          <div className="font-mono text-[9px] uppercase tracking-widest mb-1 truncate" style={{ color: accentColor }}>
            {displayGenre || 'Unknown'} · {movie.language || 'EN'}
          </div>
          
          <h3 className="font-serif text-[13px] text-white font-bold leading-tight mb-1.5 line-clamp-2">
            {movie.title}
          </h3>

          <div className="flex items-center justify-between mt-auto">
            <span className="font-mono text-[9px] text-[#999]">
              {formatDate(movie.releaseDate, movie.year)}
            </span>
            
            {movie.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star 
                  className={`w-3 h-3 fill-current ${
                    movie.rating >= 8.0 ? 'text-[#22C55E]' : 
                    movie.rating >= 6.5 ? 'text-[#F59E0B]' : 'text-[#E50914]'
                  }`} 
                />
                <span className="font-mono text-[10px] text-white font-bold">{movie.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
