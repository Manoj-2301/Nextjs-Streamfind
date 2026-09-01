import React from 'react';

export default function MovieDetailsLoading() {
  return (
    <div className="pb-20 bg-black min-h-screen">
      {/* Backdrop Skeleton */}
      <div className="relative w-full h-[40vh] md:h-[70vh] overflow-hidden bg-white/5 animate-pulse" />

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-12 max-w-7xl -mt-20 md:-mt-40 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          
          {/* Poster Column Skeleton */}
          <div className="w-48 md:w-80 shrink-0 mx-auto md:mx-0">
            <div className="rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-white/5 animate-pulse w-full aspect-[2/3]" />

            <div className="mt-6 md:mt-8 flex flex-col gap-3 md:gap-4">
              <div className="w-full h-10 md:h-12 bg-white/5 animate-pulse rounded-md" />
              <div className="w-full h-10 md:h-12 bg-white/5 animate-pulse rounded-md" />
              <div className="w-full h-10 md:h-12 bg-white/5 animate-pulse rounded-md" />
            </div>
          </div>

          {/* Details Column Skeleton */}
          <div className="flex-1 mt-4 md:mt-0 pt-10">
            {/* Badges Skeleton */}
            <div className="flex gap-3 mb-6">
              <div className="w-16 h-6 bg-white/5 animate-pulse rounded" />
              <div className="w-20 h-6 bg-white/5 animate-pulse rounded" />
            </div>

            {/* Title Skeleton */}
            <div className="w-3/4 h-12 md:h-20 bg-white/5 animate-pulse rounded mb-4" />
            
            {/* Tagline Skeleton */}
            <div className="w-1/2 h-6 md:h-8 bg-white/5 animate-pulse rounded mb-8" />

            {/* Meta info Skeleton (Year, Runtime) */}
            <div className="flex gap-6 mb-8">
              <div className="w-32 h-10 bg-white/5 animate-pulse rounded-full" />
              <div className="w-32 h-10 bg-white/5 animate-pulse rounded-full" />
              <div className="w-24 h-10 bg-white/5 animate-pulse rounded-full" />
            </div>

            {/* Description Skeleton */}
            <div className="w-full h-4 bg-white/5 animate-pulse rounded mb-3" />
            <div className="w-full h-4 bg-white/5 animate-pulse rounded mb-3" />
            <div className="w-5/6 h-4 bg-white/5 animate-pulse rounded mb-3" />
            <div className="w-4/6 h-4 bg-white/5 animate-pulse rounded mb-8" />

            {/* Cast & Crew Skeleton */}
            <div className="mb-12">
              <div className="w-32 h-6 bg-white/5 animate-pulse rounded mb-6" />
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/5 animate-pulse" />
                    <div className="w-14 h-3 bg-white/5 animate-pulse rounded" />
                    <div className="w-10 h-2 bg-white/5 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
