'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Award, Eye, EyeOff, Settings, Star, Sparkles, Plus, Trash2, 
  ArrowUp, ArrowDown, Search, Check, Mail, Bell, Shield, Film, Share2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWatchlist } from '@/context/WatchlistContext';
import { useRatings, UserReview } from '@/context/RatingContext';
import { searchMovies } from '@/services/tmdbService';
import { Movie } from '@/types';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

// Custom Profile Fields Schema
interface ProfileSettings {
  bio: string;
  favoriteGenres: string[];
  subscriptions: string[];
  notifyNewRelease: boolean;
  notifyLeavingSoon: boolean;
  isPublic: boolean;
  avatarFrame: 'bronze' | 'silver' | 'gold' | 'platinum';
  top10: Movie[];
}

const AVAILABLE_GENRES = [
  'Action', 'Sci-Fi', 'Drama', 'Comedy', 'Thriller', 
  'Fantasy', 'Horror', 'Romance', 'Mystery', 'Adventure'
];

const STREAMING_PLATFORMS = [
  { name: 'Netflix', logo: 'https://www.edigitalagency.com.au/wp-content/uploads/Netflix-logo-red-black-png.png' },
  { name: 'Amazon Prime', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png' },
  { name: 'Disney+', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/1200px-Disney%2B_logo.svg.png' },
  { name: 'Apple TV', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Apple_TV_Plus_Logo.svg/2560px-Apple_TV_Plus_Logo.svg.png' },
];

export default function ProfileComponent() {
  const { user } = useAuth();
  const { watchlist } = useWatchlist();
  const { userReviews, setUserRating } = useRatings();

  // Profile Custom Data State
  const [profile, setProfile] = useState<ProfileSettings>({
    bio: "Passionate cinephile. Exploring hidden gems and cinematic masterpieces.",
    favoriteGenres: ['Sci-Fi', 'Thriller'],
    subscriptions: ['Netflix', 'Disney+'],
    notifyNewRelease: true,
    notifyLeavingSoon: false,
    isPublic: true,
    avatarFrame: 'bronze',
    top10: [],
  });

  const [activeTab, setActiveTab] = useState<'stats' | 'curation' | 'preferences' | 'reviews'>('stats');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState(profile.bio);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [watchlistFilter, setWatchlistFilter] = useState<'all' | 'unwatched' | 'rewatchable'>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  // Firestore Sync
  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}/profile/settings`;
    const docRef = doc(db, path);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ProfileSettings;
        setProfile(prev => ({
          ...prev,
          ...data,
          favoriteGenres: data.favoriteGenres || prev.favoriteGenres,
          subscriptions: data.subscriptions || prev.subscriptions,
          top10: data.top10 || prev.top10,
        }));
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Update bio trigger
  const handleSaveBio = async () => {
    if (!user) return;
    setIsEditingBio(false);
    try {
      const docRef = doc(db, `users/${user.uid}/profile/settings`);
      await setDoc(docRef, { bio: tempBio }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // Genre badge toggling
  const handleToggleGenre = async (genre: string) => {
    if (!user) return;
    let updatedGenres = [...profile.favoriteGenres];
    if (updatedGenres.includes(genre)) {
      updatedGenres = updatedGenres.filter(g => g !== genre);
    } else {
      updatedGenres.push(genre);
    }
    
    try {
      const docRef = doc(db, `users/${user.uid}/profile/settings`);
      await setDoc(docRef, { favoriteGenres: updatedGenres }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // Subscription toggling
  const handleToggleSub = async (platformName: string) => {
    if (!user) return;
    let updatedSubs = [...profile.subscriptions];
    if (updatedSubs.includes(platformName)) {
      updatedSubs = updatedSubs.filter(s => s !== platformName);
    } else {
      updatedSubs.push(platformName);
    }
    
    try {
      const docRef = doc(db, `users/${user.uid}/profile/settings`);
      await setDoc(docRef, { subscriptions: updatedSubs }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // Draggable top 10 mechanics
  const handleSearchTop10 = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchMovies(q);
    setSearchResults(results.slice(0, 5));
    setIsSearching(false);
  };

  const handleAddTop10 = async (movie: Movie) => {
    if (!user || profile.top10.length >= 10) return;
    if (profile.top10.some(m => m.id === movie.id)) return;
    
    const updatedTop10 = [...profile.top10, movie];
    try {
      const docRef = doc(db, `users/${user.uid}/profile/settings`);
      await setDoc(docRef, { top10: updatedTop10 }, { merge: true });
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTop10 = async (movieId: number) => {
    if (!user) return;
    const updatedTop10 = profile.top10.filter(m => m.id !== movieId);
    try {
      const docRef = doc(db, `users/${user.uid}/profile/settings`);
      await setDoc(docRef, { top10: updatedTop10 }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveTop10 = async (index: number, direction: 'up' | 'down') => {
    if (!user) return;
    const updatedTop10 = [...profile.top10];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= updatedTop10.length) return;
    
    // Swap
    const temp = updatedTop10[index];
    updatedTop10[index] = updatedTop10[targetIndex];
    updatedTop10[targetIndex] = temp;
    
    try {
      const docRef = doc(db, `users/${user.uid}/profile/settings`);
      await setDoc(docRef, { top10: updatedTop10 }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // Preference switches
  const handleTogglePref = async (field: 'notifyNewRelease' | 'notifyLeavingSoon' | 'isPublic') => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/profile/settings`);
      await setDoc(docRef, { [field]: !profile[field] }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // Review Edit trigger
  const handleSaveReviewText = async (movieId: number, text: string, rating: number) => {
    if (!user) return;
    await setUserRating(movieId, rating, undefined, text);
  };

  // Public Link copying
  const copyPublicLink = () => {
    if (typeof window === 'undefined') return;
    const link = `${window.location.origin}/profile?uid=${user?.uid}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Calculate dynamic achievement/rank avatar frame based on stats
  const ratingCount = Object.keys(userReviews).length;
  const watchCount = watchlist.length;
  const totalScore = ratingCount * 3 + watchCount;
  
  let frameColor = 'border-white/10';
  let frameTitle = 'Novice';
  let frameGlow = 'rgba(255,255,255,0.05)';
  
  if (totalScore >= 18) {
    frameColor = 'border-cyan-400 border-[3px] shadow-[0_0_15px_rgba(34,211,238,0.6)]';
    frameTitle = 'Cinematic Legend (Platinum)';
    frameGlow = 'rgba(34,211,238,0.2)';
  } else if (totalScore >= 10) {
    frameColor = 'border-yellow-400 border-[3px] shadow-[0_0_12px_rgba(250,204,21,0.5)]';
    frameTitle = 'Connoisseur (Gold)';
    frameGlow = 'rgba(250,204,21,0.15)';
  } else if (totalScore >= 5) {
    frameColor = 'border-slate-300 border-[2px] shadow-[0_0_8px_rgba(203,213,225,0.4)]';
    frameTitle = 'Cinephile (Silver)';
    frameGlow = 'rgba(203,213,225,0.1)';
  } else if (totalScore >= 1) {
    frameColor = 'border-amber-700 border-[2px]';
    frameTitle = 'Apprentice (Bronze)';
    frameGlow = 'rgba(180,83,9,0.05)';
  }

  // Aura Backdrop mapping based on first genre
  const primaryFavGenre = profile.favoriteGenres[0] || 'Default';
  let backdropGradients = 'from-brand/20 via-surface/10 to-background';
  let auraGlow = 'bg-brand/10';

  if (primaryFavGenre === 'Sci-Fi') {
    backdropGradients = 'from-purple-600/20 via-blue-900/10 to-background';
    auraGlow = 'bg-cyan-500/10';
  } else if (primaryFavGenre === 'Action') {
    backdropGradients = 'from-red-600/20 via-red-950/10 to-background';
    auraGlow = 'bg-red-500/10';
  } else if (primaryFavGenre === 'Drama') {
    backdropGradients = 'from-orange-500/20 via-orange-950/10 to-background';
    auraGlow = 'bg-orange-500/10';
  } else if (primaryFavGenre === 'Thriller') {
    backdropGradients = 'from-slate-600/20 via-purple-950/10 to-background';
    auraGlow = 'bg-violet-600/10';
  } else if (primaryFavGenre === 'Comedy') {
    backdropGradients = 'from-amber-400/20 via-yellow-950/10 to-background';
    auraGlow = 'bg-yellow-400/10';
  }

  // Taste Radar SVG Calculations
  const statsKeys = ['Sci-Fi', 'Action', 'Drama', 'Thriller', 'Comedy'];
  const baseStats = {
    'Sci-Fi': 40,
    'Action': 20,
    'Drama': 30,
    'Thriller': 15,
    'Comedy': 10
  };
  
  // Calculate dynamic stats based on actual genres of movies in watchlist
  const watchlistGenres = watchlist.flatMap(m => m.genre || []);
  const reviewGenres = userReviews.flatMap(r => {
    const movie = watchlist.find(m => m.id === r.movieId);
    return movie ? movie.genre : [];
  });
  
  const allUserGenres = [...watchlistGenres, ...reviewGenres];
  const dynamicStats: Record<string, number> = {};
  statsKeys.forEach(k => {
    const count = allUserGenres.filter(g => g.toLowerCase().includes(k.toLowerCase())).length;
    dynamicStats[k] = Math.min(20 + count * 15, 100); // base of 20, scale per movie up to 100
  });

  const center = 150;
  const radius = 100;
  
  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 / 5) * index - Math.PI / 2;
    const distance = (value / 100) * radius;
    const x = center + Math.cos(angle) * distance;
    const y = center + Math.sin(angle) * distance;
    return { x, y };
  };

  // Build SVG polygon points
  const points = statsKeys.map((k, i) => {
    const { x, y } = getCoordinates(i, dynamicStats[k] || baseStats[k as keyof typeof baseStats]);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-20">
      
      {/* 1. Identity & Visuals: Aura Backdrop */}
      <div className={`absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b ${backdropGradients} pointer-events-none z-0`} />
      <div className={`absolute top-20 right-10 w-[500px] h-[500px] rounded-full blur-[120px] ${auraGlow} pointer-events-none z-0`} />

      <div className="container mx-auto max-w-7xl px-6 md:px-12 relative z-10 pt-28">
        
        {/* Profile Card Header */}
        <div className="glass border border-white/5 rounded-2xl md:rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start drop-shadow-2xl">
          
          {/* Avatar Frame Container */}
          <div className="relative group/avatar">
            <div className={`w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden flex items-center justify-center bg-surface relative ${frameColor} transition-transform duration-300 group-hover/avatar:scale-105`}>
              <User className="w-16 h-16 md:w-20 md:h-20 text-white/40" />
            </div>
            <div className="absolute -bottom-3 inset-x-0 flex justify-center">
              <span className="bg-brand text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full text-white shadow-lg border border-white/10">
                {frameTitle.split(' ')[0]}
              </span>
            </div>
          </div>

          {/* Name & Bio & Tags */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
              <h1 className="text-3xl md:text-4xl font-display font-black text-white drop-shadow-md">
                {user?.email?.split('@')[0].toUpperCase() || "CINEPHILE"}
              </h1>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 border border-white/10 text-white/50 text-[10px] uppercase font-bold tracking-wider">
                <Shield className="w-3 h-3 text-brand" /> {frameTitle}
              </div>
            </div>

            {/* Bio Editor */}
            <div className="mt-4 w-full max-w-xl">
              {isEditingBio ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={tempBio}
                    onChange={(e) => setTempBio(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-brand/40 resize-none h-24"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setIsEditingBio(false)} className="px-3 py-1.5 text-xs text-white/60 hover:text-white rounded bg-white/5">
                      Cancel
                    </button>
                    <button onClick={handleSaveBio} className="px-4 py-1.5 text-xs text-white bg-brand rounded hover:bg-brand-hover shadow-lg">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={() => { setTempBio(profile.bio); setIsEditingBio(true); }} className="group/bio cursor-pointer hover:bg-white/5 p-2 rounded-lg -ml-2 transition-colors">
                  <p className="text-white/60 text-sm italic leading-relaxed">
                    "{profile.bio}"
                  </p>
                  <span className="text-[10px] text-brand/0 group-hover/bio:text-brand/80 font-bold transition-all uppercase block mt-1">
                    [ Click to Edit Intro ]
                  </span>
                </div>
              )}
            </div>

            {/* Favorite Genre Tags */}
            <div className="mt-5">
              <span className="text-[9px] uppercase font-black tracking-widest text-white/30 block mb-2">Favorite Genres</span>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {AVAILABLE_GENRES.map((genre) => {
                  const isActive = profile.favoriteGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => handleToggleGenre(genre)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-brand/20 text-brand border border-brand/50 shadow-[0_0_10px_rgba(229,9,20,0.15)] scale-105'
                          : 'bg-white/5 text-white/50 border border-white/5 hover:border-white/20 hover:text-white/80'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Share profile Button */}
          <div className="flex flex-col gap-2 w-full md:w-auto items-center md:items-end">
            <button
              onClick={copyPublicLink}
              className="w-full md:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center gap-2 text-xs font-black text-white tracking-widest uppercase transition-all shadow-md active:scale-95"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-brand" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedLink ? "LINK COPIED" : "SHARE DASHBOARD"}
            </button>
            <div className="flex items-center gap-1.5 text-[9px] text-white/20 font-bold tracking-wider uppercase">
              {profile.isPublic ? <Eye className="w-3 h-3 text-brand" /> : <EyeOff className="w-3 h-3" />}
              {profile.isPublic ? "Public Profile Active" : "Private Taste Profile"}
            </div>
          </div>

        </div>

        {/* Dashboard Tabs Selector */}
        <div className="flex border-b border-white/5 gap-6 md:gap-8 mt-12 overflow-x-auto pb-px scrollbar-none">
          {[
            { id: 'stats', label: 'THE REEL', icon: Award },
            { id: 'curation', label: 'CURATION & TOP 10', icon: Film },
            { id: 'reviews', label: 'MY REVIEWS FEED', icon: Star },
            { id: 'preferences', label: 'PREFERENCES', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 border-b-2 text-xs font-black uppercase tracking-[0.2em] transition-all relative shrink-0 ${
                  isActive
                    ? 'border-brand text-brand'
                    : 'border-transparent text-white/40 hover:text-white/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 2. Content Tabs */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            
            {/* TAB: STATS & ANALYTICS */}
            {activeTab === 'stats' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Stats Counters Grid */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                  
                  {/* Binge Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { 
                        title: 'Total Watch Time', 
                        value: `${Math.round((watchlist.length * 125 + userReviews.length * 130) / 60)}H`, 
                        sub: 'Based on ratings/watchlist' 
                      },
                      { 
                        title: 'Titles Tracked', 
                        value: watchlist.length, 
                        sub: 'Active watchlist length' 
                      },
                      { 
                        title: 'Reviews Left', 
                        value: userReviews.filter(r => r.reviewText && r.reviewText.trim().length > 0).length, 
                        sub: 'Written critiques submitted' 
                      },
                    ].map((item, idx) => (
                      <div key={idx} className="glass border border-white/5 rounded-2xl p-5 flex flex-col justify-center text-center">
                        <span className="text-[9px] uppercase font-black tracking-wider text-white/30 mb-2 block">{item.title}</span>
                        <span className="text-3xl md:text-4xl font-display font-black text-brand italic drop-shadow-lg">{item.value}</span>
                        <span className="text-[10px] text-white/20 mt-1 block leading-tight">{item.sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* Achievements and Badges */}
                  <div className="glass border border-white/5 rounded-2xl p-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                      <span className="w-1 h-3 bg-brand" /> UNLOCKED BINGE BADGES
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { 
                          name: 'Early Bird', 
                          desc: 'Rates or watches movies before 8:00 AM.', 
                          unlocked: true,
                          icon: '🌅'
                        },
                        { 
                          name: 'Night Owl', 
                          desc: 'Discovers or ratings movies past midnight.', 
                          unlocked: true,
                          icon: '🦉'
                        },
                        { 
                          name: 'Sci-Fi Pioneer', 
                          desc: 'Unlock by having Sci-Fi as your #1 genre.', 
                          unlocked: primaryFavGenre === 'Sci-Fi',
                          icon: '👾'
                        },
                        { 
                          name: 'Cinematic Guru', 
                          desc: 'Unlock by leaving 10 or more movie reviews.', 
                          unlocked: ratingCount >= 10,
                          icon: '👑'
                        },
                      ].map((badge, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-xl border flex gap-4 items-center transition-all duration-300 ${
                            badge.unlocked 
                              ? 'bg-surface/40 border-white/10 hover:border-brand/40 shadow-md' 
                              : 'bg-black/40 border-white/5 opacity-40'
                          }`}
                        >
                          <span className="text-3xl">{badge.icon}</span>
                          <div>
                            <h4 className="text-sm font-black text-white tracking-wider uppercase">{badge.name}</h4>
                            <p className="text-xs text-white/50 leading-tight mt-0.5">{badge.desc}</p>
                            {badge.unlocked && (
                              <span className="text-[8px] font-black text-brand tracking-widest uppercase mt-1.5 block">UNLOCKED</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Genre Taste Radar */}
                <div className="glass border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-between text-center relative overflow-hidden">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2 justify-center">
                      <span className="w-1 h-3 bg-brand" /> CINEMATIC TASTE RADAR
                    </h3>
                    <p className="text-[10px] text-white/20 mt-1 leading-tight uppercase tracking-wider">Dynamic taste mapped dynamically</p>
                  </div>

                  <div className="my-4 relative">
                    {/* SVG RADAR */}
                    <svg width="300" height="300" className="drop-shadow-lg">
                      {/* Grid polygons */}
                      {[0.2, 0.4, 0.6, 0.8, 1].map((scale, sIdx) => {
                        const gridPoints = statsKeys.map((_, i) => {
                          const { x, y } = getCoordinates(i, scale * 100);
                          return `${x},${y}`;
                        }).join(' ');
                        return (
                          <polygon
                            key={sIdx}
                            points={gridPoints}
                            fill="none"
                            stroke="rgba(255,255,255,0.04)"
                            strokeWidth="1"
                          />
                        );
                      })}

                      {/* Radar lines */}
                      {statsKeys.map((_, i) => {
                        const { x, y } = getCoordinates(i, 100);
                        return (
                          <line
                            key={i}
                            x1={center}
                            y1={center}
                            x2={x}
                            y2={y}
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth="1"
                          />
                        );
                      })}

                      {/* Glowing filled radar area */}
                      <polygon
                        points={points}
                        fill="rgba(229, 9, 20, 0.25)"
                        stroke="rgba(229, 9, 20, 0.8)"
                        strokeWidth="2.5"
                        className="animate-pulse"
                      />

                      {/* Glowing outer point anchors */}
                      {statsKeys.map((k, i) => {
                        const { x, y } = getCoordinates(i, dynamicStats[k] || baseStats[k as keyof typeof baseStats]);
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="4.5"
                            fill="#e50914"
                            stroke="#fff"
                            strokeWidth="1.5"
                            className="shadow-lg"
                          />
                        );
                      })}

                      {/* Grid Labels */}
                      {statsKeys.map((k, i) => {
                        const labelRadius = 120;
                        const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                        const lx = center + Math.cos(angle) * labelRadius;
                        const ly = center + Math.sin(angle) * labelRadius;
                        
                        return (
                          <text
                            key={i}
                            x={lx}
                            y={ly}
                            fill="rgba(255,255,255,0.5)"
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            className="uppercase tracking-widest"
                          >
                            {k}
                          </text>
                        );
                      })}
                    </svg>
                  </div>

                  <span className="text-[10px] text-white/40 italic px-4 leading-tight">
                    Your taste is heavily weighted in <strong className="text-brand uppercase">{primaryFavGenre}</strong>, proving you love a deep narrative experience!
                  </span>
                </div>

              </motion.div>
            )}

            {/* TAB: CONTENT CURATION */}
            {activeTab === 'curation' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                
                {/* Personal Top 10 Draggable Slot */}
                <div className="lg:col-span-2 glass border border-white/5 rounded-2xl p-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                    <span className="w-1 h-3 bg-brand" /> PERSONAL TOP 10 MASTERLIST
                  </h3>
                  
                  {/* TMDB Movie Search inside Profile Top 10 */}
                  <div className="relative mb-6">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          type="text"
                          placeholder="Search movie title to add directly to your Top 10..."
                          value={searchQuery}
                          onChange={(e) => handleSearchTop10(e.target.value)}
                          className="w-full bg-surface border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand/40"
                        />
                      </div>
                    </div>

                    {/* Search results dropdown overlay */}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full inset-x-0 bg-surface border border-white/10 rounded-lg mt-2 overflow-hidden shadow-2xl z-40 max-h-[300px]">
                        {searchResults.map((movie) => (
                          <div 
                            key={movie.id} 
                            className="flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <img src={movie.posterUrl} className="w-8 h-12 object-cover rounded shadow" />
                              <div>
                                <h4 className="text-xs font-black text-white tracking-wide uppercase line-clamp-1">{movie.title}</h4>
                                <p className="text-[10px] text-white/40 mt-0.5">{movie.year} • {movie.genre.slice(0, 2).join(', ')}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddTop10(movie)}
                              className="w-8 h-8 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center text-brand hover:bg-brand hover:text-white transition-all active:scale-90"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top 10 Ranked List */}
                  <div className="flex flex-col gap-3">
                    {profile.top10.length === 0 ? (
                      <div className="py-12 text-center border border-dashed border-white/5 rounded-xl text-white/30 flex flex-col items-center justify-center gap-3">
                        <Film className="w-10 h-10 text-white/10" />
                        <p className="text-xs leading-relaxed uppercase tracking-wider">No movies added to your Top 10 yet.<br />Search and curate your list above!</p>
                      </div>
                    ) : (
                      profile.top10.map((movie, idx) => (
                        <div 
                          key={movie.id} 
                          className="flex items-center justify-between bg-surface/30 border border-white/5 hover:border-white/15 rounded-xl p-3 transition-colors gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-xl font-display font-black text-white/20 italic tracking-tighter w-6">
                              #{idx + 1}
                            </span>
                            <img src={movie.posterUrl} className="w-9 h-14 object-cover rounded shadow" />
                            <div>
                              <h4 className="text-xs font-black text-white uppercase tracking-wide line-clamp-1">{movie.title}</h4>
                              <p className="text-[10px] text-white/40 mt-0.5">{movie.year} • {movie.genre.slice(0, 2).join(', ')}</p>
                            </div>
                          </div>

                          {/* Reordering Controls */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMoveTop10(idx, 'up')}
                              disabled={idx === 0}
                              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors disabled:opacity-20"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveTop10(idx, 'down')}
                              disabled={idx === profile.top10.length - 1}
                              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors disabled:opacity-20"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveTop10(movie.id)}
                              className="w-7 h-7 rounded-full bg-red-950/20 border border-red-500/10 hover:border-red-500/30 flex items-center justify-center text-red-400 hover:bg-brand hover:text-white transition-all ml-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>

                {/* Categorized Watchlist Curation */}
                <div className="glass border border-white/5 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                      <span className="w-1 h-3 bg-brand" /> DYNAMIC WATCHLIST
                    </h3>
                  </div>

                  {/* Filter switches */}
                  <div className="grid grid-cols-3 bg-black/40 border border-white/5 rounded-lg p-1 mb-4 text-[10px] font-black uppercase tracking-wider">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'unwatched', label: 'Want to See' },
                      { id: 'rewatchable', label: 'Re-watchable' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setWatchlistFilter(f.id as any)}
                        className={`py-1.5 rounded transition-colors text-center ${
                          watchlistFilter === f.id ? 'bg-brand text-white' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Render filtered watchlist */}
                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px] scrollbar-none pr-1">
                    {watchlist.length === 0 ? (
                      <div className="py-8 text-center text-white/20 text-xs">Watchlist is currently empty.</div>
                    ) : (
                      (() => {
                        const filtered = watchlist.filter(m => {
                          const hasRated = userReviews.some(r => r.movieId === m.id);
                          if (watchlistFilter === 'unwatched') return !hasRated;
                          if (watchlistFilter === 'rewatchable') return hasRated;
                          return true;
                        });

                        if (filtered.length === 0) {
                          return <div className="py-8 text-center text-white/20 text-xs">No matching movies found in this category.</div>;
                        }

                        return filtered.map(movie => (
                          <Link href={`/movie/${movie.id}`} key={movie.id} className="flex gap-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg p-2.5 transition-colors">
                            <img src={movie.posterUrl} className="w-10 h-14 object-cover rounded" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-black text-white uppercase tracking-wide truncate">{movie.title}</h4>
                              <p className="text-[10px] text-white/40 mt-0.5">{movie.year}</p>
                              {userReviews.some(r => r.movieId === movie.id) ? (
                                <span className="inline-flex items-center gap-1 text-[8px] font-black text-brand uppercase tracking-widest mt-1">
                                  <Star className="w-2.5 h-2.5 fill-current" /> Reviewed
                                </span>
                              ) : (
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1 block">
                                  Plan to Watch
                                </span>
                              )}
                            </div>
                          </Link>
                        ));
                      })()
                    )}
                  </div>

                </div>

              </motion.div>
            )}

            {/* TAB: REVIEWS FEED */}
            {activeTab === 'reviews' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto glass border border-white/5 rounded-2xl p-6 md:p-8"
              >
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                  <span className="w-1 h-3 bg-brand" /> PERSONAL REVIEWS TIMELINE
                </h3>

                <div className="flex flex-col gap-6">
                  {userReviews.length === 0 ? (
                    <div className="py-16 text-center text-white/30 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center gap-3">
                      <Star className="w-10 h-10 text-white/10" />
                      <p className="text-xs leading-relaxed uppercase tracking-wider">You haven't submitted any reviews yet.<br />Rate and critque movies on their detail pages!</p>
                    </div>
                  ) : (
                    userReviews.map((review) => (
                      <ReviewItem 
                        key={review.movieId} 
                        review={review} 
                        onSaveText={handleSaveReviewText} 
                      />
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: PREFERENCES */}
            {activeTab === 'preferences' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
              >
                
                {/* Subscription platforms preferences */}
                <div className="glass border border-white/5 rounded-2xl p-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-4 flex items-center gap-2">
                    <span className="w-1 h-3 bg-brand" /> ACTIVE STREAMING SUBSCRIPTIONS
                  </h3>
                  <p className="text-[10px] text-white/30 mb-6 uppercase leading-tight tracking-wider">
                    Selecting your services updates default watch provider indicators.
                  </p>

                  <div className="flex flex-col gap-3">
                    {STREAMING_PLATFORMS.map((platform) => {
                      const isActive = profile.subscriptions.includes(platform.name);
                      return (
                        <button
                          key={platform.name}
                          onClick={() => handleToggleSub(platform.name)}
                          className={`flex items-center justify-between p-3.5 border rounded-xl transition-all ${
                            isActive
                              ? 'bg-surface border-brand/50 shadow-[0_0_10px_rgba(229,9,20,0.15)] text-white'
                              : 'bg-black/20 border-white/5 text-white/40 hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <img src={platform.logo} className="w-7 h-7 object-contain rounded" />
                            <span className="text-xs font-black uppercase tracking-wider">{platform.name}</span>
                          </div>
                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                            isActive ? 'bg-brand border-brand text-white' : 'border-white/10 bg-black/40'
                          }`}>
                            {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* App settings: notification switch and public url */}
                <div className="flex flex-col gap-8">
                  
                  {/* Preferences Toggles */}
                  <div className="glass border border-white/5 rounded-2xl p-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                      <span className="w-1 h-3 bg-brand" /> SYSTEM NOTIFICATION RULES
                    </h3>
                    
                    <div className="flex flex-col gap-5">
                      {[
                        {
                          field: 'notifyNewRelease',
                          title: 'New Release Alerts',
                          desc: 'Notify me when an upcoming movie within my favorite genres is released.',
                          icon: Bell
                        },
                        {
                          field: 'notifyLeavingSoon',
                          title: 'Leaving Soon Notice',
                          desc: 'Notify me when a movie in my watchlist is scheduled to leave platform soon.',
                          icon: Mail
                        },
                        {
                          field: 'isPublic',
                          title: 'Public Profile Visibility',
                          desc: 'Let other users see my stats, ratings, and Personal Top 10 lists.',
                          icon: Shield
                        },
                      ].map((pref) => {
                        const Icon = pref.icon;
                        const value = profile[pref.field as 'notifyNewRelease' | 'notifyLeavingSoon' | 'isPublic'];
                        return (
                          <div key={pref.field} className="flex gap-4 items-start justify-between">
                            <div className="flex gap-3">
                              <Icon className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-white">{pref.title}</h4>
                                <p className="text-[10px] text-white/50 mt-1 leading-normal max-w-xs">{pref.desc}</p>
                              </div>
                            </div>
                            
                            {/* Toggle Switch */}
                            <button
                              onClick={() => handleTogglePref(pref.field as any)}
                              className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 relative shrink-0 ${
                                value ? 'bg-brand' : 'bg-white/10'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                                value ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

// Individual Review Timeline component with dynamic textarea toggle
interface ReviewItemProps {
  review: UserReview;
  onSaveText: (movieId: number, text: string, rating: number) => Promise<void>;
}

function ReviewItem({ review, onSaveText }: ReviewItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState(review.reviewText || '');

  const handleSave = () => {
    setIsEditing(false);
    onSaveText(review.movieId, comment, review.rating);
  };

  return (
    <div className="flex gap-4 md:gap-6 bg-surface/30 border border-white/5 rounded-xl p-4 md:p-5 relative group/review hover:border-white/10 transition-colors">
      <img src={review.moviePoster} className="w-12 h-18 md:w-16 md:h-24 object-cover rounded shadow-lg flex-shrink-0" />
      <div className="flex-1 min-w-0">
        
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-xs md:text-sm font-black text-white uppercase tracking-wide line-clamp-1">
            {review.movieTitle}
          </h4>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                className={`w-3.5 h-3.5 ${
                  star <= review.rating ? 'text-yellow-500 fill-current' : 'text-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Written Review */}
        <div className="mt-3">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Critique this movie... Add your thoughts and opinions here."
                className="w-full bg-surface border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-brand/40 resize-none h-20"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsEditing(false)} className="px-2.5 py-1 text-[10px] text-white/60 hover:text-white rounded bg-white/5">
                  Cancel
                </button>
                <button onClick={handleSave} className="px-3.5 py-1 text-[10px] text-white bg-brand rounded hover:bg-brand-hover">
                  Save Review
                </button>
              </div>
            </div>
          ) : (
            <div>
              {review.reviewText && review.reviewText.trim().length > 0 ? (
                <p className="text-white/70 text-xs leading-relaxed italic">
                  "{review.reviewText}"
                </p>
              ) : (
                <p className="text-white/20 text-xs italic">
                  No review text provided. Tap "Edit Review" to share your cinema thoughts!
                </p>
              )}
              <button 
                onClick={() => { setComment(review.reviewText || ''); setIsEditing(true); }}
                className="text-[9px] text-brand hover:underline font-bold uppercase tracking-wider mt-2.5 block cursor-pointer transition-all"
              >
                [ EDIT CRITIQUE ]
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
