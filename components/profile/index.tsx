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
  CreditCard, HelpCircle, ShieldCheck, Edit2, Crown
} from 'lucide-react';
import ProfileSettingsPanel from '../profile-settings';

import { revalidatePage } from '@/app/actions/revalidate';
import { ProfileSettings } from '@/types';
import dynamic from 'next/dynamic';
import { PremiumBadges } from '@/components/Badges';

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
    | 'channelEmail'
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
          {[1, 2, 3].map(i => (
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

  // Use the user's profile photo as a blurred cinematic banner instead of a movie backdrop
  const heroBackdrop = isOwner
    ? (user?.photoURL || profile.photoURL || null)
    : (profile.photoURL || null);

  return (
    <>
      <div className="min-h-screen bg-[#050505] text-white selection:bg-brand/30 relative pb-32">
        {/* 1. Spatial Background: VisionOS inspired mesh & ambient glows */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          {/* Ambient blur */}
          <div className="absolute inset-0 bg-[#050505]" />
          
          {heroBackdrop ? (
            <>
              <Image
                src={heroBackdrop}
                alt="Profile Cinematic Background"
                fill
                unoptimized
                className="object-cover opacity-30 mix-blend-screen blur-[40px] md:blur-[80px]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-[#050505]/80 to-[#050505]" />
            </>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-b ${getAuraColor(primaryFavGenre)} opacity-50 blur-[100px] mix-blend-screen`} />
          )}

          {/* Animated Spatial Orbs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], x: [0, 50, 0], y: [0, -50, 0] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="w-[100vw] h-[100vw] max-w-[800px] max-h-[800px] opacity-10 blur-[120px] bg-brand absolute -top-[20%] -left-[10%] rounded-full mix-blend-screen"
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0], x: [0, -50, 0], y: [0, 50, 0] }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
            className="w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] opacity-10 blur-[100px] bg-blue-500 absolute top-[20%] right-[10%] rounded-full mix-blend-screen"
          />

          {/* Noise overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.25] mix-blend-overlay" />
        </div>

        {/* Floating Action Dock (HUD) */}
        {isOwner && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 100, delay: 0.5 }}
              className="flex items-center gap-2 p-2 rounded-full bg-white/5 backdrop-blur-[40px] border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            >
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300"
                title="Edit Profile"
              >
                <Edit2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Edit Profile</span>
              </button>

              {isShareEnabled && (
                <>
                  <div className="w-px h-8 bg-white/10 mx-1" />
                  <button
                    onClick={() => handleTogglePref('isPublic')}
                    className={`p-3 rounded-full transition-all duration-300 ${profile.isPublic ? 'bg-brand/20 text-brand' : 'bg-transparent text-white/50 hover:bg-white/10'}`}
                    title={profile.isPublic ? "Public Profile" : "Private Profile"}
                  >
                    {profile.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleShareProfile}
                    className="p-3 rounded-full bg-transparent text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
                    title="Share Profile"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* 2. Spatial Main Content Area */}
        <div className="relative z-10 px-4 sm:px-6 md:px-12 pt-20 md:pt-32 pb-12 w-full max-w-7xl mx-auto flex flex-col items-center">
          
          {/* Massive Typography Name (Behind Avatar) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full text-center relative z-10 mb-[-60px] md:mb-[-100px]"
          >
            <h1 className="text-[12vw] md:text-[140px] leading-[0.8] font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/10 mix-blend-overlay">
              {isOwner
                ? (profile.displayName || user?.displayName || profile.email?.split('@')[0] || user?.email?.split('@')[0] || 'Movie Buff')
                : (profile.displayName || profile.email?.split('@')[0] || 'Movie Buff')
              }
            </h1>
          </motion.div>

          {/* Avatar floating in spatial Z-space */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
            className="relative z-20"
          >
            {isOwner && (
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            )}
            <div className={`relative w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden p-1 flex items-center justify-center ${currentFrame.containerClass} shadow-[0_30px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl border border-white/20 group hover:scale-[1.02] transition-transform duration-500 mx-auto`}>
              {currentFrame.id !== 'none' && (
                <div className={`absolute inset-[-50%] animate-[spin_4s_linear_infinite] ${currentFrame.spinClass}`} />
              )}
              
              <div className="relative z-10 w-full h-full rounded-full overflow-hidden bg-[#050505]">
                {(profile.photoURL || (isOwner && user?.photoURL)) ? (
                  <Image
                    src={isOwner ? (user?.photoURL || profile.photoURL || "") : (profile.photoURL || "")}
                    fill
                    unoptimized
                    sizes="224px"
                    className="object-cover"
                    alt="Avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center">
                    <UserIcon className="w-16 h-16 text-white/40" />
                  </div>
                )}
              </div>

              {isOwner && (
                <div 
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-full cursor-pointer z-30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingImage ? (
                    <div className="w-8 h-8 border-2 border-brand/40 border-t-brand rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-white" />
                  )}
                </div>
              )}
            </div>
            
            {/* Badges Flowing naturally below the Avatar */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-sm mx-auto">
              {profile.plan === 'ultimate' && (
                <div className="shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                  <PremiumBadges />
                </div>
              )}
              {(() => {
                const currentPlan = profile.plan || 'free';
                let colors = "from-white/10 to-white/5 border-white/20 text-white";
                let planIcon = <Activity className="w-3 h-3" />;

                if (currentPlan === 'premium') {
                  colors = "from-brand/30 to-brand/10 border-brand/40 text-brand";
                  planIcon = <Star className="w-3 h-3" />;
                } else if (currentPlan === 'ultimate') {
                  colors = "from-yellow-500/30 to-yellow-500/10 border-yellow-500/40 text-yellow-400";
                  planIcon = <Crown className="w-3 h-3" />;
                }

                return (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br ${colors} backdrop-blur-xl border rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.5)]`}>
                    {planIcon}
                    <span className="text-[10px] font-black uppercase tracking-widest">{currentPlan}</span>
                  </div>
                );
              })()}
            </div>
          </motion.div>

          {/* Email / Basic info directly under avatar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            {isOwner && user?.email && (
              <p className="text-sm font-medium text-white/50 tracking-wide">{user.email}</p>
            )}
            <p className="mt-4 text-base md:text-xl text-white/80 font-medium max-w-2xl mx-auto leading-relaxed text-balance">
              {profile.bio}
            </p>
          </motion.div>

          {/* 3. Bento Grid 2.0 (Dynamic Grid Layout) */}
          <div className="w-full mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            
            {/* Stats Cards - Spatial UI style */}
            {[
              { icon: Film, label: "Watched", value: totalHours, unit: "HR", color: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-400", delay: 0.4 },
              { icon: Activity, label: "Rank", value: frameTitle === "Apprentice" ? "B" : "A+", unit: "S2", color: "from-brand/20 to-brand/5", iconColor: "text-brand", delay: 0.5 },
              { icon: Star, label: "Rating", value: avgRating, unit: "/5", color: "from-yellow-500/20 to-yellow-500/5", iconColor: "text-yellow-400", delay: 0.6 }
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: stat.delay, type: "spring" }}
                className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/10 rounded-3xl p-6 flex items-center justify-between transition-all duration-500 backdrop-blur-2xl overflow-hidden"
              >
                {/* Internal Glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="relative z-10 flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-2">{stat.label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-lg">{stat.value}</span>
                    <span className="text-xs font-black text-white/30 uppercase tracking-widest">{stat.unit}</span>
                  </div>
                </div>
                
                <div className="relative z-10 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <stat.icon className={`w-5 h-5 ${stat.iconColor} drop-shadow-[0_0_10px_currentColor]`} />
                </div>
              </motion.div>
            ))}

            {/* Favorite Genres Bento Box (Spans 3 cols on desktop) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="md:col-span-3 bg-white/[0.03] border border-white/[0.05] rounded-3xl p-6 md:p-8 backdrop-blur-2xl"
            >
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-6">Cinematic DNA</h3>
              <div className="flex flex-wrap gap-3">
                {AVAILABLE_GENRES.map((genre) => {
                  const isActive = (profile.favoriteGenres || []).includes(genre);
                  return (
                    <span
                      key={genre}
                      onClick={() => isOwner && handleToggleGenre(genre)}
                      className={`px-5 py-2.5 rounded-full border text-xs font-black uppercase tracking-widest transition-all duration-300 ${isOwner ? 'cursor-pointer' : 'cursor-default'} ${
                        isActive
                          ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105'
                          : 'bg-transparent border-white/20 text-white/60 hover:text-white hover:border-white/50 hover:bg-white/5'
                      }`}
                    >
                      {genre}
                    </span>
                  );
                })}
              </div>
            </motion.div>

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
              onDirectSignOut={logout}
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
