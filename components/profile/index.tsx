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
