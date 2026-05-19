import React from 'react';

export default function MovieCardSkeleton() {
  return (
    <div className="relative group/card w-full aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-white/5 animate-pulse">
      {/* Aspect Ratio Container for Poster */}
      <div className="absolute inset-0 bg-white/5" />
      
      {/* Bottom overlay skeleton */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col gap-2">
        {/* Title skeleton */}
        <div className="h-5 bg-white/10 rounded w-3/4" />
        
        {/* Rating/Year skeleton */}
        <div className="flex gap-2">
          <div className="h-3.5 bg-white/10 rounded w-1/4" />
          <div className="h-3.5 bg-white/10 rounded w-1/4" />
        </div>

        {/* Platform badges skeleton */}
        <div className="flex gap-1.5 mt-1">
          <div className="w-5 h-5 rounded-full bg-white/10" />
          <div className="w-5 h-5 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}
