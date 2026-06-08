'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Clock, Calendar, MapPin, ChevronLeft, ChevronRight, Share2, Info, Bookmark, Check, Play, Pause, Loader2, Pencil, Sparkles, Zap, Flame, Crown, PawPrint } from 'lucide-react';
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
import { getAffiliateLinks, resolveWatchUrl, AffiliateLinks } from '@/services/affiliateService';
import Pagination from '@/components/ui/pagination';
import { OptimizedImage, OptimizedIframe } from '@/components/ui/optimized-media';

const localizeTmdbUrl = (url: string, countryCode: string): string => {
  if (!url || !url.includes('themoviedb.org')) return url;
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set('region', countryCode);
    return parsedUrl.toString();
  } catch (e) {
    return url;
  }
};

const ACTOR_THEMES: Record<string, { icon: any, colorClass: string, glowClass: string, borderClass: string, bgClass: string }> = {
  "Pawan Kalyan": {
    icon: Zap,
    colorClass: "text-blue-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]",
    borderClass: "hover:border-blue-500/40",
    bgClass: "group-hover:to-blue-500/10"
  },
  "N.T. Rama Rao Jr.": {
    icon: PawPrint,
    colorClass: "text-orange-500",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]",
    borderClass: "hover:border-orange-500/40",
    bgClass: "group-hover:to-orange-500/10"
  },
  "Rajinikanth": {
    icon: Star,
    colorClass: "text-yellow-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]",
    borderClass: "hover:border-yellow-500/40",
    bgClass: "group-hover:to-yellow-500/10"
  },
  "Allu Arjun": {
    icon: Sparkles,
    colorClass: "text-rose-500",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]",
    borderClass: "hover:border-rose-500/40",
    bgClass: "group-hover:to-rose-500/10"
  },
  "Mahesh Babu": {
    icon: Star,
    colorClass: "text-yellow-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]",
    borderClass: "hover:border-yellow-500/40",
    bgClass: "group-hover:to-yellow-500/10"
  },
  "Ram Charan": {
    icon: Zap,
    colorClass: "text-cyan-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]",
    borderClass: "hover:border-cyan-500/40",
    bgClass: "group-hover:to-cyan-500/10"
  },
  "Prabhas": {
    icon: Flame,
    colorClass: "text-red-500",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]",
    borderClass: "hover:border-red-500/40",
    bgClass: "group-hover:to-red-500/10"
  },
  "Chiranjeevi": {
    icon: Star,
    colorClass: "text-amber-500",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]",
    borderClass: "hover:border-amber-500/40",
    bgClass: "group-hover:to-amber-500/10"
  },
  "Vijay": {
    icon: Sparkles,
    colorClass: "text-purple-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]",
    borderClass: "hover:border-purple-500/40",
    bgClass: "group-hover:to-purple-500/10"
  },
  "Ajith Kumar": {
    icon: Sparkles,
    colorClass: "text-zinc-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(161,161,170,0.3)]",
    borderClass: "hover:border-zinc-500/40",
    bgClass: "group-hover:to-zinc-500/10"
  },
  "Yash": {
    icon: Flame,
    colorClass: "text-yellow-500",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]",
    borderClass: "hover:border-yellow-500/40",
    bgClass: "group-hover:to-yellow-500/10"
  },
  "Shah Rukh Khan": {
    icon: Crown,
    colorClass: "text-yellow-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(250,204,21,0.3)]",
    borderClass: "hover:border-yellow-400/40",
    bgClass: "group-hover:to-yellow-400/10"
  },
  "Salman Khan": {
    icon: Sparkles,
    colorClass: "text-blue-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(96,165,250,0.3)]",
    borderClass: "hover:border-blue-400/40",
    bgClass: "group-hover:to-blue-400/10"
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

const UserScore = ({ rating }: { rating: number }) => {
  const percentage = Math.round(rating * 10);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let strokeColor = '#21d07a'; // Green
  let trackColor = '#204529';
  let glowColor = 'drop-shadow-[0_0_8px_rgba(33,208,122,0.4)]';
  
  if (percentage < 70 && percentage > 0) {
    strokeColor = '#d2d531'; // Yellow
    trackColor = '#423d0f';
    glowColor = 'drop-shadow-[0_0_8px_rgba(210,213,49,0.4)]';
  }
  if (percentage < 40 && percentage > 0) {
    strokeColor = '#db2360'; // Red
    trackColor = '#571435';
    glowColor = 'drop-shadow-[0_0_8px_rgba(219,35,96,0.4)]';
  }
  if (percentage === 0) {
    strokeColor = '#666666';
    trackColor = '#222222';
    glowColor = '';
  }

  return (
    <div className={`relative flex items-center justify-center w-[52px] h-[52px] bg-black/80 rounded-full shrink-0 border border-white/5 ${glowColor} transition-transform hover:scale-105 cursor-default`}>
      <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
        <circle
          cx="26"
          cy="26"
          r={radius}
          stroke={trackColor}
          strokeWidth="3.5"
          fill="transparent"
        />
        {percentage > 0 && (
          <circle
            cx="26"
            cy="26"
            r={radius}
            stroke={strokeColor}
            strokeWidth="3.5"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center z-10 text-white font-black">
        {percentage > 0 ? (
          <div className="flex items-start justify-center ml-[2px]">
            <span className="text-[13px] leading-none">{percentage}</span>
            <span className="text-[7px] leading-none opacity-70">%</span>
          </div>
        ) : (
          <span className="text-[11px] text-white/80">NR</span>
        )}
      </div>
    </div>
  );
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
  const [showAllCast, setShowAllCast] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const reviewSectionRef = useRef<HTMLDivElement>(null);
  const reviewTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const localScrollRef = useRef<HTMLDivElement>(null);
  const otherScrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftState = useRef(0);
  
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
      if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);
    };
  }, []);

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
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLinks>({});

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
        if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
        shareTimerRef.current = setTimeout(() => setIsShared(false), 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Find the primary watch platform (prioritizing partner platforms)
  const primaryPlatform = (() => {
    if (!movie || !movie.platforms || movie.platforms.length === 0) {
      return null;
    }
    const partner = movie.platforms.find(p => p.isSponsored || (p as any).isPartner);
    return partner || movie.platforms[0];
  })();

  const currentYear = new Date().getFullYear();
  const isUpcomingOrNew = movie ? movie.year >= currentYear : false;
  
  // Check if movie is currently in theaters (released in the last 60 days or in the future)
  const isRunningInTheaters = (() => {
    if (!movie || !movie.releaseDate || movie.type === 'tv') return false;
    const releaseTime = new Date(movie.releaseDate).getTime();
    const now = new Date().getTime();
    const daysSinceRelease = (now - releaseTime) / (1000 * 3600 * 24);
    // Let's assume a movie is in theaters if it released within the last 60 days or is upcoming
    return daysSinceRelease > -365 && daysSinceRelease < 60;
  })();

  const hideWatchSection = isUpcomingOrNew && !primaryPlatform && !isRunningInTheaters;

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
              {isRunningInTheaters && (
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(movie.title + " movie showtimes near me")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <button className="w-full py-2.5 md:py-3.5 rounded-md font-black tracking-widest transition-all uppercase text-xs md:text-[13px] bg-brand text-black hover:bg-brand/80 shadow-[0_4px_20px_rgba(219,35,96,0.3)] flex items-center justify-center gap-2">
                    🎟️ Get Tickets & Showtimes
                  </button>
                </a>
              )}

              {!hideWatchSection && primaryPlatform ? (
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
              ) : !hideWatchSection && !isRunningInTheaters ? (
                <button disabled className="w-full py-2.5 md:py-3.5 rounded-md font-black tracking-widest uppercase text-xs md:text-[13px] bg-white/5 text-white/30 border border-white/5 cursor-not-allowed">
                  UNAVAILABLE TO STREAM
                </button>
              ) : null}
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
                {movie.originalLanguage && (
                  <span className="px-2 md:px-3 py-1 rounded bg-black/60 border border-white/10 text-[8px] md:text-[10px] font-black text-brand uppercase tracking-widest">
                    {movie.originalLanguage}
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

              <div className="flex flex-wrap items-center gap-5 md:gap-8 text-white/90 mb-6 md:mb-8 pb-6 md:pb-8 border-b border-white/10 uppercase text-[11px] md:text-[13px] font-black tracking-widest drop-shadow-md">
                <div className="flex items-center gap-4 md:gap-6">
                  <UserScore rating={movie.rating} />
                  <div className="flex items-center gap-2 border-l border-white/20 pl-4 md:pl-6 leading-none h-6">
                    <span className="bg-[#F5C518] text-black px-2.5 py-1 rounded-md shadow-[0_2px_12px_rgba(245,197,24,0.3)]">IMDb {displayedRating}</span>
                    {userRating && <span className="text-brand ml-2">(Voted {userRating})</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 border-l border-white/20 pl-4 md:pl-6 leading-none h-6">
                  <span>{movie.year}</span>
                </div>
                <div className="flex items-center gap-2 border-l border-white/20 pl-4 md:pl-6 leading-none h-6">
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

              {/* Crew Carousel */}
              {movie.crew && movie.crew.length > 0 && (
                <div className="mb-4 md:mb-6">
                  <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-3 md:mb-4 flex items-center gap-2">
                    <span className="w-1 h-3 bg-brand"></span> DIRECTOR
                  </h3>
                  <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {movie.crew.map((member, i) => {
                      const hasImage = member.imageUrl && !member.imageUrl.includes('placehold.co');
                      const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      return (
                        <Link key={i} href={`/cast/${member.id}-${member.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="flex-none w-[28vw] max-w-[100px] md:w-[120px] md:max-w-none snap-start bg-white/5 rounded-xl p-2.5 md:p-3 border border-white/5 hover:border-brand/30 hover:bg-white/10 transition-all flex flex-col items-center text-center group cursor-pointer shadow-xl">
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden mb-2 border border-white/10 group-hover:border-brand transition-all shadow-lg shrink-0 flex items-center justify-center bg-white/10 text-white/50 font-black text-xs md:text-sm">
                            {hasImage ? (
                              <Image
                                src={member.imageUrl}
                                alt={member.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all scale-110 group-hover:scale-100"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>
                          <p className="text-[9px] md:text-[11px] font-bold text-white uppercase tracking-tight leading-tight mb-0.5 drop-shadow-md line-clamp-2">{member.name}</p>
                          <p className="text-[7px] md:text-[8px] uppercase tracking-widest text-brand font-black line-clamp-1">{member.role}</p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cast Grid */}
              <div className="mb-12 md:mb-16">
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-4 md:mb-6 flex items-center gap-2">
                  <span className="w-1 h-3 bg-brand"></span> PRINCIPAL CAST
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {(showAllCast ? movie.cast : movie.cast.slice(0, 4)).map((actor, i) => {
                    const hasImage = actor.imageUrl && !actor.imageUrl.includes('placehold.co');
                    const initials = actor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    
                    const theme = ACTOR_THEMES[actor.name];
                    const glowClass = theme ? theme.glowClass : "shadow-lg hover:shadow-[0_0_15px_rgba(var(--brand-color-rgb),0.15)]";
                    const borderClass = theme ? theme.borderClass : "hover:border-brand/40";
                    const bgClass = theme ? theme.bgClass : "group-hover:to-brand/5";
                    const Icon = theme?.icon;
                    
                    return (
                    <Link key={i} href={`/cast/${actor.id}-${actor.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className={`flex items-center gap-3 md:gap-4 group cursor-pointer bg-[#151515] p-2.5 md:p-3 rounded-xl md:rounded-2xl hover:bg-[#1a1a1a] transition-all border border-[#222] relative overflow-hidden ${borderClass} ${glowClass}`}>
                      <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${bgClass}`} />
                      
                      {theme && Icon && (
                        <div className="absolute top-1/2 -translate-y-1/2 -right-4 md:-right-8 opacity-10 group-hover:opacity-30 transition-opacity pointer-events-none transform scale-110 group-hover:scale-125 duration-700">
                          <Icon className={`w-28 h-28 md:w-36 md:h-36 ${theme.colorClass} drop-shadow-2xl`} strokeWidth={1} />
                        </div>
                      )}

                      <div className={`relative w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden shrink-0 border border-white/5 transition-all bg-black/40 flex items-center justify-center text-white/40 font-black text-xs md:text-sm z-10 ${theme ? theme.borderClass : 'group-hover:border-brand/50'}`}>
                        {hasImage ? (
                          <Image
                            src={actor.imageUrl}
                            alt={actor.name}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover grayscale transition-transform duration-700 scale-100 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      <div className="relative min-w-0 flex flex-col justify-center flex-1 z-10">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs md:text-sm font-black text-[#f0f0f0] uppercase tracking-tight leading-tight truncate transition-colors ${theme ? 'group-hover:' + theme.colorClass : ''}`}>{actor.name}</p>
                          {theme && Icon && <Icon className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ${theme.colorClass} drop-shadow-md`} />}
                        </div>
                        <p className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-[#dc2626] mt-0.5 truncate font-black">{actor.role}</p>
                        
                        {(actor.birthday || actor.placeOfBirth) && (
                          <div className="flex items-center gap-1.5 md:gap-2 mt-1.5 md:mt-2 text-[7px] md:text-[8px] text-[#666] uppercase tracking-widest font-black">
                            {actor.birthday && (
                              <span className="flex items-center gap-1 shrink-0"><Calendar className="w-2 h-2 md:w-2.5 md:h-2.5 text-[#555]" /> {new Date(actor.birthday).getFullYear()}</span>
                            )}
                            {actor.birthday && actor.placeOfBirth && <span className="opacity-40">•</span>}
                            {actor.placeOfBirth && (
                              <span className="flex items-center gap-1 truncate"><MapPin className="w-2 h-2 md:w-2.5 md:h-2.5 text-[#555] shrink-0" /> <span className="truncate">{actor.placeOfBirth.split(',').pop()?.trim() || actor.placeOfBirth}</span></span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  )})}
                </div>
                {movie.cast.length > 4 && (
                  <button 
                    onClick={() => setShowAllCast(!showAllCast)}
                    className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs md:text-sm font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 text-white/60 hover:text-white"
                  >
                    {showAllCast ? 'Show Less' : `Show All Cast (${movie.cast.length})`}
                  </button>
                )}
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
                              if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);
                              reviewTimerRef.current = setTimeout(() => setReviewSuccess(false), 3000);
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
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center font-black text-brand text-xs uppercase shadow-md relative">
                              {rev.userPhoto ? (
                                <Image src={rev.userPhoto} fill sizes="40px" className="object-cover" alt={rev.userName} />
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
              {!hideWatchSection && (
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
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
