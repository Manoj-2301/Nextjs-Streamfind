'use client';

import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Clock, Calendar, ChevronLeft, Share2, Info, Bookmark, Check, Play, Pause, Loader2 } from 'lucide-react';
import WatchProviderCard from '@/components/ui/watch-provider-card';
import ErrorMessage from '@/components/ui/error-message';
import Link from 'next/link';
import { useWatchlist } from '@/context/WatchlistContext';
import { useRatings } from '@/context/RatingContext';
import { useState, useEffect, useRef } from 'react';
import { getMovieDetails } from '@/services/tmdbService';
import { Movie } from '@/types';

export default function MovieDetails() {
  const params = useParams<{ id: string }>(); const id = params.id;
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { setUserRating, getUserRating } = useRatings();
  const [isShared, setIsShared] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const togglePlay = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const func = isPlaying ? 'pauseVideo' : 'playVideo';
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(false);
      try {
        const details = await getMovieDetails(Number(id));
        setMovie(details);
      } catch (err) {
        console.error('Error fetching details:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

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
    return 'bg-brand text-white hover:bg-red-700 shadow-[0_0_20px_rgba(229,9,20,0.4)] border-none';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
        <p className="text-white/40 font-black tracking-[0.4em] uppercase text-xs">Loading Cinema...</p>
      </div>
    );
  }

  if (error || !movie) {
    return <div className="pt-20"><ErrorMessage message="The movie you are looking for doesn't exist or could not be loaded." /></div>;
  }

  const saved = movie ? isInWatchlist(movie.id) : false;
  const userRating = movie ? getUserRating(movie.id) : 0;

  // Calculate a mock average based on IMDb + user rating (scaled to 10 for consistency)
  const displayedRating = (movie && userRating)
    ? ((movie.rating + (userRating * 2)) / 2).toFixed(1)
    : movie?.rating;

  const toggleWatchlist = () => {
    if (saved) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist(movie);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `StreamFind: ${movie.title}`,
      text: `Check out ${movie.title} on StreamFind!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pb-20"
    >

      {/* Backdrop Section */}
      <div className="relative w-full h-[40vh] md:h-[70vh] overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          {movie.trailerYoutubeId ? (
            <motion.div
              key="trailer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full relative"
            >
              {/* <iframe
                className="w-full h-full scale-110 md:scale-125 pointer-events-none"
                src={`https://www.youtube.com/embed/${movie.trailerYoutubeId}?autoplay=1&mute=0&controls=0&modestbranding=1&showinfo=0&rel=0&loop=1&playlist=${movie.trailerYoutubeId}&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=${window.location.origin}`}
                title={movie.title}
                frameBorder="0"
                allow="autoplay; encrypted-media;fullscreen;"
                referrerPolicy="no-referrer"
              /> */}
              <iframe
                ref={iframeRef}
                className={`w-full h-full scale-110 md:scale-125 pointer-events-none transition-opacity duration-1000 opacity-60 grayscale-[0.3]`}
                src={`https://www.youtube.com/embed/${movie.trailerYoutubeId}?autoplay=1&mute=1&controls=0&modestbranding=1&showinfo=0&rel=0&loop=1&playlist=${movie.trailerYoutubeId}&iv_load_policy=3&disablekb=1&enablejsapi=1`}
                title={movie.title}
                frameBorder="0"
                allow="autoplay; encrypted-media; fullscreen;"
              />
              {/* Overlay to ensure readability and standard cinema look */}
              {/* <div className="absolute inset-0 bg-black/20" /> */}
            </motion.div>
          ) : (
            <motion.img
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={movie.backdropUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {movie.trailerYoutubeId && (
          <button
            onClick={togglePlay}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 md:w-20 md:h-20 rounded-full glass flex items-center justify-center hover:opacity-100 hover:bg-white/20 transition-all text-white border border-white/20 shadow-2xl ${isPlaying ? 'opacity-30' : 'opacity-100 bg-white/10'}`}
            title={isPlaying ? "Pause Trailer" : "Play Trailer"}
          >
            {isPlaying ? <Pause className="w-8 h-8 md:w-10 md:h-10" /> : <Play className="w-8 h-8 md:w-10 md:h-10 ml-1 md:ml-2" />}
          </button>
        )}

        <div className="absolute top-4 md:top-8 left-4 md:left-12 flex gap-3 md:gap-4">
          <Link href="/" className="w-10 h-10 md:w-12 md:h-12 rounded-full glass flex items-center justify-center hover:bg-brand hover:text-black transition-all group">
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="relative">
            <button
              onClick={handleShare}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-all"
              title="Share Movie"
            >
              <Share2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <AnimatePresence>
              {isShared && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="absolute left-1/2 -translate-x-1/2 -bottom-10 bg-brand text-white px-3 py-1 rounded text-[10px] font-bold whitespace-nowrap shadow-lg"
                >
                  LINK COPIED!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-12 max-w-7xl -mt-20 md:-mt-40 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Poster Column */}
          <div className="w-48 md:w-80 shrink-0 mx-auto md:mx-0">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            >
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full h-auto aspect-[2/3] object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            <div className="mt-6 md:mt-8 flex flex-col gap-3 md:gap-4">
              {movie.platforms?.find(p => p.isSponsored) ? (
                <a
                  href={movie.platforms.find(p => p.isSponsored)?.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className={`w-full py-2.5 md:py-3.5 rounded-md font-black tracking-widest transition-all uppercase text-xs md:text-[13px] ${getPartnerStyles(movie.platforms.find(p => p.isSponsored)?.name || '')}`}>
                    WATCH ON {movie.platforms.find(p => p.isSponsored)?.name}
                  </button>
                </a>
              ) : (
                <button className="w-full py-2.5 md:py-3.5 rounded-md bg-white/10 text-white font-black tracking-widest hover:bg-white/20 transition-all uppercase text-xs md:text-[13px] border border-white/10">
                  GET TICKETS
                </button>
              )}
              <button
                onClick={toggleWatchlist}
                className={`w-full py-2.5 md:py-3.5 rounded-md font-bold border transition-all uppercase text-xs md:text-[13px] tracking-widest flex items-center justify-center gap-2 ${saved ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
              >
                {saved ? <><Check className="w-4 h-4" /> IN WATCHLIST</> : <><Bookmark className="w-4 h-4" /> ADD TO LIST</>}
              </button>
              <button
                onClick={handleShare}
                className="w-full py-2.5 md:py-3.5 rounded-md font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all uppercase text-xs md:text-[13px] tracking-widest flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> SHARE MOVIE
              </button>
            </div>
          </div>

          {/* Details Column */}
          <div className="flex-1">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {movie.genre.map(g => (
                  <span key={g} className="px-2 md:px-3 py-1 rounded bg-black/60 border border-white/10 text-[8px] md:text-[10px] font-black text-brand uppercase tracking-widest">
                    {g}
                  </span>
                ))}
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-6xl font-black text-white mb-2 leading-none uppercase tracking-tighter sm:tracking-tight md:tracking-tighter">
                {movie.title}
              </h1>

              {movie.tagline && (
                <p className="text-sm md:text-xl text-white/40 font-medium tracking-tight mb-6 md:mb-8">
                  {movie.tagline}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-white/60 mb-6 md:mb-8 pb-6 md:pb-8 border-b border-white/5 uppercase text-[10px] md:text-xs font-black tracking-widest">
                <div className="flex items-center gap-2">
                  <span className="bg-yellow-500 text-black px-2 py-0.5 rounded">IMDb {displayedRating}</span>
                  {userRating && <span className="text-brand">(Voted {userRating})</span>}
                </div>
                <div className="flex items-center gap-2 border-l border-white/10 pl-4 md:pl-6 leading-none h-3">
                  <span>{movie.year}</span>
                </div>
                <div className="flex items-center gap-2 border-l border-white/10 pl-4 md:pl-6 leading-none h-3">
                  <span>{movie.runtime}</span>
                </div>
              </div>

              <div className="mb-8 md:mb-12">
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-3 md:mb-4 flex items-center gap-2">
                  <span className="w-1 h-3 bg-brand"></span> OVERVIEW
                </h3>
                <p className="text-sm md:text-base text-white/70 leading-relaxed font-light max-w-3xl">
                  {movie.description}
                </p>
              </div>

              {/* Cast Grid */}
              <div className="mb-12 md:mb-16">
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-4 md:mb-6 flex items-center gap-2">
                  <span className="w-1 h-3 bg-brand"></span> PRINCIPAL CAST
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {movie.cast.map((actor, i) => (
                    <Link key={i} href={`/cast/${actor.id}-${actor.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="flex items-center gap-2.5 md:gap-4 group cursor-pointer bg-white/5 p-2 md:p-3 rounded-lg md:rounded-xl hover:bg-white/10 transition-all border border-white/5 hover:border-brand/30">
                      <div className="w-10 h-10 md:w-16 md:h-16 rounded-full overflow-hidden shrink-0 border border-white/10 group-hover:border-brand transition-all shadow-xl">
                        <img
                          src={actor.imageUrl}
                          alt={actor.name}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all scale-110 group-hover:scale-100"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0 flex flex-col justify-center">
                        <p className="text-xs md:text-base font-black text-white uppercase tracking-tight leading-tight truncate drop-shadow-md">{actor.name}</p>
                        <p className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] text-white/40 mt-1 truncate">{actor.role}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Trailer Section */}
              {movie.trailerYoutubeId && (
                <div className="mb-12 md:mb-16">
                  <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                    <span className="w-1 h-3 bg-brand"></span> <Play className="w-3 h-3" /> OFFICIAL TRAILER
                  </h3>
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                    <iframe
                      src={`https://www.youtube.com/embed/${movie.trailerYoutubeId}?autoplay=0&rel=0&enablejsapi=1&origin=${window.location.origin}`}
                      title={`${movie.title} Trailer`}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}

              {/* Rating Section */}
              <div className="mb-12 md:mb-16">
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                  <span className="w-1 h-3 bg-brand"></span> RATE THIS MOVIE (5 STARS)
                </h3>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setUserRating(movie.id, star, { title: movie.title, posterUrl: movie.posterUrl })}
                      className="transition-transform hover:scale-125"
                    >
                      <Star
                        className={`w-8 h-8 md:w-10 md:h-10 transition-colors ${star <= (hoverRating ?? userRating ?? 0)
                          ? 'text-yellow-500 fill-current'
                          : 'text-white/10'
                          }`}
                      />
                    </button>
                  ))}
                  <span className="ml-4 text-3xl font-black text-white/20 italic">
                    {(hoverRating ?? userRating ?? '—')} / 5
                  </span>
                </div>
              </div>

              {/* Where to Watch Section */}
              <div className="bg-surface/30 rounded-xl p-6 md:p-10 border border-white/5">
                <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-brand mb-8 md:mb-10 flex items-center gap-3">
                  <span className="w-3 md:w-4 h-0.5 bg-brand"></span> WHERE TO WATCH
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {[...(movie.platforms || [])].sort((a, b) => (b.isSponsored ? 1 : 0) - (a.isSponsored ? 1 : 0)).map((p, i) => (
                    <WatchProviderCard key={i} platform={p} />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
