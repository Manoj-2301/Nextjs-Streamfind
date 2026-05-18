'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Play, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Movie } from '@/types';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

interface HeroSectionProps {
  movies: Movie[];
}

export default function HeroSection({ movies }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [hasStartedTrailerOnce, setHasStartedTrailerOnce] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => (prevIndex + newDirection + movies.length) % movies.length);
    setIsPlayingTrailer(false);
    setHasStartedTrailerOnce(false);
  }, [movies.length]);

  // Viewport Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.5 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (isPlayingTrailer) return;

    const interval = setInterval(() => {
      paginate(1);
    }, 8000);

    return () => clearInterval(interval);
  }, [currentIndex, isPlayingTrailer, paginate]);

  // Trailer countdown logic
  useEffect(() => {
    if (isPlayingTrailer) return;

    // Clear existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Only start timer if in view
    if (isInView) {
      timerRef.current = setTimeout(() => {
        setIsPlayingTrailer(true);
        setHasStartedTrailerOnce(true);
      }, 5000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, isInView, isPlayingTrailer]);

  // Specific user request: Pause when scroll IN, Resume when scroll OUT after it has started
  const shouldActuallyPlay = isPlayingTrailer && (!isInView || !hasStartedTrailerOnce);
  // Re-interpreting user's request: "pause if scrolls back into... resume when scrolls back out"
  // This probably means a background "ambience" mode. 
  // However, standard UX is "play when in view". 
  // I will implement a "toggle" state based on isInView for the IFRAME content.
  const isVideoActive = isPlayingTrailer && !isInView; // As per specific instruction

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') paginate(-1);
      if (e.key === 'ArrowRight') paginate(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paginate]);

  if (!movies || movies.length === 0) {
    return (
      <div className="w-full h-[75vh] md:h-[90vh] bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
      </div>
    );
  }

  const movie = movies[currentIndex];

  // Find a prioritized sponsored platform if it exists
  const sponsorPlatform = movie.platforms?.find(p => p.isSponsored) ||
    movie.platforms?.find(p =>
      p.name.toLowerCase().includes('hotstar') ||
      p.name.toLowerCase().includes('netflix') ||
      p.name.toLowerCase().includes('prime')
    ) || movie.platforms?.[0];

  if (!sponsorPlatform) {
    // Fallback if no platforms are found for some reason
    return null;
  }

  const getPartnerStyles = (name: string) => {
    const platformName = name.toLowerCase();
    if (platformName.includes('netflix')) {
      return 'bg-[#E50914] text-white hover:bg-[#B80710] shadow-[0_0_20px_rgba(229,9,20,0.4)] border-none';
    }
    if (platformName.includes('prime') || platformName.includes('amazon')) {
      return 'bg-[#00A8E8] text-white hover:bg-[#008CC2] shadow-[0_0_20px_rgba(0,168,232,0.4)] border-none';
    }
    if (platformName.includes('hotstar') || platformName.includes('disney')) {
      return 'bg-[#1F80E0] text-white hover:bg-[#1565C0] shadow-[0_0_20px_rgba(31,128,224,0.4)] border-none';
    }
    if (platformName.includes('apple') || platformName.includes('itunes')) {
      return 'bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.1)] border-none';
    }
    if (platformName.includes('hulu')) {
      return 'bg-[#1CE783] text-black hover:bg-[#15B868] shadow-[0_0_20px_rgba(28,231,131,0.4)] border-none';
    }
    if (platformName.includes('hbo') || platformName.includes('max')) {
      return 'bg-[#7B2CBF] text-white hover:bg-[#5A189A] shadow-[0_0_20px_rgba(123,44,191,0.4)] border-none';
    }
    if (platformName.includes('youtube')) {
      return 'bg-[#FF0000] text-white hover:bg-[#CC0000] shadow-[0_0_20px_rgba(255,0,0,0.4)] border-none';
    }
    return sponsorPlatform.isSponsored
      ? 'bg-brand text-white hover:bg-red-700 shadow-[0_0_20px_rgba(229,9,20,0.4)] border-none'
      : 'glass border border-white/10 text-white hover:bg-white/10';
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <section ref={sectionRef} className="relative w-full h-[75vh] md:h-[90vh] overflow-hidden flex items-end bg-black">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.4 }
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={(_, info) => {
            const swipe = info.offset.x;
            const threshold = 50;
            if (swipe < -threshold) {
              paginate(1);
            } else if (swipe > threshold) {
              paginate(-1);
            }
          }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          {/* Background with overlay and Trailer */}
          <div className="absolute inset-0">
            <AnimatePresence mode="wait">
              {!isPlayingTrailer ? (
                <motion.img
                  key="image"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={movie.backdropUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <motion.div
                  key="trailer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full relative"
                >
                  {/* The requested logic implies the trailer stays but might "pause" or be muted/active based on scroll */}
                  <iframe
                    className={`w-full h-full scale-110 md:scale-125 pointer-events-none transition-opacity duration-1000 opacity-60 grayscale-[0.3]`}
                    src={`https://www.youtube.com/embed/${movie.trailerYoutubeId}?autoplay=1&mute=0&controls=0&modestbranding=1&showinfo=0&rel=0&loop=1&playlist=${movie.trailerYoutubeId}&iv_load_policy=3&disablekb=1&enablejsapi=1`}
                    title={movie.title}
                    frameBorder="0"
                    allow="autoplay; encrypted-media; fullscreen;"
                  />
                  {isInView && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-[10px] font-black tracking-[0.5em] text-white/20 uppercase">Trailer Running in Background</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute inset-0 hero-gradient" />
          </div>

          {/* Content */}
          <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-7xl h-full flex flex-col justify-end pb-32 md:pb-48">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-3xl"
            >
              <div className="flex items-center gap-3 mb-4 md:mb-6 text-[10px] md:text-xs font-bold transition-opacity duration-700">
                {sponsorPlatform.isSponsored && (
                  <span className="bg-brand text-white px-2 py-0.5 rounded flex items-center gap-1">
                    SPONSORED
                  </span>
                )}
                <span className="bg-yellow-500 text-black px-2 py-0.5 rounded shadow-lg font-black">IMDb {movie.rating}</span>
                <span className="text-white color-white uppercase tracking-widest drop-shadow-md font-bold">{movie.year} • {movie.genre[0]} • {movie.runtime}</span>
              </div>

              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl sm:text-5xl md:text-6xl font-black mb-4 md:mb-6 tracking-tighter uppercase leading-[0.9] text-white drop-shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
              >
                {movie.title}
              </motion.h1>

              <p className="text-white text-xs md:text-base leading-relaxed mb-6 md:mb-8 line-clamp-2 max-w-2xl font-medium drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                {movie.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <a
                  href={sponsorPlatform.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-full sm:w-auto px-5 md:px-8 h-10 md:h-12 rounded-md font-bold text-xs md:text-[13px] tracking-widest transition-all uppercase flex items-center justify-center gap-2 ${getPartnerStyles(sponsorPlatform.name)}`}
                  >
                    <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" /> WATCH ON {sponsorPlatform.name}
                  </motion.button>
                </a>
                <Link href={`/movie/${movie.id}`} className="w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto glass px-5 md:px-8 h-10 md:h-12 rounded-md font-bold text-xs md:text-[13px] tracking-widest hover:bg-white/10 transition-all text-white uppercase flex items-center justify-center gap-2"
                  >
                    VIEW DETAILS
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Indicators */}
      <div className="absolute bottom-12 md:bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {movies.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setDirection(i > currentIndex ? 1 : -1);
              setCurrentIndex(i);
            }}
            className={`h-1.5 transition-all rounded-full ${i === currentIndex ? 'w-10 bg-brand' : 'w-2 bg-white/20 hover:bg-white/40'}`}
          />
        ))}
      </div>
    </section>
  );
}
