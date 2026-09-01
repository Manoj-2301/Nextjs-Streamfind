/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Volume2, VolumeX, ExternalLink, Loader2, AlertCircle, Info } from 'lucide-react';
import { Movie, Platform } from '@/types';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { resolveWatchUrl, AffiliateLinks } from '@/services/affiliateService';
import { OptimizedImage, OptimizedIframe } from '@/components/ui/optimized-media';
import Button from '@/components/ui/button';
import { useSystemConfig } from '@/hooks/firebase/useSystemConfig';
import { useMovieDetails } from '@/hooks/useTmdbQueries';

const localizeTmdbUrl = (url: string, countryCode: string): string => {
  if (!url || !url.includes('themoviedb.org')) return url;
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set('locale', countryCode);
    return parsedUrl.toString();
  } catch (e) {
    return url;
  }
};


/*
 * ============================================================
 * TYPES
 * ============================================================
 */
interface HeroSectionProps {
  movies: Movie[];
  affiliateLinks?: AffiliateLinks;
}


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function HeroSection({ movies, affiliateLinks = {} }: HeroSectionProps) {

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isManualPlay, setIsManualPlay] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [hasStartedTrailerOnce, setHasStartedTrailerOnce] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [userCountryCode, setUserCountryCode] = useState<string>('IN');

  const baseMovie = movies[currentIndex] || movies[0];
  const { data: movieDetails } = useMovieDetails(baseMovie?.id, baseMovie?.type as 'movie' | 'tv', {
    enabled: !!baseMovie?.id && !baseMovie?.trailerYoutubeId,
  });

  const movie = movieDetails || baseMovie;
  const { config, isLoading: isConfigLoading } = useSystemConfig();


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      let detectedCode = '';

      if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('Asia/Kolkata') || tz.includes('Asia/Calcutta')) {
        detectedCode = 'IN';
      } else if (tz.includes('London')) {
        detectedCode = 'GB';
      } else if (tz.includes('Singapore')) {
        detectedCode = 'SG';
      } else if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Montreal')) {
        detectedCode = 'CA';
      } else if (tz.includes('America/')) {
        detectedCode = 'US';
      } else if (tz.includes('Sydney') || tz.includes('Melbourne') || tz.includes('Australia')) {
        detectedCode = 'AU';
      } else if (tz.includes('Auckland')) {
        detectedCode = 'NZ';
      } else if (tz.includes('Tokyo')) {
        detectedCode = 'JP';
      } else if (tz.includes('Seoul')) {
        detectedCode = 'KR';
      } else if (tz.includes('Hong_Kong')) {
        detectedCode = 'HK';
      } else if (tz.includes('Manila')) {
        detectedCode = 'PH';
      }

      if (!detectedCode) {
        const lang = navigator.language || '';
        if (lang.includes('-IN')) detectedCode = 'IN';
        else if (lang.includes('-US')) detectedCode = 'US';
        else if (lang.includes('-GB')) detectedCode = 'GB';
        else if (lang.includes('-SG')) detectedCode = 'SG';
        else if (lang.includes('-CA')) detectedCode = 'CA';
        else if (lang.includes('-AU')) detectedCode = 'AU';
      }

      if (detectedCode) {
        setUserCountryCode(detectedCode);
      }
    } catch (e) {
      console.error('Error detecting country locally:', e);
    }

    const cached = sessionStorage.getItem('sf_country');
    if (cached) {
      setUserCountryCode(cached);
      return;
    }

    fetch('/api/country')
      .then(res => res.json())
      .then(data => {
        if (data && data.country) {
          const code = data.country.toUpperCase();
          sessionStorage.setItem('sf_country', code);
          setUserCountryCode(code);
        }
      })
      .catch(err => console.error('Error fetching country from API:', err));
  }, []);

  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => (prevIndex + newDirection + movies.length) % movies.length);
    setIsPlayingTrailer(false);
    setHasStartedTrailerOnce(false);
    setIsManualPlay(false);
    setIsMuted(true);
  }, [movies.length]);

  // Viewport Observer

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
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

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    if (isPlayingTrailer) return;

    const interval = setInterval(() => {
      paginate(1);
    }, 8000);

    return () => clearInterval(interval);
  }, [currentIndex, isPlayingTrailer, paginate]);


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {

  /*
   * ============================================================
   * EVENT HANDLERS
   * ============================================================
   */
    const handleVisibilityChange = () => {
      // If the user comes back to the tab and the trailer was supposed to be playing,
      // briefly reset it to force YouTube to autoplay again (since YouTube pauses background tabs)
      if (!document.hidden && isPlayingTrailer) {
        setIsPlayingTrailer(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPlayingTrailer]);

  // Trailer countdown logic

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    if (isPlayingTrailer || isConfigLoading) return;

    // Clear existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Only start timer if in view, movie has a trailer, AND heroAutoplay is enabled globally
    if (isInView && movies[currentIndex]?.trailerYoutubeId && config.flags?.heroAutoplay) {
      timerRef.current = setTimeout(() => {
        setIsPlayingTrailer(true);
        setHasStartedTrailerOnce(true);
      }, 3000); // 3 seconds delay like Netflix
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, isInView, isPlayingTrailer, movies, config.flags?.heroAutoplay, isConfigLoading]);

  // Specific user request: Pause when scroll IN, Resume when scroll OUT after it has started
  const shouldActuallyPlay = isPlayingTrailer && (!isInView || !hasStartedTrailerOnce);
  // Re-interpreting user's request: "pause if scrolls back into... resume when scrolls back out"
  // This probably means a background "ambience" mode. 
  // However, standard UX is "play when in view". 
  // I will implement a "toggle" state based on isInView for the IFRAME content.
  const isVideoActive = isPlayingTrailer && !isInView; // As per specific instruction


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') paginate(-1);
      if (e.key === 'ArrowRight') paginate(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paginate]);


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    if (movies.length > 0 && currentIndex >= movies.length) {
      setCurrentIndex(0);
    }
  }, [movies.length, currentIndex]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const isVimeo = movies[currentIndex]?.trailerSite?.toLowerCase() === 'vimeo';
      if (isVimeo) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ method: 'setVolume', value: isMuted ? 1 : 0 }), '*');
      } else {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: isMuted ? 'unMute' : 'mute' }), '*');
      }
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayingTrailer) {
      setIsPlayingTrailer(false);
      setIsManualPlay(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      setIsManualPlay(true);
      setIsPlayingTrailer(true);
      setHasStartedTrailerOnce(true);
      setIsMuted(false); // Play unmuted when manually triggered
    }
  };

  if (!movies || movies.length === 0 || !movies[currentIndex]) {
    return (
      <div className="w-full h-[75vh] md:h-[90vh] bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
      </div>
    );
  }



  // Select the primary watch platform for the CTA button
  const primaryPlatform = movie?.platforms?.[0];

  // Fallback handled safely below by conditionally rendering the button.

  const getPartnerStyles = (platform: Platform) => {
    const isPartner = platform.isSponsored || (platform as any).isPartner;
    const platformName = platform.name.toLowerCase();

    if (platformName.includes('netflix')) {
      return `bg-[#E50914] text-white hover:bg-[#B80710] border-none ${isPartner ? 'shadow-[0_0_20px_rgba(229,9,20,0.4)] animate-pulse' : ''}`;
    }
    if (platformName.includes('prime') || platformName.includes('amazon')) {
      return `bg-[#00A8E8] text-white hover:bg-[#008CC2] border-none ${isPartner ? 'shadow-[0_0_20px_rgba(0,168,232,0.4)] animate-pulse' : ''}`;
    }
    if (platformName.includes('hotstar') || platformName.includes('disney')) {
      return `bg-[#1F80E0] text-white hover:bg-[#1565C0] border-none ${isPartner ? 'shadow-[0_0_20px_rgba(31,128,224,0.4)] animate-pulse' : ''}`;
    }
    if (platformName.includes('apple') || platformName.includes('itunes')) {
      return `bg-white text-black hover:bg-white/90 border-none ${isPartner ? 'shadow-[0_0_20px_rgba(255,255,255,0.1)] animate-pulse' : ''}`;
    }
    if (platformName.includes('hulu')) {
      return `bg-[#1CE783] text-black hover:bg-[#15B868] border-none ${isPartner ? 'shadow-[0_0_20px_rgba(28,231,131,0.4)] animate-pulse' : ''}`;
    }
    if (platformName.includes('hbo') || platformName.includes('max')) {
      return `bg-[#7B2CBF] text-white hover:bg-[#5A189A] border-none ${isPartner ? 'shadow-[0_0_20px_rgba(123,44,191,0.4)] animate-pulse' : ''}`;
    }
    if (platformName.includes('youtube')) {
      return `bg-[#FF0000] text-white hover:bg-[#CC0000] border-none ${isPartner ? 'shadow-[0_0_20px_rgba(255,0,0,0.4)] animate-pulse' : ''}`;
    }
    return 'glass border border-white/10 text-white hover:bg-white/10';
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0
    })
  };


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
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
          <div className="absolute inset-0 bg-black">
            <OptimizedImage
              src={movie.backdropUrl}
              alt={movie.title}
              fill
              sizes="100vw"
              priority={currentIndex === 0}
              className={`w-full h-full object-cover transition-opacity duration-1000 ${isPlayingTrailer ? 'opacity-0' : 'opacity-100'}`}
            />
            <AnimatePresence>
              {isPlayingTrailer && (
                <motion.div
                  key="trailer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0"
                >
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full scale-110 md:scale-125 pointer-events-none"
                    src={movie.trailerSite?.toLowerCase() === 'vimeo'
                      ? `https://player.vimeo.com/video/${movie.trailerYoutubeId}?autoplay=1&loop=1&muted=${isManualPlay ? 0 : 1}&background=1`
                      : `https://www.youtube.com/embed/${movie.trailerYoutubeId}?autoplay=1&mute=${isManualPlay ? 0 : 1}&controls=0&modestbranding=1&showinfo=0&rel=0&loop=1&playlist=${movie.trailerYoutubeId}&iv_load_policy=3&disablekb=1&enablejsapi=1`
                    }
                    title={movie.title}
                    frameBorder="0"
                    allow="autoplay; encrypted-media; fullscreen;"
                  />
                  {isInView && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-xs font-black tracking-[0.5em] text-white/20 uppercase">Trailer Running in Background</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute inset-0 hero-gradient" />
          </div>

          {/* Trailer Controls */}
          {movie.trailerYoutubeId && (
            <div className="absolute right-6 md:right-12 bottom-32 md:bottom-48 z-50 flex flex-col gap-4">
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full glass border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                aria-label={isPlayingTrailer ? "Stop Trailer" : "Play Trailer"}
              >
                {isPlayingTrailer ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              {isPlayingTrailer && (
                <button
                  onClick={toggleMute}
                  className="w-12 h-12 rounded-full glass border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-7xl h-full flex flex-col justify-end pb-32 md:pb-48">
            <div
              className="max-w-3xl"
            >
              <div className="flex items-center gap-3 mb-4 md:mb-6 text-xs font-bold transition-opacity duration-700">
                <span className="bg-yellow-500 text-black px-2 py-0.5 rounded shadow-lg font-black">IMDb {movie.rating}</span>
                <span className="text-white color-white uppercase tracking-widest drop-shadow-md font-bold">{movie.year} • {movie.genre[0]} • {movie.runtime}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9] text-white drop-shadow-[0_8px_32px_rgba(0,0,0,0.8)] line-clamp-2 mb-4 md:mb-6">
                {movie.title}
              </h1>

              <p className="text-white text-xs md:text-base leading-relaxed line-clamp-2 max-w-2xl font-medium drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] mb-6 md:mb-8">
                {movie.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 flex-wrap">
                {primaryPlatform && (
                  <a
                    href={resolveWatchUrl(
                      primaryPlatform.name,
                      localizeTmdbUrl(primaryPlatform.watchUrls?.[userCountryCode] || primaryPlatform.watchUrls?.['IN'] || primaryPlatform.watchUrl, userCountryCode),
                      affiliateLinks
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto"
                  >
                    <Button
                      className={`w-full sm:w-auto font-bold text-xs md:text-[13px] tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 uppercase gap-2 ${getPartnerStyles(primaryPlatform)}`}
                    >
                      <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" /> WATCH ON {primaryPlatform.name}
                    </Button>
                  </a>
                )}



                <Link href={`/movie/${movie.id}${movie.type ? `?type=${movie.type}` : ''}`} className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto font-bold text-xs md:text-[13px] tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 uppercase gap-2 glass border-0"
                  >
                    VIEW DETAILS
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Indicators */}
      <div className="absolute bottom-12 md:bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center">
        {movies.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => {
              setDirection(i > currentIndex ? 1 : -1);
              setCurrentIndex(i);
              setIsPlayingTrailer(false);
              setHasStartedTrailerOnce(false);
            }}
            className="p-3"
          >
            <div className={`h-1.5 transition-all rounded-full ${i === currentIndex ? 'w-10 bg-brand' : 'w-2 bg-white/20 hover:bg-white/40'}`} />
          </button>
        ))}
      </div>
    </section>
  );
}
