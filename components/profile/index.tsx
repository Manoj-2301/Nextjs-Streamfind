'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { useWatchlist } from '@/context/WatchlistContext';
import { useRatings } from '@/context/RatingContext';
import { searchMovies, getMovieAdditionalDetails, MovieAdditionalDetails } from '@/services/tmdbService';
import { Movie } from '@/types';
import { db, storage } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, Settings, Star, Film, Tv, Award, Plus, Trash2,
  Zap, Activity, History, Shield, Bell, Lock, Globe, Share2,
  Check, Mail, ArrowUp, ArrowDown, Search, Heart, LogOut, CheckCircle2,
  Coffee, Trophy, Clock, Camera, X
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip 
} from 'recharts';

interface ProfileSettings {
  bio: string;
  favoriteGenres: string[];
  subscriptions: string[];
  notifyNewRelease: boolean;
  notifyLeavingSoon: boolean;
  isPublic: boolean;
  avatarFrame: 'none' | 'neon' | 'gold' | 'ghost';
  top10: Movie[];
  autoFilter?: boolean;
  photoURL?: string;
}

const AVAILABLE_GENRES = [
  'Sci-Fi', 'Action', 'Drama', 'Thriller', 'Comedy', 'Horror', 'Romance', 'Mystery', 'Adventure', 'Neo-Noir', 'Cyberpunk', 'Post-Apocalyptic', 'Synthwave'
];

const STREAMING_PLATFORMS = [
  { id: 'netflix', name: "Netflix", logo: "N", color: "bg-red-600" },
  { id: 'disney', name: "Disney+", logo: "D", color: "bg-blue-600" },
  { id: 'prime', name: "Prime Video", logo: "P", color: "bg-cyan-500" },
  { id: 'hbo', name: "HBO Max", logo: "H", color: "bg-purple-600" },
];

const frames = [
  { id: 'none', name: 'Original', class: 'border-white/10' },
  { id: 'neon', name: 'Cyber Neon', class: 'border-brand shadow-[0_0_30px_rgba(255,40,78,0.4)] ring-4 ring-brand/20' },
  { id: 'gold', name: 'Gold Leaf', class: 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)] ring-4 ring-yellow-500/20' },
  { id: 'ghost', name: 'Ghost Frame', class: 'border-blue-400 shadow-[0_0_30px_rgba(96,165,250,0.4)] ring-4 ring-blue-400/20 shadow-inner' }
];

export default function ProfileComponent() {
  const { user, logout } = useAuth();
  const { watchlist } = useWatchlist();
  const { userReviews } = useRatings();
  const router = useRouter();

  // SSR Hydration Safeguard
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Profile data syncing with Firestore
  const [profile, setProfile] = useState<ProfileSettings>({
    bio: "Exploring the infinite multiverse of cinema, one frame at a time. High-key addicted to neo-noirs.",
    favoriteGenres: ['Neo-Noir', 'Cyberpunk', 'Post-Apocalyptic', 'Synthwave'],
    subscriptions: ['Netflix', 'Disney+', 'HBO Max'],
    notifyNewRelease: true,
    notifyLeavingSoon: true,
    isPublic: true,
    avatarFrame: 'none',
    top10: [],
    autoFilter: true,
    photoURL: '',
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [bioInput, setBioInput] = useState(profile.bio);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || "");
  const [editFrameId, setEditFrameId] = useState(profile.avatarFrame);

  // Dynamic Director & Critic insights from TMDB for Rated Movies
  const [additionalDetails, setAdditionalDetails] = useState<Record<number, MovieAdditionalDetails>>({});

  useEffect(() => {
    if (userReviews.length === 0) return;
    
    const fetchAdditionalDetails = async () => {
      const details: Record<number, MovieAdditionalDetails> = {};
      await Promise.all(
        userReviews.map(async (review) => {
          try {
            const data = await getMovieAdditionalDetails(review.movieId);
            details[review.movieId] = data;
          } catch (e) {
            console.error("Error fetching additional details for movie:", review.movieId, e);
          }
        })
      );
      setAdditionalDetails(prev => ({ ...prev, ...details }));
    };

    fetchAdditionalDetails();
  }, [userReviews]);
  // Helper to toggle like status of reviews in Firestore
  const handleToggleLike = async (movieId: number, currentLiked: boolean) => {
    if (!user) return;
    try {
      const ratingRef = doc(db, `users/${user.uid}/ratings/${movieId}`);
      await setDoc(ratingRef, { liked: !currentLiked }, { merge: true });
    } catch (e) {
      console.error("Error toggling like:", e);
    }
  };

  // Helper to share specific review notes using Web Share API or copying link
  const handleShareNote = async (movieId: number, movieTitle: string) => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/movie/${movieId}`;
    const shareData = {
      title: `Director's Note: ${movieTitle}`,
      text: `Check out my critique and notes for "${movieTitle}" on StreamFind!`,
      url: shareUrl
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert(`Copied link for "${movieTitle}" to clipboard!`);
      }
    } catch (e) {
      console.error("Error sharing note:", e);
    }
  };


  // TMDB Movie Curation Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // Image Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleShareProfile = async () => {
    if (typeof window === 'undefined' || !user) return;
    const shareUrl = `${window.location.origin}/profile?uid=${user.uid}`;
    const shareData = {
      title: 'StreamFind Cinema Profile',
      text: `Check out my custom cinema profile, top movies, and binge statistics on StreamFind!`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        console.log('Profile shared successfully via Web Share API!');
      } catch (err: any) {
        // If it was not aborted by user, open our custom modal as a secondary option
        if (err.name !== 'AbortError') {
          setIsShareModalOpen(true);
        }
      }
    } else {
      // Fallback: Open our gorgeous share modal
      setIsShareModalOpen(true);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/profile_${Date.now()}`);
      
      // Wrap uploadBytes in a 12-second timeout to handle CORS preflight hanging behavior elegantly
      const uploadPromise = uploadBytes(storageRef, file);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("CORS_TIMEOUT")), 12000)
      );

      await Promise.race([uploadPromise, timeoutPromise]);
      const url = await getDownloadURL(storageRef);
      
      // Update Firebase Auth profile
      await updateProfile(user, { photoURL: url });

      // Save photoURL to Firestore as a robust backup/sync mechanism
      const docRef = doc(db, `users/${user.uid}`);
      await setDoc(docRef, { photoURL: url }, { merge: true });
      
      setProfile(prev => ({ ...prev, photoURL: url }));
      
      // Force a reload to guarantee Next.js app-wide components reload the new photo URL from Auth session
      window.location.reload(); 
    } catch (err: any) {
      console.error("Error uploading image:", err);
      if (err.message === "CORS_TIMEOUT") {
        alert(
          "⚠️ Upload Timed Out / CORS Blocker Detected!\n\n" +
          "Your browser blocked the upload request. This is because your Firebase Storage CORS settings have not been configured yet to allow uploads from http://localhost:3000.\n\n" +
          "Please follow the simple copy-paste steps in our conversation window to configure your Firebase Storage bucket CORS rules in Google Cloud Shell!"
        );
      } else {
        alert("Error uploading image: " + err.message);
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Firestore read
  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}`;
    const docRef = doc(db, path);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ProfileSettings & { frameId?: string };
        setProfile(prev => ({
          ...prev,
          ...data,
          favoriteGenres: data.favoriteGenres || prev.favoriteGenres,
          subscriptions: data.subscriptions || prev.subscriptions,
          top10: data.top10 || prev.top10,
          avatarFrame: data.avatarFrame || data.frameId || prev.avatarFrame,
          bio: data.bio || prev.bio,
          autoFilter: data.autoFilter !== undefined ? data.autoFilter : prev.autoFilter,
          photoURL: data.photoURL || prev.photoURL
        }));
      }
    }, (error) => {
      console.error("Profile onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Modals sync
  useEffect(() => {
    if (isEditModalOpen) {
      setBioInput(profile.bio);
      setEditDisplayName(user?.displayName || user?.email?.split('@')[0] || "");
      setEditFrameId(profile.avatarFrame);
    }
  }, [isEditModalOpen, profile.bio, profile.avatarFrame, user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, `users/${user.uid}`);
      
      // Save both avatarFrame and frameId (for backward compatibility with Vite app)
      const savePromise = setDoc(docRef, { 
        bio: bioInput, 
        avatarFrame: editFrameId,
        frameId: editFrameId 
      }, { merge: true });
      
      const authPromise = editDisplayName !== user.displayName 
        ? updateProfile(user, { displayName: editDisplayName })
        : Promise.resolve();

      await Promise.all([savePromise, authPromise]);

      setProfile(prev => ({ ...prev, bio: bioInput, avatarFrame: editFrameId }));
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      alert("An error occurred while saving the profile: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSub = async (platformName: string) => {
    if (!user) return;
    let updatedSubs = [...profile.subscriptions];
    if (updatedSubs.includes(platformName)) {
      updatedSubs = updatedSubs.filter(s => s !== platformName);
    } else {
      updatedSubs.push(platformName);
    }
    
    try {
      const docRef = doc(db, `users/${user.uid}`);
      await setDoc(docRef, { subscriptions: updatedSubs }, { merge: true });
    } catch (err) {
      console.error("Error toggling subscriptions:", err);
    }
  };

  const handleTogglePref = async (field: 'notifyNewRelease' | 'notifyLeavingSoon' | 'isPublic' | 'autoFilter') => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}`);
      await setDoc(docRef, { [field]: !profile[field] }, { merge: true });
    } catch (err) {
      console.error("Error updating preference:", err);
    }
  };

  const handleToggleGenre = async (genre: string) => {
    if (!user) return;
    let updatedGenres = [...profile.favoriteGenres];
    if (updatedGenres.includes(genre)) {
      updatedGenres = updatedGenres.filter(g => g !== genre);
    } else {
      updatedGenres.push(genre);
    }
    
    try {
      const docRef = doc(db, `users/${user.uid}`);
      await setDoc(docRef, { favoriteGenres: updatedGenres }, { merge: true });
    } catch (err) {
      console.error("Error updating genres:", err);
    }
  };

  const handleSearchChange = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const results = await searchMovies(q);
    setSearchResults(results.slice(0, 5));
  };

  const handleAddTopMovie = async (movie: Movie) => {
    if (!user || profile.top10.length >= 5) return;
    if (profile.top10.some(m => m.id === movie.id)) return;
    
    const updatedTop10 = [...profile.top10, movie];
    try {
      const docRef = doc(db, `users/${user.uid}`);
      await setDoc(docRef, { top10: updatedTop10 }, { merge: true });
      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
    } catch (err) {
      console.error("Error adding to Top 5:", err);
    }
  };

  const handleRemoveTopMovie = async (movieId: number) => {
    if (!user) return;
    const updatedTop10 = profile.top10.filter(m => m.id !== movieId);
    try {
      const docRef = doc(db, `users/${user.uid}`);
      await setDoc(docRef, { top10: updatedTop10 }, { merge: true });
    } catch (err) {
      console.error("Error removing from Top 5:", err);
    }
  };

  const handleMoveTopMovie = async (index: number, direction: 'up' | 'down') => {
    if (!user) return;
    const updatedTop10 = [...profile.top10];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updatedTop10.length) return;
    
    const temp = updatedTop10[index];
    updatedTop10[index] = updatedTop10[targetIndex];
    updatedTop10[targetIndex] = temp;
    
    try {
      const docRef = doc(db, `users/${user.uid}`);
      await setDoc(docRef, { top10: updatedTop10 }, { merge: true });
    } catch (err) {
      console.error("Error reordering Top 5:", err);
    }
  };

  const copyPublicLink = () => {
    if (typeof window === 'undefined') return;
    const link = `${window.location.origin}/profile?uid=${user?.uid}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const ratingCount = userReviews.length;
  const watchCount = watchlist.length;
  const totalScore = ratingCount * 3 + watchCount;

  // Rank / Level
  let level = 1;
  let frameTitle = 'Novice';
  
  if (totalScore >= 30) {
    level = 15;
    frameTitle = 'Film Legend';
  } else if (totalScore >= 15) {
    level = 10;
    frameTitle = 'Cinephile';
  } else if (totalScore >= 5) {
    level = 5;
    frameTitle = 'Critic';
  } else if (totalScore >= 1) {
    level = 2;
    frameTitle = 'Apprentice';
  }

  const totalHours = Math.round((watchlist.length * 125 + userReviews.length * 130) / 60) || 0;

  const avgRating = userReviews.length > 0 
    ? (userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length).toFixed(1)
    : "0.0";

  const primaryFavGenre = profile.favoriteGenres[0] || 'Default';
  const getAuraColor = (genre: string) => {
    switch (genre) {
      case 'Sci-Fi': return 'from-purple-900/40 to-background';
      case 'Action': return 'from-red-900/40 to-background';
      case 'Drama': return 'from-orange-900/40 to-background';
      case 'Thriller': return 'from-violet-900/40 to-background';
      case 'Comedy': return 'from-amber-900/40 to-background';
      default: return 'from-brand/20 to-background';
    }
  };

  const radarData = useMemo(() => {
    const genreCounts: Record<string, number> = {
      'Sci-Fi': 20,
      'Action': 15,
      'Drama': 25,
      'Thriller': 10,
      'Comedy': 15,
      'Horror': 5
    };
    
    watchlist.forEach(m => {
      m.genre?.forEach(g => {
        const matched = Object.keys(genreCounts).find(k => g.toLowerCase().includes(k.toLowerCase()));
        if (matched) genreCounts[matched] += 15;
      });
    });
    
    userReviews.forEach(r => {
      const movie = watchlist.find(m => m.id === r.movieId);
      movie?.genre?.forEach(g => {
        const matched = Object.keys(genreCounts).find(k => g.toLowerCase().includes(k.toLowerCase()));
        if (matched) genreCounts[matched] += 25;
      });
    });

    return Object.keys(genreCounts).map(g => ({
      genre: g,
      A: Math.min(genreCounts[g], 150),
      fullMark: 150
    }));
  }, [watchlist, userReviews]);

  const watchHistory = useMemo(() => {
    const events = [
      ...watchlist.map(m => ({
        id: `watchlist-${m.id}`,
        title: m.title,
        action: "Added to Watchlist",
        time: "Watchlist Item",
        type: "watch"
      })),
      ...userReviews.map(r => ({
        id: `review-${r.movieId}`,
        title: r.movieTitle,
        action: `Rated ${r.rating}/5`,
        time: "Recent Critique",
        type: "rate"
      }))
    ];
    return events.slice(0, 4);
  }, [watchlist, userReviews]);

  const topTen = profile.top10.slice(0, 5);
  const currentFrame = frames.find(f => f.id === profile.avatarFrame) || frames[0];

  const badges = [
    { icon: Coffee, title: "Early Bird", desc: "Watched 5+ movies before 8 AM", unlocked: true, color: "text-orange-400" },
    { icon: Trophy, title: "Genre Master", desc: "Full Genre Radar coverage", unlocked: watchCount > 5, color: "text-brand" },
    { icon: Clock, title: "Night Owl", desc: "Watched 3 movies after midnight", unlocked: true, color: "text-purple-400" },
    { icon: Zap, title: "Speed Demon", desc: "Rated 10 movies in one hour", unlocked: ratingCount > 3, color: "text-cyan-400" }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="bg-surface/30 p-12 rounded-[40px] border border-white/5 max-w-md w-full"
        >
          <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <UserIcon className="w-10 h-10 text-brand" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-tight italic">Member Access Required</h1>
          <p className="text-white/40 mb-8 font-medium">Join the StreamFind community to track your cinematic journey, save favorites, and get personalized picks.</p>
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-brand text-white py-4 rounded-2xl font-black text-xs tracking-widest uppercase hover:scale-105 transition-all shadow-lg shadow-brand/20"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white selection:bg-brand/30">
      {/* 1. Identity & Visuals: Aura Header */}
      <div className={`min-h-0 lg:min-h-[55vh] lg:h-auto flex flex-col justify-end relative overflow-hidden transition-colors duration-1000 bg-gradient-to-b ${getAuraColor(primaryFavGenre)}`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
        
        <div className="absolute inset-0 overflow-hidden">
           <motion.div 
             animate={{ scale: [1, 1.1, 1] }}
             transition={{ duration: 20, repeat: Infinity }}
             className="w-full h-full opacity-40 blur-3xl bg-brand/10 absolute -top-1/2 -left-1/4 rounded-full" 
           />
        </div>

        <div className="relative z-20 px-6 lg:px-12 pt-20 lg:pt-36 pb-10 lg:pb-20 w-full">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col lg:flex-row items-center lg:items-end gap-8 lg:gap-12">
              
              {/* Avatar with dynamic frame */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative group shrink-0 mx-auto lg:mx-0"
              >
                <div className={`w-36 h-36 sm:w-44 sm:h-44 lg:w-56 lg:h-56 rounded-[48px] overflow-hidden border-[6px] transition-all p-1 bg-surface ${currentFrame.class}`}>
                  {(profile.photoURL || user.photoURL) ? (
                    <img 
                      src={profile.photoURL || user.photoURL || ""} 
                      className="w-full h-full rounded-[40px] object-cover"
                      alt={user.displayName || ""} 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full rounded-[40px] bg-white/5 flex items-center justify-center">
                      <UserIcon className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-white/30" />
                    </div>
                  )}
                </div>
                <div 
                  className="absolute bottom-0 right-0 w-12 h-12 bg-surface border border-white/10 rounded-2xl flex items-center justify-center shadow-xl cursor-pointer hover:bg-brand hover:border-brand transition-all group/cam"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingImage ? (
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white/40 group-hover/cam:text-white" />
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </motion.div>

              <div className="flex-1 space-y-4 text-center lg:text-left w-full">
                <div className="flex items-center justify-center lg:justify-start gap-3">
                  <span className="text-brand font-black text-[10px] tracking-[0.2em] uppercase bg-brand/10 px-3 py-1 rounded-full">
                    {profile.avatarFrame !== 'none' ? `${currentFrame.name} Member` : 'Standard Member'}
                  </span>
                  <div className="flex items-center gap-1 text-white/40 text-[10px] font-black uppercase tracking-widest">
                    <Zap className="w-3 h-3 text-brand" /> {level} Level
                  </div>
                </div>

                <div>
                  <h1 className="text-4xl sm:text-5xl lg:text-7xl xl:text-8xl font-black tracking-tighter uppercase italic leading-[0.9] lg:leading-[0.8] mb-4">
                    {user.displayName || user.email?.split('@')[0]}
                  </h1>
                  
                  {/* Bio & Glowing Tags */}
                  <div className="max-w-2xl mx-auto lg:mx-0">
                    <p className="text-white/60 font-medium text-lg leading-relaxed">
                      {profile.bio}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-6 justify-center lg:justify-start">
                      {AVAILABLE_GENRES.map((genre) => {
                        const isActive = profile.favoriteGenres.includes(genre);
                        return (
                          <span 
                            key={genre} 
                            onClick={() => handleToggleGenre(genre)}
                            className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-tight transition-all cursor-pointer ${
                              isActive 
                                ? 'bg-brand/20 border-brand text-brand shadow-[0_0_15px_rgba(229,9,20,0.2)]'
                                : 'bg-surface/20 border-white/10 text-white/40 hover:text-white/80 hover:border-white/20'
                            }`}
                          >
                            {genre}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Share & Privacy Actions */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0 justify-center">
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="bg-white text-black w-full lg:w-auto px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand hover:text-white transition-all shadow-xl"
                >
                  Edit Profile
                </button>
                <div className="flex gap-2 w-full lg:w-auto">
                   <button 
                     onClick={() => handleTogglePref('isPublic')}
                     className={`flex-1 p-4 rounded-2xl border transition-all flex items-center justify-center gap-2 ${profile.isPublic ? 'bg-brand/10 border-brand/20 text-brand' : 'bg-surface/20 border-white/5 text-white/40'}`}
                   >
                     {profile.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                     <span className="text-[10px] font-black uppercase tracking-wider">{profile.isPublic ? 'Public' : 'Private'}</span>
                   </button>
                   <button 
                      onClick={handleShareProfile}
                      className="p-4 bg-surface/20 border border-white/5 rounded-2xl text-white/40 hover:text-brand hover:border-brand/20 transition-all animate-pulse"
                      title="Share Profile"
                    >
                       <Share2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats & Analytics Grid */}
      <div className="container mx-auto max-w-7xl px-6 lg:px-12 py-12 relative z-30 -mt-6 lg:-mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 2. Stats & Analytics ("The Reel") */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Film, label: "Hours Watched", value: totalHours, unit: "HR", color: "text-blue-400" },
                { icon: Activity, label: "Cinetype Rank", value: frameTitle === "Apprentice" ? "B" : "A+", unit: "S2", color: "text-brand" },
                { icon: Star, label: "Avg Rating", value: avgRating, unit: "/5", color: "text-yellow-400" }
              ].map((stat) => (
                <motion.div 
                  whileHover={{ y: -5 }}
                  key={stat.label} 
                  className="p-8 rounded-[32px] bg-surface/30 border border-white/5 relative overflow-hidden group shadow-2xl backdrop-blur-xl"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                  <stat.icon className={`w-8 h-8 ${stat.color} mb-6`} />
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tighter uppercase italic">{stat.value}</span>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{stat.unit}</span>
                  </div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mt-2">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Genre Radar Chart */}
            <div className="bg-surface/30 border border-white/5 rounded-[40px] p-8 md:p-12 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tight">Genre <span className="text-brand">Radar</span></h3>
                  <p className="text-white/40 text-xs font-medium mt-1">Your cinematic taste distribution</p>
                </div>
                <div className="px-4 py-2 bg-brand/10 rounded-xl border border-brand/20 text-[10px] text-brand font-black uppercase">
                  Updated Today
                </div>
              </div>
              
              <div className="h-[350px] w-full">
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#ffffff10" />
                      <PolarAngleAxis dataKey="genre" tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 800 }} />
                      <Radar
                        name="Your Stats"
                        dataKey="A"
                        stroke="#e50914"
                        fill="#e50914"
                        fillOpacity={0.6}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">Loading Radar...</div>
                )}
              </div>
            </div>

            {/* 3. Content Curation: Personal Top 10 */}
            <div className="space-y-8 pt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black uppercase italic tracking-tight">The <span className="text-brand">Pinnacle</span> <span className="text-white/20 text-sm ml-2">MY TOP 5</span></h3>
                <button 
                  onClick={() => setShowSearch(!showSearch)}
                  className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline px-4 py-2 bg-brand/10 rounded-full transition-colors"
                >
                  {showSearch ? "Close Search" : "Manage Slot"}
                </button>
              </div>

              {showSearch && (
                <div className="glass border border-brand/20 p-5 rounded-3xl relative z-40 mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      placeholder="Type movie title to add to your Top 5 masterpieces..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-brand/40"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="bg-surface/95 border border-white/10 rounded-2xl mt-4 overflow-hidden shadow-2xl z-50">
                      {searchResults.map((movie) => (
                        <div 
                          key={movie.id} 
                          className="flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <img src={movie.posterUrl} className="w-10 h-14 object-cover rounded shadow" />
                            <div>
                              <h4 className="text-sm font-black text-white tracking-wide uppercase line-clamp-1">{movie.title}</h4>
                              <p className="text-[10px] text-white/40 mt-1">{movie.year} • {movie.genre.slice(0, 2).join(', ')}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddTopMovie(movie)}
                            disabled={profile.top10.length >= 5}
                            className="w-10 h-10 rounded-full bg-brand/10 border border-brand/35 flex items-center justify-center text-brand hover:bg-brand hover:text-white transition-all disabled:opacity-20"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-6 overflow-x-auto pb-6 snap-x no-scrollbar">
                {topTen.map((movie, idx) => (
                  <motion.div 
                    key={movie.id}
                    whileHover={{ scale: 1.05 }}
                    className="relative shrink-0 w-48 aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl snap-center group border border-white/5"
                  >
                    <div className="absolute top-3 left-3 w-8 h-8 bg-brand rounded-xl flex items-center justify-center text-xs font-black z-10 shadow-lg border border-white/20">
                      {idx + 1}
                    </div>
                    <img src={movie.posterUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={movie.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                       <p className="text-[10px] font-bold text-white line-clamp-1">{movie.title}</p>
                       <div className="flex gap-1.5 mt-3 border-t border-white/10 pt-3">
                         <button onClick={() => handleMoveTopMovie(idx, 'up')} disabled={idx === 0} className="flex-1 py-1.5 rounded bg-white/5 hover:bg-brand flex items-center justify-center disabled:opacity-20"><ArrowUp className="w-3 h-3 text-white" /></button>
                         <button onClick={() => handleMoveTopMovie(idx, 'down')} disabled={idx === topTen.length - 1} className="flex-1 py-1.5 rounded bg-white/5 hover:bg-brand flex items-center justify-center disabled:opacity-20"><ArrowDown className="w-3 h-3 text-white" /></button>
                         <button onClick={() => handleRemoveTopMovie(movie.id)} className="p-1.5 rounded bg-red-950/40 border border-red-500/20 hover:bg-brand flex items-center justify-center"><Trash2 className="w-3 h-3 text-red-400 hover:text-white" /></button>
                       </div>
                    </div>
                  </motion.div>
                ))}
                
                {/* Empty Slots */}
                {Array.from({ length: 5 - topTen.length }).map((_, emptyIdx) => (
                  <div 
                    key={`empty-${emptyIdx}`}
                    onClick={() => setShowSearch(true)}
                    className="shrink-0 w-48 aspect-[2/3] rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6 gap-3 group hover:border-brand/30 transition-colors cursor-pointer"
                  >
                     <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-brand/10">
                       <Plus className="w-6 h-6 text-white/20 group-hover:text-brand" />
                     </div>
                     <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Add Masterpiece<br />Slot #{topTen.length + emptyIdx + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Cards & History */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* 4. Integration & Subscription Manager */}
            <div className="bg-surface/30 border border-white/5 rounded-[40px] p-8 shadow-2xl backdrop-blur-md">
               <div className="flex items-center gap-3 mb-8">
                  <Shield className="w-5 h-5 text-brand" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Subscription DNA</h3>
               </div>
               
               <div className="space-y-4">
                  {STREAMING_PLATFORMS.map((sub) => {
                    const isActive = profile.subscriptions.includes(sub.name);
                    return (
                      <div key={sub.id} className="flex items-center justify-between group">
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 ${sub.color} rounded-xl flex items-center justify-center font-black text-lg transition-transform group-hover:scale-110`}>
                              {sub.logo}
                            </div>
                            <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">{sub.name}</span>
                         </div>
                         <button 
                          onClick={() => handleToggleSub(sub.name)}
                          className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isActive ? 'bg-brand' : 'bg-white/10'}`}
                         >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isActive ? 'left-7' : 'left-1'}`} />
                         </button>
                      </div>
                    );
                  })}
               </div>
               
               <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-white/30 tracking-widest">
                     <span>Global Preferences</span>
                     <Settings className="w-3 h-3" />
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-white/70">
                     <span>Auto-filter by my subs</span>
                     <button 
                      onClick={() => handleTogglePref('autoFilter')}
                      className={`w-10 h-5 rounded-full relative transition-all ${profile.autoFilter ? 'bg-brand' : 'bg-white/10'}`}
                     >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${profile.autoFilter ? 'left-6' : 'left-1'}`} />
                     </button>
                  </div>
               </div>
            </div>

            {/* Notification Center */}
            <div className="bg-brand/5 border border-brand/20 rounded-[40px] p-8 shadow-2xl">
               <div className="flex items-center gap-3 mb-6">
                 <Bell className="w-5 h-5 text-brand" />
                 <h3 className="text-sm font-black uppercase tracking-widest text-brand">Vigilance Hub</h3>
               </div>
               <div className="space-y-6">
                  {[
                    { key: 'notifyNewRelease', label: "New Release in Genre", desc: "Get alerted when a favorite genre epic drops." },
                    { key: 'notifyLeavingSoon', label: "Leaving Platform", desc: "Don't miss movies exiting your subs." }
                  ].map((item) => (
                    <div key={item.key} className="flex gap-4 items-center justify-between">
                       <div>
                         <p className="text-xs font-black text-white uppercase">{item.label}</p>
                         <p className="text-[10px] text-white/40 mt-1">{item.desc}</p>
                       </div>
                       <button 
                        onClick={() => handleTogglePref(item.key as any)}
                        className={`w-10 h-5 rounded-full relative transition-all ${profile[item.key as 'notifyNewRelease' | 'notifyLeavingSoon'] ? 'bg-brand' : 'bg-white/10'}`}
                       >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${profile[item.key as 'notifyNewRelease' | 'notifyLeavingSoon'] ? 'left-6' : 'left-1'}`} />
                       </button>
                    </div>
                  ))}
               </div>
            </div>

            {/* 3. Watch History Timeline */}
            <div className="bg-surface/30 border border-white/5 rounded-[40px] p-8 shadow-2xl">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-white/30" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Timeline</h3>
                  </div>
                  <button className="text-[10px] font-black text-white/20 hover:text-white transition-colors">Clear All</button>
               </div>
               
               <div className="space-y-8 relative">
                  <div className="absolute left-2.5 top-0 bottom-4 w-px bg-white/5" />
                  {watchHistory.length === 0 ? (
                    <div className="py-6 text-center text-white/25 text-[10px] uppercase font-bold tracking-wider">
                      Timeline empty. Save ratings/watchlist.
                    </div>
                  ) : (
                    watchHistory.map((item) => (
                      <div key={item.id} className="relative pl-10 group">
                         <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-surface border border-white/10 flex items-center justify-center z-10 transition-colors group-hover:border-brand">
                            <div className="w-1.5 h-1.5 bg-white/20 rounded-full group-hover:bg-brand" />
                         </div>
                         <p className="text-[10px] font-black text-brand uppercase tracking-tight">{item.action}</p>
                         <p className="text-sm font-bold text-white/80 mt-1">{item.title}</p>
                         <p className="text-[10px] text-white/30 mt-1 font-medium">{item.time}</p>
                      </div>
                    ))
                  )}
               </div>
               
               <button className="w-full mt-8 py-3 bg-white/5 hover:bg-brand/10 hover:text-brand rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/20 transition-all">
                  Show Remote Activity
               </button>
            </div>

            {/* Binge Badges / Achievements */}
            <div className="p-8 bg-surface/30 border border-white/5 rounded-[40px] shadow-2xl">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest">Binge Badges</h3>
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{badges.filter(b => b.unlocked).length} / 4 Unlocked</span>
               </div>
               <div className="space-y-4">
                  {badges.map((badge) => (
                    <div key={badge.title} className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${badge.unlocked ? 'bg-surface/50 border-white/10' : 'bg-black/20 border-dashed border-white/5 opacity-40 grayscale'}`}>
                       <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl bg-surface border border-white/5 group-hover:scale-110 transition-transform ${badge.color}`}>
                             <badge.icon className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-xs font-black text-white uppercase">{badge.title}</p>
                             <p className="text-[10px] text-white/30 font-medium">{badge.desc}</p>
                          </div>
                       </div>
                       {badge.unlocked && <CheckCircle2 className="w-4 h-4 text-brand" />}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {isEditModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-surface border border-white/10 rounded-[40px] w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl"
              >
                <div className="p-8 md:p-12 space-y-8">
                  <div className="flex items-center justify-between">
                     <h2 className="text-3xl font-black uppercase italic tracking-tight">Edit <span className="text-brand">Identity</span></h2>
                     <button onClick={() => setIsEditModalOpen(false)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10">
                        <X className="w-5 h-5" />
                     </button>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-white/40 px-2 tracking-widest">Display Name</label>
                       <input 
                         type="text" 
                         value={editDisplayName}
                         onChange={(e) => setEditDisplayName(e.target.value)}
                         className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:border-brand outline-none transition-all"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-white/40 px-2 tracking-widest">Cinematic Bio</label>
                       <textarea 
                         value={bioInput}
                         onChange={(e) => setBioInput(e.target.value)}
                         className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white/80 h-32 outline-none focus:border-brand resize-none font-medium"
                       />
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-white/40 px-2 tracking-widest">Avatar Frame</label>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {frames.map((f) => (
                            <button 
                              key={f.id}
                              onClick={() => setEditFrameId(f.id as any)}
                              className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-tight transition-all ${editFrameId === f.id ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20' : 'bg-black/20 border-white/5 text-white/40 hover:border-white/20'}`}
                            >
                              {f.name}
                            </button>
                          ))}
                       </div>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button 
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1 bg-white text-black py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand hover:text-white transition-all disabled:opacity-50"
                    >
                      {isSaving ? 'Synchronizing...' : 'Save Changes'}
                    </button>
                    <button 
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-8 bg-white/5 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                       Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Share Profile Modal */}
        <AnimatePresence>
          {isShareModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsShareModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-surface border border-white/10 rounded-[40px] w-full max-w-md relative z-10 overflow-hidden shadow-2xl"
              >
                <div className="p-8 md:p-10 space-y-8">
                  <div className="flex items-center justify-between">
                     <h2 className="text-2xl font-black uppercase italic tracking-tight">Share <span className="text-brand">Profile</span></h2>
                     <button onClick={() => setIsShareModalOpen(false)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10">
                        <X className="w-5 h-5" />
                     </button>
                  </div>

                  <p className="text-sm text-white/60 font-medium">
                    Showcase your curated masterpieces, genre analytics, and cinematic level to the world!
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Facebook */}
                    <button
                      onClick={() => {
                        if (typeof window === 'undefined' || !user) return;
                        const shareUrl = `${window.location.origin}/profile?uid=${user.uid}`;
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
                      }}
                      className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10 group transition-all"
                    >
                      <div className="w-12 h-12 bg-[#1877F2]/10 rounded-2xl flex items-center justify-center text-[#1877F2] group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 fill-[#1877F2]" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">Facebook</span>
                    </button>

                    {/* Twitter / X */}
                    <button
                      onClick={() => {
                        if (typeof window === 'undefined' || !user) return;
                        const shareUrl = `${window.location.origin}/profile?uid=${user.uid}`;
                        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check out my cinema profile on StreamFind!")}`, '_blank');
                      }}
                      className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-white/40 hover:bg-white/5 group transition-all"
                    >
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">Twitter / X</span>
                    </button>

                    {/* WhatsApp */}
                    <button
                      onClick={() => {
                        if (typeof window === 'undefined' || !user) return;
                        const shareUrl = `${window.location.origin}/profile?uid=${user.uid}`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent("Check out my cinema profile on StreamFind! " + shareUrl)}`, '_blank');
                      }}
                      className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-[#25D366]/40 hover:bg-[#25D366]/10 group transition-all"
                    >
                      <div className="w-12 h-12 bg-[#25D366]/10 rounded-2xl flex items-center justify-center text-[#25D366] group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 fill-[#25D366]" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.62.962 3.21 1.6 5.358 1.601 5.48-.001 9.938-4.46 9.94-9.94.002-2.656-1.03-5.153-2.903-7.027-1.874-1.874-4.37-2.905-7.029-2.907-5.485 0-9.944 4.46-9.946 9.942-.001 2.152.562 4.253 1.633 6.079L1.87 20.3l4.777-1.146zm11.302-5.4c-.29-.145-1.711-.844-1.976-.94-.265-.096-.458-.145-.65.145-.192.291-.745.94-.913 1.132-.168.192-.337.218-.627.072-.29-.145-1.223-.45-2.33-1.439-.861-.767-1.443-1.716-1.611-2.007-.168-.29-.018-.447.127-.591.13-.13.29-.34.435-.509.145-.168.193-.29.29-.484.096-.193.048-.363-.024-.509-.072-.145-.65-1.564-.89-2.146-.233-.56-.47-.484-.65-.494-.168-.008-.362-.01-.555-.01-.193 0-.506.072-.77.362-.265.291-1.012.99-1.012 2.416 0 1.426 1.037 2.802 1.18 2.995.145.193 2.041 3.116 4.945 4.373.69.299 1.23.478 1.65.612.693.22 1.325.19 1.825.115.557-.083 1.711-.699 1.953-1.376.24-.678.24-1.26.168-1.376-.073-.116-.265-.193-.555-.337z"/>
                        </svg>
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">WhatsApp</span>
                    </button>

                    {/* Instagram */}
                    <button
                      onClick={() => {
                        copyPublicLink();
                        alert("📸 Link Copied!\n\nInstagram doesn't support sharing links directly. We've copied your profile link to your clipboard so you can paste it in your bio or stories!");
                      }}
                      className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-[#ee2a7b]/40 hover:bg-gradient-to-tr hover:from-[#f9ce34]/10 hover:via-[#ee2a7b]/10 hover:to-[#6228d7]/10 group transition-all"
                    >
                      <div className="w-12 h-12 bg-gradient-to-tr from-[#f9ce34]/20 via-[#ee2a7b]/20 to-[#6228d7]/20 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-[#ee2a7b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                        </svg>
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">Instagram</span>
                    </button>
                  </div>

                  {/* Direct Link Copier */}
                  <div className="space-y-2 pt-4 border-t border-white/5">
                    <label className="text-[10px] font-black uppercase text-white/40 px-2 tracking-widest">Shareable Profile Link</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly
                        value={typeof window !== 'undefined' && user ? `${window.location.origin}/profile?uid=${user.uid}` : ''}
                        className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/60 font-semibold focus:outline-none"
                      />
                      <button 
                        onClick={copyPublicLink}
                        className="px-6 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all shrink-0 flex items-center gap-2"
                      >
                        {copiedLink ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                          </svg>
                        )}
                        {copiedLink ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 5. Social: Personal Reviews/Feed */}
        <div className="mt-20 space-y-12">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                 <Star className="w-6 h-6 text-brand" />
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter">Director&apos;s <span className="text-brand">Notes</span></h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {userReviews.length === 0 ? (
                <div className="md:col-span-2 py-16 bg-surface/30 border border-dashed border-white/10 rounded-[40px] text-center text-white/30 flex flex-col items-center justify-center gap-4">
                   <Film className="w-12 h-12 text-white/10" />
                   <p className="text-sm uppercase font-black tracking-widest leading-relaxed">No custom written notes submitted yet.<br />Leave reviews on details pages to fill your diary!</p>
                </div>
              ) : (
                userReviews.map((review) => (
                  <div key={review.movieId} className="p-8 bg-surface/30 border border-white/5 rounded-[32px] hover:bg-surface/40 transition-colors group flex flex-col md:flex-row gap-6">
                     <div className="w-16 md:w-20 shrink-0 h-24 md:h-28 bg-white/5 rounded-xl overflow-hidden shadow-md">
                        <img 
                          src={review.moviePoster || 'https://placehold.co/200x300?text=No+Image'} 
                          className="w-full h-full object-cover" 
                          alt={review.movieTitle} 
                        />
                     </div>
                     <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                           <div className="flex items-center justify-between mb-4">
                              <div>
                                 <p className="text-sm font-black uppercase text-white/80">{review.movieTitle}</p>
                                 <div className="flex gap-1 mt-1.5">
                                    {Array.from({ length: 5 }).map((_, s) => (
                                      <Star 
                                        key={s} 
                                        className={`w-3 h-3 ${s < review.rating ? 'text-brand fill-brand' : 'text-white/10'}`} 
                                      />
                                    ))}
                                 </div>
                              </div>
                              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest shrink-0">Critique</span>
                           </div>
                            <p className="text-white/60 text-sm leading-relaxed font-medium italic">
                              {review.reviewText ? `"${review.reviewText}"` : "Rated only, no written critique submitted."}
                            </p>

                            {additionalDetails[review.movieId] && (
                              <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                                {additionalDetails[review.movieId].director && (
                                  <div className="p-4 rounded-2xl bg-brand/5 border border-brand/20">
                                    <p className="text-[10px] font-black uppercase text-brand tracking-widest mb-1">Director's Note</p>
                                    <p className="text-white/80 text-xs italic font-medium">
                                      Directed by <span className="text-white font-bold">{additionalDetails[review.movieId].director}</span>. Behind-the-scenes trivia: This masterpiece was meticulously crafted to deliver a raw, visual-first cinematic experience.
                                    </p>
                                  </div>
                                )}
                                {additionalDetails[review.movieId].topCriticReview && (
                                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Top Critic Insight</p>
                                      <span className="text-[9px] font-black text-brand uppercase tracking-widest">By {additionalDetails[review.movieId].topCriticReview!.author}</span>
                                    </div>
                                    <p className="text-white/60 text-xs italic leading-relaxed line-clamp-3">
                                      "{additionalDetails[review.movieId].topCriticReview!.content}"
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-8">
                           <button 
                             onClick={() => handleToggleLike(review.movieId, !!review.liked)}
                             className="flex items-center gap-2 text-[10px] font-black uppercase text-white/20 hover:text-white transition-colors"
                           >
                             <Heart className={`w-4 h-4 transition-colors ${review.liked ? 'text-brand fill-brand' : 'text-white/20'}`} />
                             <span className={review.liked ? 'text-brand' : 'text-white/40'}>
                               {review.liked ? 'Liked' : 'Like'}
                             </span>
                           </button>
                           <button 
                             onClick={() => handleShareNote(review.movieId, review.movieTitle)}
                             className="flex items-center gap-2 text-[10px] font-black uppercase text-white/20 hover:text-white transition-colors"
                           >
                             <Share2 className="w-4 h-4" /> Share Note
                           </button>
                        </div>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
