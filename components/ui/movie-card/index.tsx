'use client';

import { motion } from 'motion/react';
import { Star, Play, Bookmark } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
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
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative group/card w-full aspect-[2/3] rounded-lg md:rounded-xl overflow-hidden glass border border-white/10 hover:border-brand/40 shadow-lg hover:shadow-[0_8px_30px_rgba(229,9,20,0.15)] transition-all duration-300"
      >
        {/* Poster Image */}
        <Image
          src={movie.posterUrl}
          alt={movie.title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover/card:scale-105"
          referrerPolicy="no-referrer"
          priority={priority}
        />

        {/* Binge Worthy Badge */}
        {movie.rating >= 7.5 && (
          <div className="absolute top-4 left-4 bg-brand/90 backdrop-blur-md border border-brand/50 text-white font-black text-[8px] uppercase tracking-widest px-2.5 py-1 rounded-full shadow-[0_4px_12px_rgba(255,40,78,0.3)] z-30 flex items-center gap-1">
            <span className="animate-pulse">🍿</span>
            <span>Binge Worthy</span>
          </div>
        )}

        {/* Permanent Bottom Black Gradient for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

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

        {/* Content Overlay (Title, Info, Platforms always visible; CTA button slides in on hover) */}
        <div className="absolute inset-x-0 bottom-0 p-3 pb-5 md:p-4 md:pb-6 flex flex-col justify-end z-20 w-full overflow-hidden">
          <p className="text-xs font-bold text-white uppercase tracking-tight line-clamp-1 mb-0.5 drop-shadow-md">
            {movie.title}
          </p>
          
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-[10px] text-white/60">{movie.year}</p>
            <div className="flex items-center gap-0.5 text-yellow-400">
              <Star className="w-2.5 h-2.5 fill-current" />
              <span className="text-[10px] font-bold">{movie.rating}</span>
            </div>
          </div>

          <div className="relative w-full overflow-hidden mb-1 pb-0.5">
            {movie.platforms && movie.platforms.length > 0 && (
              <motion.div 
                className="flex gap-1"
                style={{ width: 'max-content' }}
                animate={movie.platforms.length > 1 ? {
                  x: [0, "-50%"]
                } : {}}
                transition={movie.platforms.length > 1 ? {
                  x: {
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: Math.max(10, movie.platforms.length * 5),
                    ease: "linear"
                  }
                } : undefined}
              >
                {/* First Pass */}
                {movie.platforms.map((p, i) => {
                  const isPartner = p.isSponsored || (p as any).isPartner;
                  return (
                    <div
                      key={`p1-${i}`}
                      className={`text-[8px] md:text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 transition-colors shrink-0 ${
                        isPartner 
                          ? 'border-brand bg-brand/20 text-white font-black animate-pulse' 
                          : 'border-white/10 bg-black/60 text-white/80'
                      }`}
                      title={p.name}
                    >
                      {p.name}
                      {isPartner && <span className="text-[6px] font-black tracking-widest text-brand uppercase ml-0.5">Partner</span>}
                    </div>
                  );
                })}
                {/* Second Pass for Infinite Loop (only if animating) */}
                {movie.platforms.length > 1 && movie.platforms.map((p, i) => {
                  const isPartner = p.isSponsored || (p as any).isPartner;
                  return (
                    <div
                      key={`p2-${i}`}
                      className={`text-[8px] md:text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 transition-colors shrink-0 ${
                        isPartner 
                          ? 'border-brand bg-brand/20 text-white font-black animate-pulse' 
                          : 'border-white/10 bg-black/60 text-white/80'
                      }`}
                      title={p.name}
                    >
                      {p.name}
                      {isPartner && <span className="text-[6px] font-black tracking-widest text-brand uppercase ml-0.5">Partner</span>}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </div>

          {/* VIEW DETAILS Button (Hover only - expands dynamically from bottom) */}
          <div className="h-0 opacity-0 group-hover/card:h-8 group-hover/card:opacity-100 group-hover/card:mt-2 transition-all duration-300 ease-out overflow-hidden">
            <button className="w-full h-full bg-brand text-white text-[9px] font-bold rounded transition-all tracking-wider uppercase flex items-center justify-center hover:bg-red-700 shadow-md">
              VIEW DETAILS
            </button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
