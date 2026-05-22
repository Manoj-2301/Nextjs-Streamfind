'use client';

import { motion } from 'motion/react';
import { Star, Play, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/optimized-media';
import { Movie } from '@/types';
import React from 'react';
import { useWatchlist } from '@/context/WatchlistContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface MovieCardProps {
  movie: Movie;
  key?: React.Key;
  priority?: boolean;
}

export default function MovieCard({ movie, priority = false }: MovieCardProps) {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { user } = useAuth();
  const router = useRouter();
  const saved = isInWatchlist(movie.id);

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      router.push('/auth');
      return;
    }

    if (saved) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist(movie);
    }
  };

  return (
    <Link href={`/movie/${movie.id}${movie.type ? `?type=${movie.type}` : ''}`}>
      <motion.div
        whileHover={{ scale: 1.03, y: -6 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative group/card w-full aspect-[2/3] rounded-xl md:rounded-2xl overflow-hidden bg-[#111] border border-white/5 hover:border-brand/50 shadow-xl hover:shadow-[0_15px_40px_rgba(229,9,20,0.25)] transition-all duration-500"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-brand/0 via-brand/0 to-brand/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none z-10" />
        {/* Poster Image */}
        <OptimizedImage
          src={movie.posterUrl}
          alt={movie.title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover/card:scale-105"
          priority={priority}
        />

        {/* Binge Worthy Badge */}
        {movie.rating >= 7.5 && (
          <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-brand/90 backdrop-blur-md border border-white/20 text-white font-black text-[7px] md:text-[8px] uppercase tracking-widest px-2.5 py-1.5 rounded-full shadow-[0_4px_12px_rgba(255,40,78,0.4)] z-30 flex items-center gap-1.5 scale-95 group-hover/card:scale-100 transition-transform">
            <span className="animate-pulse drop-shadow-md">🔥</span>
            <span>Hot</span>
          </div>
        )}

        {/* Permanent Bottom Black Gradient for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent pointer-events-none z-10 opacity-90" />

        {/* Watchlist Bookmark (Hover only) */}
        <button
          onClick={toggleWatchlist}
          aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-30 opacity-0 group-hover/card:opacity-100 ${
            saved 
              ? 'bg-brand text-white shadow-[0_0_10px_rgba(229,9,20,0.5)] !opacity-100' 
              : 'bg-black/60 text-white/80 hover:text-white hover:bg-black/80'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
        </button>

        {/* Content Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 md:pb-5 flex flex-col justify-end z-20 w-full overflow-hidden">
          <p className="text-sm md:text-base font-black text-white uppercase tracking-tight line-clamp-1 mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover/card:text-brand transition-colors duration-300">
            {movie.title}
          </p>
          
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-white/10 backdrop-blur-sm border border-white/10 text-white/90 text-[8px] md:text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-sm shadow-sm">
              {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : movie.year}
            </span>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
              <span className="text-[10px] font-bold text-white drop-shadow-md">{movie.rating}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-1">
            {movie.platforms && movie.platforms.slice(0, 2).map((p, i) => {
              const isPartner = p.isSponsored || (p as any).isPartner;
              // Highlight the first provider (main provider) or partner
              const isMain = i === 0;
              
              return (
                <div
                  key={i}
                  className={`text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-sm border flex items-center gap-1 transition-colors ${
                    isPartner 
                      ? 'border-brand/50 bg-brand/10 text-brand font-black shadow-[0_0_10px_rgba(229,9,20,0.2)]' 
                      : isMain
                        ? 'border-white/30 bg-white/20 text-white font-bold shadow-sm'
                        : 'border-white/10 bg-white/5 text-white/70'
                  }`}
                  title={p.name}
                >
                  {p.name}
                </div>
              );
            })}
            {movie.platforms && movie.platforms.length > 2 && (
              <div className="text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-sm border border-white/10 bg-white/5 text-white/70 flex items-center">
                +{movie.platforms.length - 2}
              </div>
            )}
          </div>

          {/* VIEW DETAILS Button (Hover only) */}
          <div className="h-0 opacity-0 group-hover/card:h-9 group-hover/card:opacity-100 group-hover/card:mt-3 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] overflow-hidden">
            <button className="w-full h-full bg-gradient-to-r from-brand to-red-600 hover:from-red-600 hover:to-red-700 text-white text-[10px] font-black rounded-lg transition-all tracking-[0.2em] uppercase flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.4)]">
              View Details
            </button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
