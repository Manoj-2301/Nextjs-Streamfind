/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProfileSettings } from '@/types';
import { Movie } from '@/types';
import { AuditEvent } from '@/lib/auditLogger';
import {
  saveTop5,
  saveDnaMoods,
  saveFieldValue,
  subscribeToTrackedReleases,
  setTrackedRelease,
  subscribeToActiveSessions,
  subscribeToAuditLogs,
  subscribeToBilling,
} from '@/services/firebase/profileService';
import { revalidatePage } from '@/app/actions/revalidate';
import { notify as toast } from '@/lib/notify';
import { useRouter } from 'next/navigation';

/*
 * ============================================================
 * TYPES
 * ============================================================
 */
interface UseProfileSettingsReturn {
  // Tracked releases
  trackedReleases: number[];
  handleToggleTrackedRelease: (movieId: number, movieTitle: string, profile: ProfileSettings, handleTogglePref: (f: string) => Promise<void>) => Promise<void>;

  // Top 5
  handleAddTopMovie: (movie: Movie, profile: ProfileSettings, setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>) => Promise<void>;
  handleRemoveTopMovie: (movieId: number, profile: ProfileSettings, setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>) => Promise<void>;
  handleMoveTopMovie: (index: number, direction: 'up' | 'down', profile: ProfileSettings, setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>) => Promise<void>;

  // DNA moods
  handleToggleDnaMood: (mood: string, profile: ProfileSettings, setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>) => Promise<void>;

  // Local toggle / select (generic preference)
  handleLocalToggle: (field: keyof ProfileSettings, profile: ProfileSettings, setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>) => Promise<void>;
  handleLocalSelect: (field: keyof ProfileSettings, value: unknown, setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>) => Promise<void>;

  // Active sessions
  activeSessions: any[];

  // Audit logs
  auditLogs: AuditEvent[];
  totalAuditLogs: number;

  // Billing
  billingPlan: string;
  invoices: any[];
  renewalDate: string;
}

export interface ProfileSettingsOptions {
  fetchTracking?: boolean;
  fetchSessions?: boolean;
  fetchAuditLogs?: boolean;
  fetchBilling?: boolean;
}

export function useProfileSettings(options: ProfileSettingsOptions = {}): UseProfileSettingsReturn {
  const { user } = useAuth();
  const router = useRouter();

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */

  /*
   * ============================================================
   * TRACKED RELEASES
   * ============================================================
   */
  const [trackedReleases, setTrackedReleases] = useState<number[]>([]);

  useEffect(() => {
    if (!user?.uid || !options.fetchTracking) return;
    const unsub = subscribeToTrackedReleases(user.uid, setTrackedReleases);
    return unsub;
  }, [user?.uid, options.fetchTracking]);

  /*
   * ============================================================
   * EVENT HANDLERS
   * ============================================================
   */
  const handleToggleTrackedRelease = useCallback(
    async (
      movieId: number,
      movieTitle: string,
      profile: ProfileSettings,
      handleTogglePref: (f: string) => Promise<void>
    ) => {
      if (!user?.uid) { toast.error('Please log in to track releases'); return; }
      const isTracked = trackedReleases.includes(movieId);
      try {
        await setTrackedRelease(user.uid, movieId, !isTracked, movieTitle);
        if (!isTracked) {
          toast.success(`🔔 Tracking "${movieTitle}" — you'll be notified on release!`);
          if (!profile.notifyNewRelease) await handleTogglePref('notifyNewRelease');
          // Background email notification
          try {
            const token = await user.getIdToken();
            fetch('/api/notifications/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ type: 'TRACK_RELEASE', data: { movieTitle } }),
            }).catch(console.error);
          } catch (e) { console.error('Failed to send tracking email', e); }
        } else {
          toast.success(`Removed "${movieTitle}" from reminders`);
        }
      } catch (err) {
        console.error('Error toggling tracked release:', err);
        toast.error('Failed to update release tracker');
      }
    },
    [user, trackedReleases]
  );

  /*
   * ============================================================
   * TOP 5 MOVIES
   * ============================================================
   */
  const handleAddTopMovie = useCallback(
    async (movie: Movie, profile: ProfileSettings, setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>) => {
      if (!user?.uid) return;
      const currentTop10 = profile.top10 || [];
      if (currentTop10.length >= 5 || currentTop10.some((m) => m.id === movie.id)) return;
      const updated = [...currentTop10, movie];
      try {
        await saveTop5(user.uid, updated);
        setProfile((prev) => ({ ...prev, top10: updated }));
        toast.success(`${movie.title} added to Top 5`);
      } catch (err) {
        console.error('Error adding to Top 5:', err);
        toast.error('Failed to add movie to Top 5');
      }
    },
    [user?.uid]
  );

  const handleRemoveTopMovie = useCallback(
    async (movieId: number, profile: ProfileSettings, setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>) => {
      if (!user?.uid || !profile.top10) return;
      const updated = profile.top10.filter((m) => m.id !== movieId);
      try {
        await saveTop5(user.uid, updated);
        setProfile((prev) => ({ ...prev, top10: updated }));
      } catch (err) {
        console.error('Error removing top movie:', err);
        toast.error('Failed to remove movie');
      }
    },
    [user?.uid]
  );

  const handleMoveTopMovie = useCallback(
    async (index: number, direction: 'up' | 'down', profile: ProfileSettings, setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>) => {
      if (!user?.uid || !profile.top10) return;
      const updated = [...profile.top10];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return;
      [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
      try {
        await saveTop5(user.uid, updated);
        setProfile((prev) => ({ ...prev, top10: updated }));
        toast.success('Reordered Top 5');
      } catch (err) {
        console.error('Error reordering Top 5:', err);
        toast.error('Failed to reorder movies');
      }
    },
    [user?.uid]
  );

  /*
   * ============================================================
   * DNA MOODS
   * ============================================================
   */
  const handleToggleDnaMood = useCallback(
    async (mood: string, profile: ProfileSettings, setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>) => {
      if (!user?.uid) return;
      const moods = profile.dnaMoods || [];
      const updated = moods.includes(mood) ? moods.filter((m) => m !== mood) : [...moods, mood];
      setProfile((prev) => ({ ...prev, dnaMoods: updated }));
      try {
        await saveDnaMoods(user.uid, updated);
        toast.success(`${mood} filter updated`);
        router.refresh();
        revalidatePage('/');
        revalidatePage('/browse');
      } catch (err) {
        console.error('Failed to update dnaMoods:', err);
        toast.error('Failed to save to database');
      }
    },
    [user?.uid, router]
  );

  /*
   * ============================================================
   * GENERIC LOCAL SETTINGS
   * ============================================================
   */
  const handleLocalToggle = useCallback(
    async (field: keyof ProfileSettings, profile: ProfileSettings, setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>) => {
      if (!user?.uid) return;
      const newValue = !profile[field];
      setProfile((prev) => ({ ...prev, [field]: newValue }));
      try {
        await saveFieldValue(user.uid, field as string, newValue);
        toast.success('Preference updated successfully');
      } catch (err) {
        console.error('Failed to update preference:', err);
        toast.error('Failed to save to database');
      }
    },
    [user?.uid]
  );

  const handleLocalSelect = useCallback(
    async (field: keyof ProfileSettings, value: unknown, setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>) => {
      if (!user?.uid) return;
      setProfile((prev) => ({ ...prev, [field]: value }));
      try {
        await saveFieldValue(user.uid, field as string, value);
        toast.success('Settings updated');
      } catch (err) {
        console.error('Failed to update settings:', err);
        toast.error('Failed to save to database');
      }
    },
    [user?.uid]
  );

  /*
   * ============================================================
   * ACTIVE SESSIONS
   * ============================================================
   */
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.uid || !options.fetchSessions) return;
    const currentSessionId = typeof window !== 'undefined' ? localStorage.getItem('moviefind_session_id') : null;
    const unsub = subscribeToActiveSessions(user.uid, setActiveSessions, currentSessionId);
    return unsub;
  }, [user?.uid, options.fetchSessions]);

  /*
   * ============================================================
   * AUDIT LOGS
   * ============================================================
   */
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [totalAuditLogs, setTotalAuditLogs] = useState(0);

  useEffect(() => {
    if (!user?.uid || !options.fetchAuditLogs) return;
    const unsub = subscribeToAuditLogs(user.uid, (logs, total) => {
      setAuditLogs(logs);
      setTotalAuditLogs(total);
    });
    return unsub;
  }, [user?.uid, options.fetchAuditLogs]);

  /*
   * ============================================================
   * BILLING
   * ============================================================
   */
  const [billingPlan, setBillingPlan] = useState('free');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [renewalDate, setRenewalDate] = useState('N/A');

  useEffect(() => {
    if (!user?.uid || !options.fetchBilling) return;
    const unsub = subscribeToBilling(user.uid, ({ plan, invoices, renewalDate }) => {
      setBillingPlan(plan);
      setInvoices(invoices);
      setRenewalDate(renewalDate);
    });
    return unsub;
  }, [user?.uid, options.fetchBilling]);

  return {
    trackedReleases,
    handleToggleTrackedRelease,
    handleAddTopMovie,
    handleRemoveTopMovie,
    handleMoveTopMovie,
    handleToggleDnaMood,
    handleLocalToggle,
    handleLocalSelect,
    activeSessions,
    auditLogs,
    totalAuditLogs,
    billingPlan,
    invoices,
    renewalDate,
  };
}
