import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Film, Star, Heart, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import DirectorNote from '@/components/profile-settings/DirectorNote';

interface NotesTabProps {
  userReviews: any[];
  handleToggleLike?: (movieId: number, liked: boolean) => void;
  handleShareNote?: (movieId: number, movieTitle: string) => void;
}

export default function NotesTab({
  userReviews,
  handleToggleLike,
  handleShareNote,
}: NotesTabProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Pagination State for performance optimization
  const [visibleCount, setVisibleCount] = useState(5);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (carouselRef.current?.offsetLeft || 0));
    setScrollLeft(carouselRef.current?.scrollLeft || 0);
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const visibleReviews = userReviews.slice(0, visibleCount);
  const hasMore = visibleCount < userReviews.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 relative"
    >
      <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/20 blur-[60px] rounded-full pointer-events-none" />
        <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Director&apos;s Notes</h4>
        <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Your detailed reviews and cinematic critiques.</p>
      </div>

      <div className="relative">
        {userReviews.length === 0 ? (
          <div className="py-20 bg-[#0a0a0a]/50 border border-dashed border-white/10 rounded-[40px] text-center flex flex-col items-center justify-center gap-6 backdrop-blur-xl shadow-inner relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-center shadow-inner relative z-10">
              <Film className="w-10 h-10 text-white/30 drop-shadow-md" />
            </div>
            <p className="text-[11px] uppercase font-black tracking-widest leading-relaxed text-white/50 relative z-10 max-w-sm">No custom written notes submitted yet.<br />Leave reviews on details pages to fill your diary!</p>
          </div>
        ) : (
          <div className="relative group/carousel">
            <div
              ref={carouselRef}
              className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-6 scroll-smooth cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {visibleReviews.map((review) => (
                <div
                  key={review.movieId}
                  className="w-full sm:w-[500px] shrink-0 snap-start p-8 bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] hover:bg-white/5 transition-all duration-300 group flex flex-col gap-6 backdrop-blur-xl shadow-inner relative overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand/10 blur-[50px] rounded-full pointer-events-none transition-all duration-500 group-hover:bg-brand/20" />
                  
                  <div className="flex gap-6 relative z-10">
                    <div className="w-20 shrink-0 h-32 bg-white/5 rounded-2xl overflow-hidden shadow-[0_10px_20px_rgba(0,0,0,0.5)] border border-white/10 relative">
                      <Image
                        src={review.moviePoster || 'https://placehold.co/200x300?text=No+Image'}
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        fill
                        sizes="100px"
                        alt={review.movieTitle}
                        unoptimized={true}
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-black uppercase text-white tracking-wider line-clamp-1 drop-shadow-sm">{review.movieTitle}</p>
                          <div className="flex gap-1 mt-2 bg-black/40 w-fit px-3 py-1.5 rounded-full border border-white/5">
                            {Array.from({ length: 5 }).map((_, s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${s < review.rating ? 'text-brand fill-brand drop-shadow-[0_0_8px_rgba(240,171,252,0.8)]' : 'text-white/20'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-white/60 text-[11px] leading-relaxed font-bold italic line-clamp-3">
                        {review.reviewText ? `"${review.reviewText}"` : "Rated only, no written critique submitted."}
                      </p>
                    </div>
                  </div>

                  <DirectorNote movieId={review.movieId} />

                  <div className="mt-auto pt-6 border-t border-white/10 flex items-center gap-6 relative z-10">
                    {handleToggleLike && (
                      <button
                        onClick={() => handleToggleLike(review.movieId, !!review.liked)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-brand transition-colors bg-white/5 hover:bg-brand/10 border border-white/10 hover:border-brand/30 px-4 py-2 rounded-xl"
                      >
                        <Heart className={`w-4 h-4 transition-colors ${review.liked ? 'text-brand fill-brand drop-shadow-[0_0_8px_rgba(240,171,252,0.8)]' : 'text-white/40'}`} />
                        <span className={review.liked ? 'text-brand' : ''}>
                          {review.liked ? 'Liked' : 'Like'}
                        </span>
                      </button>
                    )}
                    {handleShareNote && (
                      <button
                        onClick={() => handleShareNote(review.movieId, review.movieTitle)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-4 py-2 rounded-xl"
                      >
                        <Share2 className="w-4 h-4" /> Share Note
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {hasMore && (
                <div className="w-[200px] shrink-0 snap-start p-8 flex items-center justify-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="w-full py-6 bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] hover:bg-white/5 transition-all duration-300 text-xs font-black uppercase tracking-widest text-brand"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>

            {visibleReviews.length > 1 && (
              <>
                <button
                  onClick={() => scrollCarousel('left')}
                  className="absolute left-[-15px] top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-brand hover:text-white hover:border-brand/50 transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-20"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => scrollCarousel('right')}
                  className="absolute right-[-15px] top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-brand hover:text-white hover:border-brand/50 transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-20"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
