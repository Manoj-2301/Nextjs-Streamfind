/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import React from 'react';
import { Loader2 } from 'lucide-react';


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function BrowseLoading() {

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <div className="min-h-screen bg-black pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-12 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-8 mb-8 relative z-20">
          <div className="lg:w-1/4">
            <div className="w-full h-12 bg-white/5 animate-pulse rounded-full" />
          </div>
          <div className="lg:w-3/4">
            <div className="w-full h-12 bg-white/5 animate-pulse rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-[2/3] w-full rounded-2xl bg-white/5 animate-pulse" />
              <div className="w-3/4 h-4 bg-white/5 animate-pulse rounded mt-2" />
              <div className="w-1/2 h-3 bg-white/5 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
