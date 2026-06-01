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
  CreditCard, HelpCircle, ShieldCheck
} from 'lucide-react';
import ProfileSettingsPanel from '../profile-settings';

import { revalidatePage } from '@/app/actions/revalidate';
import { ProfileSettings } from '@/types';

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
  { id: 'none', name: 'Original', class: 'border-white/10' },
  { id: 'neon', name: 'Cyber Neon', class: 'border-brand shadow-[0_0_30px_rgba(255,40,78,0.4)] ring-4 ring-brand/20' },
  { id: 'gold', name: 'Gold Leaf', class: 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)] ring-4 ring-yellow-500/20' },
  { id: 'ghost', name: 'Ghost Frame', class: 'border-blue-400 shadow-[0_0_30px_rgba(96,165,250,0.4)] ring-4 ring-blue-400/20 shadow-inner' }
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
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      let finalImageUrl = "";
      const formData = new FormData();
      formData.append('image', file);

      const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
      if (!IMGBB_API_KEY) throw new Error("Missing NEXT_PUBLIC_IMGBB_API_KEY");

      try {
        // PRIMARY UPLOAD: Attempt ImgBB
        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData,
        });

        if (!imgbbResponse.ok) throw new Error("ImgBB upload failed");

        const data = await imgbbResponse.json();
        finalImageUrl = data.data.url;

      } catch (imgbbError) {
        console.warn("ImgBB Upload Failed, falling back to Cloudinary...", imgbbError);

        // FALLBACK UPLOAD: Attempt Cloudinary
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
          throw new Error("ImgBB failed and Cloudinary fallback is not configured in .env.local");
        }

        const cloudinaryData = new FormData();
        cloudinaryData.append('file', file);
        cloudinaryData.append('upload_preset', uploadPreset);

        const cloudResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: cloudinaryData,
        });

        if (!cloudResponse.ok) throw new Error("Cloudinary fallback upload failed");

        const cloudJson = await cloudResponse.json();
        finalImageUrl = cloudJson.secure_url;
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
                  {(profile.photoURL || (isOwner && user?.photoURL)) ? (
                    <div className="relative w-full h-full rounded-[40px] overflow-hidden">
                      <Image
                        src={isOwner ? (user?.photoURL || profile.photoURL || "") : (profile.photoURL || "")}
                        fill
                        sizes="(max-width: 768px) 144px, 224px"
                        className="object-cover"
                        alt={isOwner ? (user?.displayName || profile.displayName || "Profile Owner") : (profile.displayName || "Profile Owner")}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-[40px] bg-white/5 flex items-center justify-center">
                      <UserIcon className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-white/30" />
                    </div>
                  )}
                </div>
                {isOwner && (
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
                )}
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
                    {isOwner
                      ? (profile.displayName || user?.displayName || profile.email?.split('@')[0] || user?.email?.split('@')[0] || 'Movie Buff')
                      : (profile.displayName || profile.email?.split('@')[0] || 'Movie Buff')
                    }
                  </h1>
                  
                  {isOwner && user?.email && (
                    <div className="flex items-center gap-2 text-white/50 mb-6 lg:justify-start justify-center">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm font-medium tracking-wide">{user.email}</span>
                    </div>
                  )}

                  {/* Bio & Glowing Tags */}
                  <div className="max-w-2xl mx-auto lg:mx-0">
                    <p className="text-white/60 font-medium text-lg leading-relaxed">
                      {profile.bio}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-6 justify-center lg:justify-start">
                      {AVAILABLE_GENRES.map((genre) => {
                        const isActive = (profile.favoriteGenres || []).includes(genre);
                        return (
                          <span
                            key={genre}
                            onClick={() => isOwner && handleToggleGenre(genre)}
                            className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-tight transition-all ${isOwner ? 'cursor-pointer' : 'cursor-default'} ${isActive
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
              {isOwner && (
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0 justify-center">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="bg-white text-black w-full lg:w-auto px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand hover:text-white transition-all shadow-xl"
                  >
                    Edit Profile
                  </button>
                  <div className="flex gap-2 w-full lg:w-auto">
                    {isShareEnabled && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats & Analytics Grid */}
      <div className="container mx-auto max-w-7xl px-6 lg:px-12 pt-12 pb-4 relative z-30 -mt-6 lg:-mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* 2. Stats & Analytics ("The Reel") */}
          <div className="lg:col-span-12 space-y-8">
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

          </div>
          </div>

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
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 sm:p-12">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
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

                  {modalError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
                      <X className="w-4 h-4 shrink-0 text-red-500" />
                      <p>{modalError}</p>
                    </div>
                  )}

                  {modalSuccess && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0 text-green-500" />
                      <p>{modalSuccess}</p>
                    </div>
                  )}

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
                      <label className="text-[10px] font-black uppercase text-white/40 px-2 tracking-widest">Email Address</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:border-brand outline-none transition-all"
                      />
                      <p className="text-[10px] text-white/30 px-2 mt-1">Changing this requires a verification email.</p>
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
                        {frames.map((f) => {
                          const isPremiumFrame = f.id !== 'none';
                          const isLocked = isPremiumFrame && profile.plan !== 'premium';
                          return (
                            <button
                              key={f.id}
                              onClick={() => {
                                if (isLocked) {
                                  toast.error("Upgrade to Premium to unlock!"); router.push('/profile?tab=payment');
                                  return;
                                }
                                setEditFrameId(f.id as any);
                              }}
                              className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-tight transition-all relative ${
                                editFrameId === f.id 
                                  ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20' 
                                  : 'bg-black/20 border-white/5 text-white/40 hover:border-white/20'
                              } ${isLocked ? 'opacity-60 cursor-not-allowed grayscale' : ''}`}
                            >
                              {f.name}
                              {isLocked && (
                                <Lock className="w-3 h-3 absolute top-2 right-2 text-white/40" />
                              )}
                            </button>
                          );
                        })}
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
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 sm:p-12">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsShareModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
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
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
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
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.62.962 3.21 1.6 5.358 1.601 5.48-.001 9.938-4.46 9.94-9.94.002-2.656-1.03-5.153-2.903-7.027-1.874-1.874-4.37-2.905-7.029-2.907-5.485 0-9.944 4.46-9.946 9.942-.001 2.152.562 4.253 1.633 6.079L1.87 20.3l4.777-1.146zm11.302-5.4c-.29-.145-1.711-.844-1.976-.94-.265-.096-.458-.145-.65.145-.192.291-.745.94-.913 1.132-.168.192-.337.218-.627.072-.29-.145-1.223-.45-2.33-1.439-.861-.767-1.443-1.716-1.611-2.007-.168-.29-.018-.447.127-.591.13-.13.29-.34.435-.509.145-.168.193-.29.29-.484.096-.193.048-.363-.024-.509-.072-.145-.65-1.564-.89-2.146-.233-.56-.47-.484-.65-.494-.168-.008-.362-.01-.555-.01-.193 0-.506.072-.77.362-.265.291-1.012.99-1.012 2.416 0 1.426 1.037 2.802 1.18 2.995.145.193 2.041 3.116 4.945 4.373.69.299 1.23.478 1.65.612.693.22 1.325.19 1.825.115.557-.083 1.711-.699 1.953-1.376.24-.678.24-1.26.168-1.376-.073-.116-.265-.193-.555-.337z" />
                        </svg>
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">WhatsApp</span>
                    </button>

                    {/* Instagram */}
                    <button
                      onClick={() => {
                        copyPublicLink();
                        toast.success("📸 Link Copied!\n\nInstagram doesn't support sharing links directly. We've copied your profile link to your clipboard so you can paste it in your bio or stories!", { duration: 6000 });
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

      </div>

      <AnimatePresence>
        {isSignOutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsSignOutModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-surface/90 border border-white/10 rounded-[32px] p-6 shadow-2xl overflow-hidden bg-black/90"
            >
              <div className="absolute top-0 right-0 p-6">
                <button
                  onClick={() => setIsSignOutModalOpen(false)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center gap-4 pt-4">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <LogOut className="w-8 h-8 text-red-500" />
                </div>
                
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Sign Out</h3>
                  <p className="text-sm text-white/50 font-medium mt-2">Are you sure you want to end your current session?</p>
                </div>

                <div className="w-full flex gap-3 mt-4">
                  <button
                    onClick={() => setIsSignOutModalOpen(false)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsSignOutModalOpen(false);
                      await logout();
                      router.push('/');
                    }}
                    className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-red-500/20"
                  >
                    Yes, Leave
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
