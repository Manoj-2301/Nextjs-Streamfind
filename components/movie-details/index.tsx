'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Clock, Calendar, ChevronLeft, ChevronRight, Share2, Info, Bookmark, Check, Play, Pause, Loader2, Pencil } from 'lucide-react';
import WatchProviderCard from '@/components/ui/watch-provider-card';
import ErrorMessage from '@/components/ui/error-message';
import Link from 'next/link';
import Image from 'next/image';
import { useWatchlist } from '@/context/WatchlistContext';
import { useRatings } from '@/context/RatingContext';
import { useState, useEffect, useRef } from 'react';
import { getMovieDetails, getMovieReviews, CriticReview } from '@/services/tmdbService';
import { Movie, Platform } from '@/types';
import { app } from '@/lib/firebase';
import { collection, query, onSnapshot, collectionGroup, where , getFirestore } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { getAffiliateLinks, resolveWatchUrl } from '@/services/affiliateService';
import Pagination from '@/components/ui/pagination';
import { OptimizedImage, OptimizedIframe } from '@/components/ui/optimized-media';

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

const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  SG: 'Singapore',
  PH: 'Philippines',
  HK: 'Hong Kong',
  MY: 'Malaysia',
  ID: 'Indonesia',
  TH: 'Thailand',
  AU: 'Australia',
  NZ: 'New Zealand',
  VN: 'Vietnam',
  JP: 'Japan',
  KR: 'South Korea'
};

export default function MovieDetails({ initialMovie }: { initialMovie?: Movie }) {
  const params = useParams<{ id: string }>(); const id = params.id;
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type') as 'movie' | 'tv' | null;
  const { user } = useAuth();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { setUserRating, getUserRating, getUserReviewText } = useRatings();
  const [isShared, setIsShared] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialMovie);
  const [error, setError] = useState(false);
  const [movie, setMovie] = useState<Movie | null>(initialMovie || null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const reviewSectionRef = useRef<HTMLDivElement>(null);
  const reviewTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const localScrollRef = useRef<HTMLDivElement>(null);
  const otherScrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftState = useRef(0);

  const handleMouseDown = (ref: React.RefObject<HTMLDivElement | null>, e: React.MouseEvent) => {
    if (!ref.current) return;
    isDragging.current = true;
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollLeftState.current = ref.current.scrollLeft;
  };

  const handleMouseMove = (ref: React.RefObject<HTMLDivElement | null>, e: React.MouseEvent) => {
    if (!isDragging.current || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    ref.current.scrollLeft = scrollLeftState.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const { scrollLeft } = ref.current;
      const cardWidth = ref.current.firstElementChild?.clientWidth || 280;
      const gap = 16;
      const step = cardWidth + gap;
      const scrollTo = direction === 'left' ? scrollLeft - step : scrollLeft + step;
      ref.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const [isPlaying, setIsPlaying] = useState(true);
  const [userCountryCode, setUserCountryCode] = useState<string>('IN');
  const [affiliateLinks, setAffiliateLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    getAffiliateLinks()
      .then(links => {
        setAffiliateLinks(links);
      })
      .catch(err => console.error('Error fetching affiliate links in MovieDetails:', err));

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

    fetch('/api/country')
      .then(res => res.json())
      .then(data => {
        if (data && data.country) {
          setUserCountryCode(data.country.toUpperCase());
        }
      })
      .catch(err => console.error('Error fetching country from API:', err));
  }, []);

  // Review & Feed states
  const [reviewInput, setReviewInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const handleEditReview = () => {
    if (movie) {
      setReviewInput(getUserReviewText(movie.id) || '');
    }
    setIsEditing(true);
    setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      reviewTextAreaRef.current?.focus();
    }, 150);
  };

  const [communityReviews, setCommunityReviews] = useState<{
    userId: string;
    userName: string;
    userPhoto: string;
    rating: number;
    reviewText: string;
    isCritic?: boolean;
    isCurrentUser?: boolean;
  }[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});
  const reviewsPerPage = 4;

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
      if (initialMovie && initialMovie.id === Number(id)) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(false);
      try {
        const details = await getMovieDetails(Number(id), typeParam || undefined);
        setMovie(details);
      } catch (err) {
        console.error('Error fetching details:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [id, typeParam, initialMovie]);

  // Load existing critique text when movie is resolved
  useEffect(() => {
    if (movie) {
      setReviewInput(getUserReviewText(movie.id) || '');
    }
  }, [movie, getUserReviewText]);

  // Track genre view when movie is loaded
  useEffect(() => {
    if (movie && movie.genre) {
      import('@/lib/genreTracker').then(({ trackGenreView }) => {
        trackGenreView(movie.genre);
      });
    }
  }, [movie]);

  // Real-time listener for community reviews + fallback to TMDB critics
  useEffect(() => {
    if (!id) return;

    // 1. Subscribe to Firestore community reviews using collection group query under user ratings
    const q = query(collectionGroup(getFirestore(app), 'ratings'), where('movieId', '==', Number(id)));

    let unsubscribeFirestore = () => { };

    const loadAllReviews = async () => {
      // 2. Fetch TMDB critic reviews
      let tmdbReviews: CriticReview[] = [];
      try {
        tmdbReviews = await getMovieReviews(Number(id), typeParam || undefined);
      } catch (e) {
        console.error("Error fetching TMDB reviews:", e);
      }

      unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const firestoreList: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.reviewText) {
            firestoreList.push({
              userId: data.userId || docSnap.ref.parent.parent?.id || 'anonymous',
              userName: data.userName || 'Anonymous Film Buff',
              userPhoto: data.userPhoto || '',
              rating: data.rating || 5,
              reviewText: data.reviewText,
              isCritic: false
            });
          }
        });

        // Map TMDB critic reviews to matching structure
        const mappedCritics = tmdbReviews.map((r, idx) => ({
          userId: `critic-${idx}`,
          userName: r.author,
          userPhoto: '',
          rating: 5,
          reviewText: r.content,
          isCritic: true
        }));

        // Combine feeds: custom community first, followed by professional critics
        setCommunityReviews([...firestoreList, ...mappedCritics]);
      }, (err) => {
        console.warn("Firestore reviews subscription failed (please update security rules in Firebase Console). Falling back to TMDB reviews only.", err);
        // Fall back gracefully to TMDB critic reviews only
        const mappedCritics = tmdbReviews.map((r, idx) => ({
          userId: `critic-${idx}`,
          userName: r.author,
          userPhoto: '',
          rating: 5,
          reviewText: r.content,
          isCritic: true
        }));
        setCommunityReviews(mappedCritics);
      });
    };

    loadAllReviews();

    return () => {
      unsubscribeFirestore();
    };
  }, [id, typeParam]);

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

    return isPartner
      ? 'bg-brand text-white hover:bg-red-700 shadow-[0_0_20px_rgba(229,9,20,0.4)] border-none animate-pulse'
      : 'bg-white/10 text-white hover:bg-white/20 border border-white/10';
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

  const localPlatforms = movie ? [...(movie.platforms || [])]
    .filter(p => p.countries?.includes(userCountryCode))
    .sort((a, b) => (b.isSponsored ? 1 : 0) - (a.isSponsored ? 1 : 0)) : [];

  const otherPlatforms = movie ? [...(movie.platforms || [])]
    .filter(p => !p.countries?.includes(userCountryCode))
    .sort((a, b) => (b.isSponsored ? 1 : 0) - (a.isSponsored ? 1 : 0)) : [];

  const [localScrollStatus, setLocalScrollStatus] = useState({ canScrollLeft: false, canScrollRight: true });
  const [otherScrollStatus, setOtherScrollStatus] = useState({ canScrollLeft: false, canScrollRight: true });

  const updateScrollStatus = (ref: React.RefObject<HTMLDivElement | null>, setStatus: Function) => {
    if (ref.current) {
      const { scrollLeft, scrollWidth, clientWidth } = ref.current;
      setStatus({
        canScrollLeft: scrollLeft > 0,
        canScrollRight: Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1
      });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      updateScrollStatus(localScrollRef, setLocalScrollStatus);
      updateScrollStatus(otherScrollRef, setOtherScrollStatus);
    };
    
    const timer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [localPlatforms.length, otherPlatforms.length]);

  // Filter out our own review from the community feed to avoid duplicate rendering,
  // then prepend our latest review if it exists so it's always at the top!
  const displayedReviews = (() => {
    let list = [...communityReviews];
    if (user && movie) {
      list = list.filter(r => r.userId !== user.uid);
      const userReviewText = getUserReviewText(movie.id);
      const userRatingVal = getUserRating(movie.id);
      if (userReviewText) {
        list.unshift({
          userId: user.uid,
          userName: user.displayName || user.email?.split('@')[0] || 'You',
          userPhoto: user.photoURL || '',
          rating: userRatingVal || 5,
          reviewText: userReviewText,
          isCritic: false,
          isCurrentUser: true
        });
      }
    }
    return list;
  })();

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

  // Find the primary watch platform (prioritizing partner platforms)
  const primaryPlatform = (() => {
    if (!movie || !movie.platforms || movie.platforms.length === 0) {
      return {
        name: 'Netflix',
        logo: 'https://image.tmdb.org/t/p/original/9A1eGgyqbOI46UrG58Z3rRgyv4q.jpg',
        watchUrl: 'https://www.netflix.com',
      };
    }
    const partner = movie.platforms.find(p => p.isSponsored || (p as any).isPartner);
    return partner || movie.platforms[0];
  })();

  return (
    <div className="pb-20">

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
                src={`https://www.youtube.com/embed/${movie.trailerYoutubeId}?autoplay=1&mute=0&controls=0&modestbranding=1&showinfo=0&rel=0&loop=1&playlist=${movie.trailerYoutubeId}&iv_load_policy=3&disablekb=1&enablejsapi=1`}
                title={movie.title}
                frameBorder="0"
                allow="autoplay; encrypted-media;fullscreen;"
                referrerPolicy="no-referrer"
              /> */}
              <OptimizedIframe
                className={`w-full h-full scale-110 md:scale-125 pointer-events-none transition-opacity duration-1000 opacity-60 grayscale-[0.3]`}
                src={movie.trailerSite?.toLowerCase() === 'vimeo'
                  ? `https://player.vimeo.com/video/${movie.trailerYoutubeId}?autoplay=1&loop=1&muted=1&background=1`
                  : `https://www.youtube-nocookie.com/embed/${movie.trailerYoutubeId}?autoplay=1&mute=1&controls=0&modestbranding=1&showinfo=0&rel=0&loop=1&playlist=${movie.trailerYoutubeId}&iv_load_policy=3&disablekb=1&enablejsapi=1`
                }
                title={movie.title}
                frameBorder="0"
                allow="autoplay; encrypted-media; fullscreen;"
              />
              {/* Overlay to ensure readability and standard cinema look */}
              {/* <div className="absolute inset-0 bg-black/20" /> */}
            </motion.div>
          ) : (
            <OptimizedImage
              key="backdrop"
              src={movie.backdropUrl}
              alt={movie.title}
              fill
              sizes="100vw"
              priority={true}
              className="object-cover"
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
            <div className="rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative w-full aspect-[2/3]">
              <OptimizedImage
                src={movie.posterUrl}
                alt={movie.title}
                fill
                sizes="(max-width: 768px) 192px, 320px"
                priority={true}
                className="object-cover"
              />
            </div>

            <div className="mt-6 md:mt-8 flex flex-col gap-3 md:gap-4">
              <a
                href={resolveWatchUrl(
                  primaryPlatform.name,
                  localizeTmdbUrl(primaryPlatform.watchUrls?.[userCountryCode] || primaryPlatform.watchUrls?.['IN'] || primaryPlatform.watchUrl, userCountryCode),
                  affiliateLinks
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className={`w-full py-2.5 md:py-3.5 rounded-md font-black tracking-widest transition-all uppercase text-xs md:text-[13px] ${getPartnerStyles(primaryPlatform)}`}>
                  WATCH ON {primaryPlatform.name}
                </button>
              </a>
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
                {movie.rating >= 7.5 && (
                  <span className="px-2.5 md:px-3 py-1 rounded-full bg-brand/90 border border-brand/50 text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1 shadow-[0_4px_12px_rgba(255,40,78,0.25)] animate-pulse">
                    <span>🍿</span>
                    <span>Binge Worthy</span>
                  </span>
                )}
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
                        <Image
                          src={actor.imageUrl}
                          alt={actor.name}
                          width={64}
                          height={64}
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
                      src={movie.trailerSite?.toLowerCase() === 'vimeo'
                        ? `https://player.vimeo.com/video/${movie.trailerYoutubeId}?autoplay=0`
                        : `https://www.youtube-nocookie.com/embed/${movie.trailerYoutubeId}?autoplay=0&rel=0&enablejsapi=1`
                      }
                      title={`${movie.title} Trailer`}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}

              {/* Interactive Rate & Review Section */}
              {(!getUserReviewText(movie.id) || isEditing) && (
                <div ref={reviewSectionRef} className="mb-12 md:mb-16 bg-surface/30 rounded-2xl p-6 md:p-8 border border-white/5 animate-reveal">
                  <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                    <span className="w-1 h-3 bg-brand"></span> RATE & WRITE A REVIEW
                  </h3>

                  {/* Star Rating Selector */}
                  <div className="flex items-center gap-3 mb-6">
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
                    <span className="ml-4 text-2xl font-black text-white/20 italic">
                      {(hoverRating ?? userRating ?? '—')} / 5
                    </span>
                  </div>

                  {/* Critique Text Box */}
                  <div className="space-y-4">
                    <textarea
                      ref={reviewTextAreaRef}
                      value={reviewInput}
                      onChange={(e) => setReviewInput(e.target.value)}
                      placeholder={user ? "Tell other cinephiles what you thought of this masterpiece... (your thoughts will instantly sync to your Director's Notes)" : "Log in to share your written review!"}
                      disabled={!user}
                      className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm placeholder-white/30 focus:outline-none focus:border-brand/50 transition-colors resize-none font-medium disabled:opacity-40"
                    />
                    {/* Flagging Guidelines */}
                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex gap-3 items-start">
                      <Info className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Critique & Flagging Policy</p>
                        <p className="text-[10px] text-white/40 mt-1 leading-relaxed">
                          To maintain a healthy community, reviews must not contain 18+ profane words or inappropriate terms, especially for movies suitable for children. Offending reviews will be flagged and accounts may be deactivated or banned by system administrators.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                        {reviewInput.length} characters
                      </p>
                      <div className="flex items-center gap-2">
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditing(false);
                              setReviewInput('');
                            }}
                            className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs font-black uppercase tracking-widest"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          disabled={isSubmittingReview || !userRating || !user}
                          onClick={async () => {
                            setIsSubmittingReview(true);
                            try {
                              await setUserRating(movie.id, userRating || 5, { title: movie.title, posterUrl: movie.posterUrl }, reviewInput);
                              setReviewSuccess(true);
                              setIsEditing(false);
                              setTimeout(() => setReviewSuccess(false), 3000);
                            } catch (e) {
                              console.error("Error submitting review:", e);
                            } finally {
                              setIsSubmittingReview(false);
                            }
                          }}
                          className="px-6 py-2.5 rounded-lg bg-brand text-white font-black uppercase text-xs tracking-widest hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-brand/20"
                        >
                          {isSubmittingReview ? (
                            <>Saving Review...</>
                          ) : reviewSuccess ? (
                            <>✓ Saved Successfully</>
                          ) : (
                            <>Save Critique</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Community & Critic Reviews Section (Paginated 5 per page) */}
              <div className="mb-12 md:mb-16">
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                  <span className="w-1 h-3 bg-brand"></span> COMMUNITY & CRITIC REVIEWS ({displayedReviews.length})
                </h3>

                {displayedReviews.length === 0 ? (
                  <div className="p-8 bg-white/5 border border-white/5 rounded-2xl text-center">
                    <p className="text-white/40 text-sm font-medium italic">No reviews submitted yet. Be the first to critique this movie!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Paginated Reviews List */}
                    {displayedReviews
                      .slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage)
                      .map((rev, index) => {
                        const reviewKey = `${rev.userId || rev.userName}-${index}`;
                        const isExpanded = !!expandedReviews[reviewKey];
                        const isLongReview = rev.reviewText.length > 100 || rev.reviewText.includes('\n');

                        return (
                          <div key={rev.userId + '-' + index} className="p-6 bg-surface/30 border border-white/5 rounded-2xl flex gap-4 items-start hover:bg-surface/40 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center font-black text-brand text-xs uppercase shadow-md">
                              {rev.userPhoto ? (
                                <img src={rev.userPhoto} className="w-full h-full object-cover" alt={rev.userName} />
                              ) : (
                                rev.userName.slice(0, 2)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <span className="text-xs font-black uppercase text-white/80 tracking-tight block">
                                    {rev.userName} {rev.isCurrentUser && <span className="text-[9px] font-black uppercase text-brand/60 ml-1.5">(You)</span>}
                                  </span>
                                  {rev.isCritic && (
                                    <span className="text-[9px] font-black uppercase text-brand tracking-widest">
                                      Top Critic
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  {!rev.isCritic && (
                                    <div className="flex gap-0.5">
                                      {Array.from({ length: 5 }).map((_, s) => (
                                        <Star
                                          key={s}
                                          className={`w-2.5 h-2.5 ${s < rev.rating ? 'text-brand fill-brand' : 'text-white/10'}`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  {rev.isCurrentUser && (
                                    <button
                                      onClick={handleEditReview}
                                      className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand/10 hover:bg-brand/20 border border-brand/20 text-brand transition-colors text-[9px] font-black uppercase tracking-wider"
                                      title="Edit Review"
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className={`text-white/60 text-sm leading-relaxed font-medium italic whitespace-pre-wrap ${!isExpanded && isLongReview ? 'line-clamp-1' : ''}`}>
                                "{rev.reviewText}"
                              </p>
                              {isLongReview && (
                                <button
                                  onClick={() => setExpandedReviews(prev => ({ ...prev, [reviewKey]: !isExpanded }))}
                                  className="mt-2 text-[10px] font-black uppercase tracking-widest text-brand hover:text-brand/80 transition-colors"
                                >
                                  {isExpanded ? 'Show Less' : 'Show More'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {/* Compact Pagination Component */}
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(displayedReviews.length / reviewsPerPage)}
                      onPageChange={setCurrentPage}
                      size="sm"
                      disableScroll={true}
                    />
                  </div>
                )}
              </div>

              {/* Where to Watch Section */}
              <div className="bg-surface/30 rounded-xl p-6 md:p-10 border border-white/5 overflow-hidden">
                <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-brand mb-6 flex items-center gap-3">
                  <span className="w-3 md:w-4 h-0.5 bg-brand"></span> WHERE TO WATCH
                </h2>

                {localPlatforms.length > 0 && (
                  <div className="mb-8">
                    <div className="mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                        Available in {COUNTRY_NAMES[userCountryCode] || userCountryCode}
                      </span>
                    </div>
                    <div className="relative group/carousel w-full max-w-[750px] mr-auto">
                      {localPlatforms.length > 2 && (
                        <>
                          <div className="absolute -left-2 top-0 bottom-0 w-20 md:w-28 bg-gradient-to-r from-[#0c0c0c] via-[#0c0c0c]/80 to-transparent z-20 flex items-center justify-start pointer-events-none">
                            <button
                              onClick={() => scrollCarousel(localScrollRef, 'left')}
                              className={`pointer-events-auto md:-ml-2 p-2 sm:p-2.5 rounded-full bg-black/80 hover:bg-brand hover:text-black border border-white/10 text-white transition-all shadow-xl flex items-center justify-center ${localScrollStatus.canScrollLeft ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}
                              aria-label="Previous"
                            >
                              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                          <div className="absolute -right-2 top-0 bottom-0 w-20 md:w-28 bg-gradient-to-l from-[#0c0c0c] via-[#0c0c0c]/80 to-transparent z-20 flex items-center justify-end pointer-events-none">
                            <button
                              onClick={() => scrollCarousel(localScrollRef, 'right')}
                              className={`pointer-events-auto md:-mr-2 p-2 sm:p-2.5 rounded-full bg-black/80 hover:bg-brand hover:text-black border border-white/10 text-white transition-all shadow-xl flex items-center justify-center ${localScrollStatus.canScrollRight ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}
                              aria-label="Next"
                            >
                              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </>
                      )}
                      <div
                        ref={localScrollRef}
                        className="flex gap-4 overflow-x-auto py-4 px-2 -mx-2 scroll-smooth hide-scrollbar cursor-grab active:cursor-grabbing select-none w-[calc(100%+16px)] max-w-full"
                        onScroll={() => updateScrollStatus(localScrollRef, setLocalScrollStatus)}
                        onMouseDown={(e) => handleMouseDown(localScrollRef, e)}
                        onMouseMove={(e) => handleMouseMove(localScrollRef, e)}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        {localPlatforms.map((p, i) => (
                          <div key={i} className="w-[240px] sm:w-[280px] shrink-0">
                            <WatchProviderCard platform={p} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {otherPlatforms.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                        Other Regions
                      </span>
                    </div>
                    <div className="relative group/carousel w-full max-w-[750px] mr-auto">
                      {otherPlatforms.length > 2 && (
                        <>
                          <div className="absolute -left-2 top-0 bottom-0 w-20 md:w-28 bg-gradient-to-r from-[#0c0c0c] via-[#0c0c0c]/80 to-transparent z-20 flex items-center justify-start pointer-events-none">
                            <button
                              onClick={() => scrollCarousel(otherScrollRef, 'left')}
                              className={`pointer-events-auto md:-ml-2 p-2 sm:p-2.5 rounded-full bg-black/80 hover:bg-brand hover:text-black border border-white/10 text-white transition-all shadow-xl flex items-center justify-center ${otherScrollStatus.canScrollLeft ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}
                              aria-label="Previous"
                            >
                              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                          <div className="absolute -right-2 top-0 bottom-0 w-20 md:w-28 bg-gradient-to-l from-[#0c0c0c] via-[#0c0c0c]/80 to-transparent z-20 flex items-center justify-end pointer-events-none">
                            <button
                              onClick={() => scrollCarousel(otherScrollRef, 'right')}
                              className={`pointer-events-auto md:-mr-2 p-2 sm:p-2.5 rounded-full bg-black/80 hover:bg-brand hover:text-black border border-white/10 text-white transition-all shadow-xl flex items-center justify-center ${otherScrollStatus.canScrollRight ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}
                              aria-label="Next"
                            >
                              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </>
                      )}
                      <div
                        ref={otherScrollRef}
                        className="flex gap-4 overflow-x-auto py-4 px-2 -mx-2 scroll-smooth hide-scrollbar cursor-grab active:cursor-grabbing select-none w-[calc(100%+16px)] max-w-full"
                        onScroll={() => updateScrollStatus(otherScrollRef, setOtherScrollStatus)}
                        onMouseDown={(e) => handleMouseDown(otherScrollRef, e)}
                        onMouseMove={(e) => handleMouseMove(otherScrollRef, e)}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        {otherPlatforms.map((p, i) => (
                          <div key={i} className="w-[240px] sm:w-[280px] shrink-0">
                            <WatchProviderCard platform={p} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {localPlatforms.length === 0 && otherPlatforms.length === 0 && (
                  <div className="p-8 bg-white/5 border border-white/5 rounded-2xl text-center">
                    <p className="text-white/40 text-sm font-medium italic">No watch providers available.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
