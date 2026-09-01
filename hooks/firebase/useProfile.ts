'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { ProfileSettings } from '@/types';
import { Movie } from '@/types';
import { UserReview } from '@/context/RatingContext';
import {
  subscribeToProfile,
  subscribeToSharedWatchlist,
  subscribeToSharedRatings,
  saveProfileEdit,
  saveSubscriptions,
  savePreference,
  saveWatchRegion,
  saveFavoriteGenres,
  toggleRatingLike,
  initUserProfile,
  updateUserProfile,
} from '@/services/firebase/profileService';

const DEFAULT_PROFILE: ProfileSettings = {
  bio: "Exploring the infinite multiverse of cinema, one frame at a time.",
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
};

interface UseProfileResult {
  profile: ProfileSettings;
  setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>;
  isOwner: boolean;
  targetUid: string | undefined;
  sharedWatchlist: Movie[];
  sharedReviews: UserReview[];
  isLoadingSharedData: boolean;
  // Actions
  handleToggleLike: (movieId: number, currentLiked: boolean) => Promise<void>;
  handleSaveProfileEdit: (fields: { bio: string; avatarFrame: string; displayName: string }) => Promise<void>;
  handleToggleSub: (platformName: string) => Promise<void>;
  handleTogglePref: (field: string) => Promise<void>;
  handleRegionChange: (region: string) => Promise<void>;
  handleToggleGenre: (genre: string, profileEmail?: string, profileDisplayName?: string, onFirstGenreCallback?: (genre: string) => void) => Promise<void>;
  handleSavePhotoURL: (photoURL: string) => Promise<void>;
}

/**
 * useProfile — React hook that wires up realtime profile subscriptions and
 * exposes typed write actions. All Firebase operations are delegated to
 * profileService.ts — this hook only manages React state and lifecycle.
 */
export function useProfile(): UseProfileResult {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const sharedUid = searchParams ? searchParams.get('uid') : null;
  const isOwner = !sharedUid || (!!user && user.uid === sharedUid);
  const targetUid = sharedUid || user?.uid;

  const [profile, setProfile] = useState<ProfileSettings>(DEFAULT_PROFILE);
  const [sharedWatchlist, setSharedWatchlist] = useState<Movie[]>([]);
  const [sharedReviews, setSharedReviews] = useState<UserReview[]>([]);
  const [isLoadingSharedData, setIsLoadingSharedData] = useState(false);

  // ── Main profile subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!targetUid) return;

    const unsubscribe = subscribeToProfile(
      targetUid,
      (data) => {
        if (data) {
          setProfile((prev) => ({
            ...prev,
            ...data,
            displayName: (data.displayName as string) || prev.displayName,
            email: (data.email as string) || prev.email,
            favoriteGenres: (data.favoriteGenres as string[]) || prev.favoriteGenres,
            subscriptions: (data.subscriptions as string[]) || prev.subscriptions,
            top10: (data.top10 as any[]) || prev.top10,
            avatarFrame: ((data.avatarFrame || data.frameId || prev.avatarFrame) as ProfileSettings['avatarFrame']),
            bio: (data.bio as string) || prev.bio,
            autoFilter: data.autoFilter !== undefined ? data.autoFilter as boolean : prev.autoFilter,
            photoURL: (data.photoURL as string) || prev.photoURL,
            notifyFavGenres: data.notifyFavGenres !== undefined ? data.notifyFavGenres as boolean : prev.notifyFavGenres,
          }));

          // Proactively sync auth data into Firestore if missing/outdated
          if (isOwner && user) {
            const hasMissingEmail = !data.email && user.email;
            const hasMissingName = !data.displayName && user.displayName;
            const hasMissingPhoto = !data.photoURL && user.photoURL;
            const mismatchedEmail = data.email && user.email && data.email !== user.email;
            const mismatchedName = data.displayName && user.displayName && data.displayName !== user.displayName;
            const mismatchedPhoto = data.photoURL && user.photoURL && data.photoURL !== user.photoURL;

            if (hasMissingEmail || hasMissingName || hasMissingPhoto || mismatchedEmail || mismatchedName || mismatchedPhoto) {
              updateUserProfile(targetUid, {
                email: user.email || data.email || '',
                displayName: user.displayName || data.displayName || user.email?.split('@')[0] || 'Movie Buff',
                photoURL: user.photoURL || data.photoURL || '',
              }).catch(console.error);
            }
          }
        } else if (isOwner && user) {
          // Document doesn't exist: bootstrap it
          initUserProfile(targetUid, {
            ...DEFAULT_PROFILE,
            photoURL: user.photoURL || '',
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'Movie Buff',
          }).catch(console.error);
        }
      }
    );

    return () => unsubscribe();
  }, [targetUid, isOwner, user]);

  // ── Shared profile subscriptions (only when viewing another user's profile) ──
  useEffect(() => {
    if (isOwner || !targetUid) {
      setSharedWatchlist([]);
      setSharedReviews([]);
      return;
    }

    setIsLoadingSharedData(true);

    const unsubWatchlist = subscribeToSharedWatchlist(
      targetUid,
      setSharedWatchlist,
      () => {}
    );

    const unsubRatings = subscribeToSharedRatings(
      targetUid,
      (reviews) => {
        setSharedReviews(reviews);
        setIsLoadingSharedData(false);
      },
      () => setIsLoadingSharedData(false)
    );

    return () => {
      unsubWatchlist();
      unsubRatings();
    };
  }, [targetUid, isOwner]);

  // ── Write Actions ────────────────────────────────────────────────────────────

  const handleToggleLike = useCallback(async (movieId: number, currentLiked: boolean) => {
    if (!user) return;
    await toggleRatingLike(user.uid, movieId, !currentLiked);
  }, [user]);

  const handleSaveProfileEdit = useCallback(async (fields: { bio: string; avatarFrame: string; displayName: string }) => {
    if (!user) return;
    await saveProfileEdit(user.uid, fields);
    setProfile((prev) => ({ ...prev, ...fields, avatarFrame: fields.avatarFrame as ProfileSettings['avatarFrame'] }));
  }, [user]);

  const handleToggleSub = useCallback(async (platformName: string) => {
    if (!user) return;
    const updatedSubs = profile.subscriptions?.includes(platformName)
      ? (profile.subscriptions || []).filter((s) => s !== platformName)
      : [...(profile.subscriptions || []), platformName];
    await saveSubscriptions(user.uid, updatedSubs);
  }, [user, profile.subscriptions]);

  const handleTogglePref = useCallback(async (field: string) => {
    if (!user) return;
    const currentValue = ((profile as any)[field] as boolean | undefined) ?? true;
    const newValue = !currentValue;
    await savePreference(user.uid, field, newValue);
    setProfile((prev) => ({ ...prev, [field]: newValue }));
  }, [user, profile]);

  const handleRegionChange = useCallback(async (region: string) => {
    if (!user) return;
    await saveWatchRegion(user.uid, region);
    setProfile((prev) => ({ ...prev, watchRegion: region }));
  }, [user]);

  const handleToggleGenre = useCallback(async (
    genre: string,
    profileEmail?: string,
    profileDisplayName?: string,
    onFirstGenreCallback?: (genre: string) => void
  ) => {
    if (!user) return;
    const currentGenres = profile.favoriteGenres || [];
    const updatedGenres = currentGenres.includes(genre)
      ? currentGenres.filter((g) => g !== genre)
      : [...currentGenres, genre];

    const isFirstSelection = currentGenres.length === 0 && !currentGenres.includes(genre);
    await saveFavoriteGenres(user.uid, updatedGenres);
    if (isFirstSelection && onFirstGenreCallback) {
      onFirstGenreCallback(genre);
    }
  }, [user, profile.favoriteGenres]);

  const handleSavePhotoURL = useCallback(async (photoURL: string) => {
    if (!user) return;
    // Imported from service directly inside caller for simplicity, but we expose via hook for encapsulation
    const { savePhotoURL } = await import('@/services/firebase/profileService');
    await savePhotoURL(user.uid, photoURL);
    setProfile((prev) => ({ ...prev, photoURL }));
  }, [user]);

  return {
    profile,
    setProfile,
    isOwner,
    targetUid,
    sharedWatchlist,
    sharedReviews,
    isLoadingSharedData,
    handleToggleLike,
    handleSaveProfileEdit,
    handleToggleSub,
    handleTogglePref,
    handleRegionChange,
    handleToggleGenre,
    handleSavePhotoURL,
  };
}
