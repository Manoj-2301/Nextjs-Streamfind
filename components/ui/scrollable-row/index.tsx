/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, KeyboardEvent } from 'react';
import MovieCard from '@/components/ui/movie-card';
import { Movie } from '@/types';
import Link from 'next/link';



/*
 * ============================================================
 * TYPES
 * ============================================================
 */
interface ScrollableRowProps {
  title: string;
  movies: Movie[];
  className?: string;
  viewAllLink?: string;
  priorityImages?: boolean;
}


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function ScrollableRow({ title, movies, className = "", viewAllLink, priorityImages = false }: ScrollableRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftState = useRef(0);


  /*
   * ============================================================
   * EVENT HANDLERS
   * ============================================================
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftState.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeftState.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scroll('left');
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scroll('right');
    }
  };


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <div
      className={`py-1 group outline-none ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ 
        contentVisibility: 'auto', 
        containIntrinsicSize: 'auto 400px' 
      } as React.CSSProperties}
    >
      {title && (
        <div className="flex items-center justify-between mb-1 px-1 lg:px-12">
          <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tighter flex items-center gap-3">
            <span className="w-1.5 h-5 md:h-6 bg-brand block"></span>
            {title}
          </h2>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="p-2 rounded-full glass hover:bg-brand hover:text-black transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="p-2 rounded-full glass hover:bg-brand hover:text-black transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {viewAllLink && (
              <Link href={viewAllLink} className="ml-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white hover:text-black transition-colors">
                View All
              </Link>
            )}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto px-6 pt-6 lg:px-12 hide-scrollbar pb-6 scroll-smooth cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {movies.map((movie, index) => (
          <div key={movie.id} className="w-[140px] sm:w-[180px] md:w-[220px] shrink-0">
            <MovieCard movie={movie} priority={priorityImages && index < 4} />
          </div>
        ))}
      </div>
    </div>
  );
}
