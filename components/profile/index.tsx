'use client';
import { getFirestore } from 'firebase/firestore';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { useWatchlist } from '@/context/WatchlistContext';
import { useRatings, UserReview } from '@/context/RatingContext';
import { getMovieAdditionalDetails, MovieAdditionalDetails } from '@/services/tmdbService';
import { Movie } from '@/types';
import { app } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, collection, query } from 'firebase/firestore';
import { updateProfile, verifyBeforeUpdateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User as UserIcon, Settings, Star, Film, Tv, Award,
  Zap, Activity, History, Shield, Bell, Lock, Globe, Share2,
  Check, Mail, Heart, LogOut, CheckCircle2,
  Coffee, Trophy, Clock, Camera, X, CornerDownRight, ChevronLeft, ChevronRight,
  CreditCard, HelpCircle, ShieldCheck, Edit2
} from 'lucide-react';
import ProfileSettingsPanel from '../profile-settings';

import { revalidatePage } from '@/app/actions/revalidate';
import { ProfileSettings } from '@/types';
import dynamic from 'next/dynamic';

const EditProfileModal = dynamic(() => import('./modals/EditProfileModal'), { ssr: false });
const ShareProfileModal = dynamic(() => import('./modals/ShareProfileModal'), { ssr: false });
const SignOutModal = dynamic(() => import('./modals/SignOutModal'), { ssr: false });

const AVAILABLE_GENRES = [
  'Sci-Fi', 'Action', 'Drama', 'Thriller', 'Comedy', 'Horror', 'Romance', 'Mystery', 'Adventure', 'Neo-Noir', 'Cyberpunk', 'Post-Apocalyptic', 'Synthwave'
];

const STREAMING_PLATFORMS = [
  { id: 'netflix', name: "Netflix", logo: "N", color: "bg-red-600" },
  { id: 'disney', name: "Disney+", logo: "D", color: "bg-blue-600" },
  { id: 'prime', name: "Prime Video", logo: "P", color: "bg-cyan-500" },
  { id: 'hbo', name: "HBO Max", logo: "H", color: "bg-purple-600" },
  { id: 'hotstar', name: "Hotstar", logo: "H", color: "bg-blue-500" },
  { id: 'jiocinema', name: "JioCinema", logo: "J", color: "bg-pink-600" },
  { id: 'sonyliv', name: "SonyLIV", logo: "S", color: "bg-yellow-500" },
  { id: 'aha', name: "Aha", logo: "A", color: "bg-orange-500" },
  { id: 'zee5', name: "Zee5", logo: "Z", color: "bg-indigo-500" },
  { id: 'apple', name: "Apple TV+", logo: "A", color: "bg-slate-700" },
];

const frames = [
  { id: 'none', name: 'Original', containerClass: 'bg-white/10', spinClass: '' },
  { id: 'neon', name: 'Cyber Neon', containerClass: 'shadow-[0_0_60px_rgba(229,9,20,0.4)] bg-brand/10', spinClass: 'bg-[conic-gradient(from_0deg,transparent_70%,rgba(229,9,20,1)_100%)]' },
  { id: 'gold', name: 'Gold Leaf', containerClass: 'shadow-[0_0_60px_rgba(251,191,36,0.3)] bg-[#FBBF24]/10', spinClass: 'bg-[conic-gradient(from_0deg,transparent_70%,rgba(251,191,36,1)_100%)]' },
  { id: 'ghost', name: 'Ghost Frame', containerClass: 'shadow-[0_0_60px_rgba(96,165,250,0.3)] bg-[#60A5FA]/10', spinClass: 'bg-[conic-gradient(from_0deg,transparent_70%,rgba(96,165,250,1)_100%)]' }
];

export default function ProfileComponent() {
  const { user, logout, loading: authLoading } = useAuth();
  const { watchlist: ownerWatchlist } = useWatchlist();
  const { userReviews: ownerReviews } = useRatings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sharedUid = searchParams ? searchParams.get('uid') : null;
  const isOwner = !sharedUid || (user && user.uid === sharedUid);
  const targetUid = sharedUid || user?.uid;

  const [sharedWatchlist, setSharedWatchlist] = useState<Movie[]>([]);
  const [sharedReviews, setSharedReviews] = useState<UserReview[]>([]);
  const [isLoadingSharedData, setIsLoadingSharedData] = useState(false);

  const watchlist = isOwner ? ownerWatchlist : sharedWatchlist;
  const userReviews = isOwner ? ownerReviews : sharedReviews;

  // SSR Hydration Safeguard
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
    }
  }, []);

  // Profile data syncing with Firestore
  const [profile, setProfile] = useState<ProfileSettings>({
    bio: "Exploring the infinite multiverse of cinema, one frame at a time. High-key addicted to neo-noirs.",
    favoriteGenres: [],
    subscriptions: ['Netflix', 'Disney+', 'HBO Max'],
    notifyNewRelease: true,
    notifyFavGenres: true,
    notifyLeavingSoon: true,
    isPublic: true,
    avatarFrame: 'none',
    top10: [],
    autoFilter: false,
    photoURL: '',
    weeklyDigest: true,
    watchRegion: 'IN',
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [bioInput, setBioInput] = useState(profile.bio);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || "");
  const [editFrameId, setEditFrameId] = useState(profile.avatarFrame);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [reauthNeeded, setReauthNeeded] = useState(false);
  const [reauthAction, setReauthAction] = useState<'email' | 'password' | 'both' | null>(null);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [isShareEnabled, setIsShareEnabled] = useState(true);
  const [systemAchievements, setSystemAchievements] = useState<{ id: string; label: string; val: string; icon: string }[]>([]);

  useEffect(() => {
    const db = getFirestore(app);
    const unsubscribe = onSnapshot(doc(db, 'system', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.flags && data.flags.share !== undefined) {
          setIsShareEnabled(data.flags.share);
        }
        if (data.achievements) {
          setSystemAchievements(data.achievements);
        }
      }
    });
    return () => unsubscribe();
  }, []);

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
      const ratingRef = doc(getFirestore(app), `users/${user.uid}/ratings/${movieId}`);
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
        toast.success(`Copied link for "${movieTitle}" to clipboard!`);
      }
    } catch (e) {
      console.error("Error sharing note:", e);
    }
  };


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
    let file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    if (file.type === 'image/svg+xml') {
      try {
        const { sanitizeSvg } = await import('@/lib/sanitizeSvg');
        const text = await file.text();
        const cleanSvg = sanitizeSvg(text);
        file = new File([cleanSvg], file.name, { type: 'image/svg+xml' });
      } catch (err) {
        console.error("Error sanitizing SVG:", err);
        toast.error("Failed to process SVG image securely.");
        return;
      }
    }

    setIsUploadingImage(true);
    try {
      let finalImageUrl = "";
      const formData = new FormData();
      formData.append('image', file);

      try {
        const proxyResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!proxyResponse.ok) {
          const errorData = await proxyResponse.json();
          throw new Error(errorData.error || "Failed to upload image via proxy");
        }

        const data = await proxyResponse.json();
        finalImageUrl = data.url;

      } catch (uploadError: any) {
        console.error("Upload failed:", uploadError);
        toast.error(uploadError.message || "Failed to upload image");
        setIsUploadingImage(false);
        return;
      }

      // Update Firebase Auth profile with the successful URL (from either service)
      await updateProfile(user, { photoURL: finalImageUrl });

      // Save photoURL to Firestore as a robust backup/sync mechanism
      const docRef = doc(getFirestore(app), `users/${user.uid}`);
      await setDoc(docRef, { photoURL: finalImageUrl }, { merge: true });

      setProfile(prev => ({ ...prev, photoURL: finalImageUrl }));

      // Force a reload to guarantee Next.js app-wide components reload the new photo URL from Auth session
      window.location.reload();
    } catch (err: any) {
      console.error("Error uploading image:", err);
      toast.error("Error uploading image: " + err.message + ". Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Load shared user's watchlist and reviews if not owner
  useEffect(() => {
    if (isOwner || !targetUid) {
      setSharedWatchlist([]);
      setSharedReviews([]);
      return;
    }

    setIsLoadingSharedData(true);
    const watchlistPath = `users/${targetUid}/watchlist`;
    const watchlistQuery = query(collection(getFirestore(app), watchlistPath));
    const unsubscribeWatchlist = onSnapshot(watchlistQuery, (snapshot) => {
      const items: Movie[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Movie);
      });
      setSharedWatchlist(items);
    }, (error) => {
      console.error("Error loading shared watchlist:", error);
    });

    const ratingsPath = `users/${targetUid}/ratings`;
    const ratingsQuery = query(collection(getFirestore(app), ratingsPath));
    const unsubscribeRatings = onSnapshot(ratingsQuery, (snapshot) => {
      const reviews: UserReview[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        reviews.push({
          movieId: Number(docSnap.id),
          rating: data.rating,
          movieTitle: data.movieTitle || 'Unknown Movie',
          moviePoster: data.moviePoster || '',
          reviewText: data.reviewText || '',
          updatedAt: data.updatedAt,
          liked: !!data.liked
        });
      });
      setSharedReviews(reviews);
      setIsLoadingSharedData(false);
    }, (error) => {
      console.error("Error loading shared ratings:", error);
      setIsLoadingSharedData(false);
    });

    return () => {
      unsubscribeWatchlist();
      unsubscribeRatings();
    };
  }, [targetUid, isOwner]);

  // One-time forced sync: when owner visits their own profile, always write latest auth data to Firestore
  useEffect(() => {
    if (!isOwner || !user || !user.uid) return;

    const syncAuthToFirestore = async () => {
      try {
        const docRef = doc(getFirestore(app), `users/${user.uid}`);
        await setDoc(docRef, {
          displayName: user.displayName || user.email?.split('@')[0] || 'Movie Buff',
          email: user.email || '',
          photoURL: user.photoURL || '',
        }, { merge: true });
      } catch (err) {
        console.error("Error syncing auth data to Firestore:", err);
      }
    };

    syncAuthToFirestore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isOwner]);

  // Firestore read
  useEffect(() => {
    if (!targetUid) return;

    const path = `users/${targetUid}`;
    const docRef = doc(getFirestore(app), path);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ProfileSettings & { frameId?: string; email?: string; displayName?: string };

        // Proactively write email/displayName/photoURL to Firestore if they are missing, empty, or outdated
        const hasMissingEmail = !data.email && user?.email;
        const hasMissingDisplayName = !data.displayName && user?.displayName;
        const hasMissingPhoto = !data.photoURL && user?.photoURL;
        const hasMismatchedEmail = data.email && user?.email && data.email !== user.email;
        const hasMismatchedName = data.displayName && user?.displayName && data.displayName !== user.displayName;
        const hasMismatchedPhoto = data.photoURL && user?.photoURL && data.photoURL !== user.photoURL;

        if (isOwner && user && (
          hasMissingEmail || 
          hasMissingDisplayName || 
          hasMissingPhoto || 
          hasMismatchedEmail || 
          hasMismatchedName || 
          hasMismatchedPhoto
        )) {
          setDoc(docRef, {
            email: user.email || data.email || '',
            displayName: user.displayName || data.displayName || user.email?.split('@')[0] || 'Movie Buff',
            photoURL: user.photoURL || data.photoURL || ''
          }, { merge: true }).catch(console.error);
        }

        setProfile(prev => ({
          ...prev,
          ...data,
          // Guard all fields: prefer Firestore data over defaults, but keep previous if Firestore has empty value
          displayName: data.displayName || prev.displayName,
          email: data.email || prev.email,
          favoriteGenres: data.favoriteGenres || prev.favoriteGenres,
          subscriptions: data.subscriptions || prev.subscriptions,
          top10: data.top10 || prev.top10,
          avatarFrame: (data.avatarFrame || data.frameId || prev.avatarFrame) as ProfileSettings['avatarFrame'],
          bio: data.bio || prev.bio,
          autoFilter: data.autoFilter !== undefined ? data.autoFilter : prev.autoFilter,
          photoURL: data.photoURL || prev.photoURL,
          notifyFavGenres: data.notifyFavGenres !== undefined ? data.notifyFavGenres : prev.notifyFavGenres,
        }));
      } else {
        // Initialize user document in Firestore if it doesn't exist
        if (isOwner && user) {
          setDoc(docRef, {
            bio: "Exploring the infinite multiverse of cinema, one frame at a time. High-key addicted to neo-noirs.",
            favoriteGenres: [],
            subscriptions: ['Netflix', 'Disney+', 'HBO Max'],
            notifyNewRelease: true,
            notifyFavGenres: true,
            notifyLeavingSoon: true,
            isPublic: true,
            avatarFrame: 'none',
            top10: [],
            autoFilter: false,
            photoURL: user.photoURL || '',
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'Movie Buff'
          }).catch(console.error);
        }
      }
    }, (error) => {
      console.error("Profile onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, [targetUid, isOwner, user]);

  // Modals sync
  useEffect(() => {
    if (isEditModalOpen) {
      setBioInput(profile.bio);
      setEditDisplayName(user?.displayName || user?.email?.split('@')[0] || "");
      setEditFrameId(profile.avatarFrame);
      setNewEmail(user?.email || "");
      setNewPassword("");
      setCurrentPassword("");
      setReauthNeeded(false);
      setReauthAction(null);
      setModalError("");
      setModalSuccess("");
    }
  }, [isEditModalOpen, profile.bio, profile.avatarFrame, user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    setModalError('');
    setModalSuccess('');
    try {
      const docRef = doc(getFirestore(app), `users/${user.uid}`);

      // Save both avatarFrame and frameId (for backward compatibility with Vite app)
      const savePromise = setDoc(docRef, {
        bio: bioInput,
        avatarFrame: editFrameId,
        frameId: editFrameId,
        displayName: editDisplayName
      }, { merge: true });

      const authPromise = editDisplayName !== user.displayName
        ? updateProfile(user, { displayName: editDisplayName })
        : Promise.resolve();

      await Promise.all([savePromise, authPromise]);

      setProfile(prev => ({ ...prev, bio: bioInput, avatarFrame: editFrameId, displayName: editDisplayName }));

      const emailChanged = newEmail && newEmail !== user.email;
      const passwordChanged = newPassword && newPassword.length >= 6;

      if (emailChanged || passwordChanged) {
        if (currentPassword) {
          const credential = EmailAuthProvider.credential(user.email || '', currentPassword);
          await reauthenticateWithCredential(user, credential);
        }

        try {
          if (emailChanged) {
            await verifyBeforeUpdateEmail(user, newEmail);
            toast.success(`Verification link sent to ${newEmail}. Please verify before your email is updated.`);
          }
          if (passwordChanged) {
            await updatePassword(user, newPassword);
          }
        } catch (authError: any) {
          if (authError.code === 'auth/requires-recent-login') {
            setReauthNeeded(true);
            setReauthAction(emailChanged && passwordChanged ? 'both' : emailChanged ? 'email' : 'password');
            setIsSaving(false);
            return;
          } else {
            throw authError;
          }
        }
      }

      setModalSuccess("Profile updated successfully!");
      toast.success("Profile updated successfully!");
      setTimeout(() => {
        setIsEditModalOpen(false);
      }, 1500);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      let msg = error.message || "An error occurred while saving the profile.";
      if (error.code === 'auth/invalid-email') {
        msg = "Invalid email address.";
      } else if (error.code === 'auth/weak-password') {
        msg = "Password should be at least 6 characters.";
      } else if (error.code === 'auth/email-already-in-use') {
        msg = "This email is already registered to another account.";
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        msg = "Incorrect current password. Reauthentication failed.";
      }
      setModalError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSub = async (platformName: string) => {
    if (!user) return;
    let updatedSubs = [...(profile.subscriptions || [])];
    if (updatedSubs.includes(platformName)) {
      updatedSubs = updatedSubs.filter(s => s !== platformName);
    } else {
      updatedSubs.push(platformName);
    }

    try {
      const docRef = doc(getFirestore(app), `users/${user.uid}`);
      await setDoc(docRef, { subscriptions: updatedSubs }, { merge: true });
      toast.success(updatedSubs.includes(platformName) ? `Subscribed to ${platformName}` : `Unsubscribed from ${platformName}`);
      router.refresh();
      // Instantly trigger server-side revalidation of home and browse pages
      revalidatePage('/');
      revalidatePage('/browse');
    } catch (err) {
      console.error("Error toggling subscriptions:", err);
      toast.error("Failed to update subscription");
    }
  };

  const handleTogglePref = async (field: 
    | 'notifyNewRelease' | 'notifyLeavingSoon' | 'isPublic' | 'autoFilter'
    | 'notifyFavGenres' | 'weeklyDigest'
    | 'notifyNewEpisodes' | 'notifyNewSeasons'
    | 'notifyPlatformAdded' | 'notifyNewFeatures'
    | 'notifyWatchHistoryRecs' | 'notifySimilarContent'
    | 'notifyTrendingGenres'
    | 'channelEmail' | 'channelPush' | 'channelBrowser'
  ) => {
    if (!user) return;
    try {
      // Read the effective current value — match the UI default of `true` for undefined fields
      const currentValue = (profile[field] as boolean | undefined) ?? true;
      const newValue = !currentValue;
      const docRef = doc(getFirestore(app), `users/${user.uid}`);
      await setDoc(docRef, { [field]: newValue }, { merge: true });
      setProfile(prev => ({ ...prev, [field]: newValue }));
      toast.success("Preference updated");
      router.refresh();
      // Instantly trigger server-side revalidation of home and browse pages
      revalidatePage('/');
      revalidatePage('/browse');
    } catch (err) {
      console.error("Error updating preference:", err);
      toast.error("Failed to update preference");
    }
  };

  const handleRegionChange = async (region: string) => {
    if (!user) return;
    try {
      const docRef = doc(getFirestore(app), `users/${user.uid}`);
      await setDoc(docRef, { watchRegion: region }, { merge: true });
      setProfile(prev => ({ ...prev, watchRegion: region }));
      toast.success(`Region updated to ${region}`);
      router.refresh();
      // Instantly trigger server-side revalidation of home and browse pages
      revalidatePage('/');
      revalidatePage('/browse');
    } catch (err) {
      console.error("Error updating region:", err);
      toast.error("Failed to update region");
    }
  };

  const handleToggleGenre = async (genre: string) => {
    if (!user) return;
    let updatedGenres = [...(profile.favoriteGenres || [])];
    let isFirstGenreSelection = false;

    if (updatedGenres.includes(genre)) {
      updatedGenres = updatedGenres.filter(g => g !== genre);
    } else {
      updatedGenres.push(genre);
      if (!profile.favoriteGenres || profile.favoriteGenres.length === 0) {
        isFirstGenreSelection = true;
      }
    }

    try {
      const docRef = doc(getFirestore(app), `users/${user.uid}`);
      await setDoc(docRef, { favoriteGenres: updatedGenres }, { merge: true });

      if (isFirstGenreSelection) {
        fetch('/api/notify/welcome-genre', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            email: profile.email || user.email,
            displayName: profile.displayName || user.displayName || user.email,
            genre: genre
          })
        }).catch(console.error);
      }
      toast.success(updatedGenres.includes(genre) ? `Added ${genre} to favorites` : `Removed ${genre} from favorites`);
    } catch (err) {
      console.error("Error toggling genre:", err);
      toast.error("Failed to update favorite genres");
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

  const primaryFavGenre = profile.favoriteGenres?.[0] || 'Default';
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


  const currentFrame = frames.find(f => f.id === profile.avatarFrame) || frames[0];

  // Wait for Firebase auth to finish initializing before deciding if user is logged in.
  // Without this guard, navigating back from a shared link (/profile?uid=XYZ) to /profile
  // briefly has user=null while auth loads, incorrectly showing "Member Access Required".
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 rounded-full bg-white/5 animate-pulse" />
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-48 rounded-full bg-white/5 animate-pulse" />
          <div className="h-4 w-32 rounded-full bg-white/5 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 w-28 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user && !sharedUid) {
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
    <>
      <div className="min-h-screen bg-[#050505] text-white selection:bg-brand/30">
        {/* 1. Identity & Visuals: Aura Header */}
        <div className={`min-h-0 lg:min-h-[60vh] lg:h-auto flex flex-col justify-center relative overflow-hidden transition-colors duration-1000 bg-gradient-to-b ${getAuraColor(primaryFavGenre)}`}>
          {/* Animated Background Mesh & Noise */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent z-10" />

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="w-[150%] h-[150%] opacity-30 blur-[100px] bg-brand/20 absolute -top-1/4 -left-1/4 rounded-full mix-blend-screen"
            />
          </div>

          <div className="relative z-20 px-2 sm:px-4 md:px-8 pt-6 sm:pt-12 md:pt-16 pb-2 w-full max-w-7xl mx-auto">
            
            {/* The Bento Glass Container */}
            <div className="relative w-full bg-gradient-to-br from-[#1a1a1a]/80 to-[#050505]/90 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[2rem] lg:rounded-[2.5rem] px-4 sm:px-6 md:px-12 py-6 md:py-8 shadow-[0_30px_100px_-20px_rgba(0,0,0,1)] overflow-hidden flex flex-col lg:flex-row gap-6 lg:gap-16 items-center lg:items-start group/bento transition-all duration-700">
              
              {/* Premium Inner Highlight & Glows */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-[2.5rem] lg:rounded-[3rem]" />
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-brand/10 via-transparent to-transparent opacity-0 group-hover/bento:opacity-100 blur-[100px] transition-opacity duration-1000 pointer-events-none" />
              
              {/* Left Column: Avatar & Actions */}
              <div className="relative z-10 flex flex-row lg:flex-col items-center lg:items-center justify-center shrink-0 w-full lg:w-auto gap-4 sm:gap-8 lg:gap-0">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="relative group mb-0 lg:mb-8 shrink-0"
                >
                  {/* Rotating Gradient Border Container */}
                  <div className={`relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-[1.5rem] md:rounded-[1.75rem] overflow-hidden p-[3px] flex items-center justify-center ${currentFrame.containerClass} shadow-[0_0_40px_rgba(0,0,0,0.5)]`}>
                    
                    {/* The spinning gradient layer */}
                    {currentFrame.id !== 'none' && (
                      <div className={`absolute inset-[-50%] animate-[spin_4s_linear_infinite] ${currentFrame.spinClass}`} />
                    )}
                    
                    {/* The Inner Dark Container that holds the image */}
                    <div className="relative z-10 w-full h-full rounded-[1.35rem] md:rounded-[1.6rem] overflow-hidden bg-[#0a0a0a]/90 backdrop-blur-xl p-1 md:p-1.5">
                      {(profile.photoURL || (isOwner && user?.photoURL)) ? (
                        <div className="relative w-full h-full rounded-[1rem] md:rounded-[1.25rem] overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                          <Image
                            src={isOwner ? (user?.photoURL || profile.photoURL || "") : (profile.photoURL || "")}
                            fill
                            sizes="(max-width: 768px) 160px, 192px"
                            className="object-cover"
                            alt={isOwner ? (user?.displayName || profile.displayName || "Profile Owner") : (profile.displayName || "Profile Owner")}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-[1.25rem] bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/5">
                          <UserIcon className="w-12 h-12 text-white/40 drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit Avatar Button */}
                  {isOwner && (
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="absolute -bottom-2 -right-2 w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-[#2a2a2a] to-[#111] backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:border-brand hover:shadow-[0_0_20px_rgba(229,9,20,0.4)] transition-all group/cam z-30"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploadingImage ? (
                        <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-brand/40 border-t-brand rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover/cam:scale-110 transition-transform" />
                      )}
                    </motion.div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </motion.div>

                {/* Right side for mobile / Stacked bottom for desktop */}
                <div className="flex-1 flex flex-col justify-center items-center gap-2 sm:gap-4 w-full min-w-[140px] max-w-[200px] lg:max-w-[180px]">
                  {/* Badges Stacked under Avatar */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-center gap-1.5 sm:gap-2.5 w-full"
                  >
                    <div className="w-full flex items-center bg-gradient-to-r from-white/10 to-transparent backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl p-1 shadow-lg hover:border-white/20 transition-colors">
                      <div className="bg-gradient-to-br from-brand/80 to-brand/40 text-white rounded-[0.6rem] sm:rounded-[0.8rem] w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(229,9,20,0.5)]">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                      <div className="flex-1 text-center pr-1 sm:pr-2">
                        <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-white drop-shadow-md">
                          {level} Level
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 px-2 py-1.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-lg text-center relative overflow-hidden">
                      {/* Subtle shine effect */}
                      <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-[shine_4s_ease-in-out_infinite]" />
                      <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50 font-black text-[7px] sm:text-[10px] md:text-xs tracking-[0.15em] sm:tracking-[0.25em] uppercase whitespace-nowrap">
                        {profile.avatarFrame !== 'none' ? `${currentFrame.name} Member` : 'Standard'}
                      </span>
                    </div>
                  </motion.div>

                  {/* Call to Actions */}
                  {isOwner && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex flex-row lg:flex-col gap-1.5 sm:gap-2.5 w-full"
                    >
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex-1 lg:w-full flex items-center justify-center bg-gradient-to-b from-white/20 to-white/5 hover:from-white/30 hover:to-white/10 text-white border border-white/20 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] backdrop-blur-md"
                        title="Edit Profile"
                      >
                        <span className="hidden lg:block font-black text-xs uppercase tracking-[0.2em]">Edit Profile</span>
                        <Edit2 className="w-3 h-3 sm:w-4 sm:h-4 lg:hidden" />
                      </button>
                      
                      {isShareEnabled && (
                        <>
                          <button
                            onClick={() => handleTogglePref('isPublic')}
                            className={`flex-1 py-2 sm:py-3 rounded-xl sm:rounded-2xl border transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-md shadow-lg ${profile.isPublic ? 'bg-gradient-to-br from-brand/20 to-transparent border-brand/40 text-brand shadow-[0_0_20px_rgba(229,9,20,0.2)]' : 'bg-gradient-to-br from-white/10 to-white/5 border-white/10 text-white/50 hover:text-white'}`}
                            title={profile.isPublic ? "Public Profile" : "Private Profile"}
                          >
                            {profile.isPublic ? <Globe className="w-3 h-3 sm:w-4 sm:h-4" /> : <Lock className="w-3 h-3 sm:w-4 sm:h-4" />}
                            <span className="hidden lg:hidden font-black text-xs uppercase tracking-[0.2em] ml-2">Public</span>
                          </button>
                          <button
                            onClick={handleShareProfile}
                            className="flex-1 py-2 sm:py-3 flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white/70 hover:text-white hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 backdrop-blur-md shadow-lg"
                            title="Share Profile"
                          >
                            <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Right Column: Name, Bio, Tags */}
              <div className="relative z-10 flex flex-col items-center lg:items-start flex-1 text-center lg:text-left mt-4 lg:mt-0">
                {/* Typography: Name & Email */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-6 lg:mb-8"
                >
                  <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-[#f0f0f0] to-[#888] drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] mb-3 lg:mb-4 leading-[1.1]">
                    {isOwner
                      ? (profile.displayName || user?.displayName || profile.email?.split('@')[0] || user?.email?.split('@')[0] || 'Movie Buff')
                      : (profile.displayName || profile.email?.split('@')[0] || 'Movie Buff')
                    }
                  </h1>
                  
                  {isOwner && user?.email && (
                    <div className="flex items-center justify-center lg:justify-start gap-2.5 text-white/80 bg-gradient-to-r from-white/10 to-transparent pr-6 pl-4 py-2.5 rounded-full inline-flex border border-white/10 backdrop-blur-md shadow-inner">
                      <div className="bg-brand/20 p-1 rounded-full">
                        <Mail className="w-3.5 h-3.5 text-brand" />
                      </div>
                      <span className="text-sm font-semibold tracking-wide">{user.email}</span>
                    </div>
                  )}
                </motion.div>

                {/* Bio */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-6 lg:mb-8 w-full max-w-3xl px-2 lg:px-0"
                >
                  <p className="text-white/80 font-medium text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed text-balance lg:text-left drop-shadow-md">
                    {profile.bio}
                  </p>
                </motion.div>

                {/* Glowing Tags */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-wrap gap-2.5 justify-center lg:justify-start w-full"
                >
                  {AVAILABLE_GENRES.map((genre) => {
                    const isActive = (profile.favoriteGenres || []).includes(genre);
                    return (
                      <span
                        key={genre}
                        onClick={() => isOwner && handleToggleGenre(genre)}
                        className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 shadow-lg ${isOwner ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0' : 'cursor-default'} ${isActive
                            ? 'bg-gradient-to-br from-brand/20 to-brand/5 border-brand/50 text-brand shadow-[0_0_20px_rgba(229,9,20,0.3)] backdrop-blur-md'
                            : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white/90 hover:border-white/30 hover:bg-white/10 backdrop-blur-sm'
                          }`}
                      >
                        {genre}
                      </span>
                    );
                  })}
                </motion.div>
              </div>

              {/* Far Right Column: Seamless Stats Panel */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="relative z-10 w-full lg:w-80 shrink-0 mt-6 lg:mt-0 flex flex-col"
              >
                <div className="w-full bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-[1.5rem] lg:rounded-[2rem] p-4 sm:p-6 lg:p-8 flex flex-row lg:flex-col justify-around lg:justify-start gap-4 sm:gap-5 lg:gap-6 shadow-2xl relative overflow-hidden group">
                  {/* Subtle hover background glow */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  
                  {[
                    { icon: Film, label: "Watched", value: totalHours, unit: "HR", iconColor: "text-blue-400" },
                    { icon: Activity, label: "Rank", value: frameTitle === "Apprentice" ? "B" : "A+", unit: "S2", iconColor: "text-brand" },
                    { icon: Star, label: "Rating", value: avgRating, unit: "/5", iconColor: "text-yellow-400" }
                  ].map((stat, index) => (
                    <div key={stat.label} className="w-full lg:w-auto">
                      <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 sm:gap-3 lg:gap-5 group/stat text-center lg:text-left">
                        <div className={`relative shrink-0 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-[0.8rem] lg:rounded-[1rem] bg-white/[0.03] flex items-center justify-center shadow-inner group-hover/stat:bg-white/[0.08] transition-colors duration-500`}>
                          <stat.icon className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ${stat.iconColor} drop-shadow-[0_0_15px_currentColor]`} />
                        </div>

                        <div className="flex flex-col items-center lg:items-start">
                          <div className="flex items-baseline gap-1 lg:gap-1.5">
                            <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/60 drop-shadow-md">
                              {stat.value}
                            </span>
                            <span className="hidden sm:inline-block text-[8px] lg:text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{stat.unit}</span>
                          </div>
                          <p className="text-[8px] lg:text-[9px] font-black text-white/40 uppercase tracking-[0.1em] lg:tracking-[0.2em] mt-0.5 group-hover/stat:text-white/80 transition-colors duration-300">
                            {stat.label}
                          </p>
                        </div>
                      </div>
                      
                      {/* Divider for desktop */}
                      {index < 2 && (
                        <div className="hidden lg:block w-full h-px bg-gradient-to-r from-white/[0.05] via-white/[0.05] to-transparent mt-6" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>

            </div>
          </div>
        </div>

      {/* Main Container for Settings & Content Below */}
      <div className="container mx-auto max-w-7xl px-2 sm:px-4 lg:px-12 pt-2 pb-4 relative z-30">

        {/* Settings Tabs Panel */}
        {isOwner && (
          <ProfileSettingsPanel
            user={user}
            profile={profile}
            setProfile={setProfile}
            isOwner={isOwner}
            watchlist={watchlist}
            userReviews={userReviews}
            handleTogglePref={handleTogglePref}
            handleRegionChange={handleRegionChange}
            handleToggleSub={handleToggleSub}
            additionalDetails={additionalDetails}
            handleToggleLike={handleToggleLike}
            handleShareNote={handleShareNote}
            onSignOut={() => setIsSignOutModalOpen(true)}
            systemAchievements={systemAchievements}
          />
        )}
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isOwner && isEditModalOpen && (
          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            modalError={modalError}
            modalSuccess={modalSuccess}
            editDisplayName={editDisplayName}
            setEditDisplayName={setEditDisplayName}
            newEmail={newEmail}
            setNewEmail={setNewEmail}
            bioInput={bioInput}
            setBioInput={setBioInput}
            editFrameId={editFrameId}
            setEditFrameId={setEditFrameId}
            frames={frames}
            isSaving={isSaving}
            handleSaveProfile={handleSaveProfile}
            profile={profile}
          />
        )}
      </AnimatePresence>

      {/* Share Profile Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <ShareProfileModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            user={user}
          />
        )}
      </AnimatePresence>

      </div>

      <AnimatePresence>
        {isSignOutModalOpen && (
          <SignOutModal
            isOpen={isSignOutModalOpen}
            onClose={() => setIsSignOutModalOpen(false)}
            logout={logout}
          />
        )}
      </AnimatePresence>
    </>
  );
}
