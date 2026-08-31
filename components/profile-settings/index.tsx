'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { notify as toast, syncBrowserChannelPref } from '../../lib/notify';
import {
  Bell, Settings, Shield, CreditCard, HelpCircle, Film, Tv, Play, Plus,
  Trash2, Mail, Check, X, ShieldCheck, Download, RefreshCw, Eye, Lock,
  Info, Activity, Globe, Heart, ChevronDown, CheckCircle2, Layout, Calendar,
  ArrowRight, MessageSquare, AlertCircle, Laptop, Smartphone, AlertTriangle, LogOut,
  Search, ArrowUp, ArrowDown, History, Award, Clock, Trophy, Zap, Star, ChevronLeft, ChevronRight, Share2,
  UserX, MonitorPlay, Sliders, Unlock, LayoutList, ExternalLink, Power, Menu,
  Fingerprint, MonitorSmartphone, Database, UserCog
} from 'lucide-react';
import { getUserActivities, clearUserActivities } from '@/lib/genreTracker';
import { searchMovies } from '@/services/tmdbService';
import { Movie } from '@/types';
import { app } from '@/lib/firebase';
import { getFirestore, doc, setDoc, collection, query, orderBy, limit, onSnapshot, getDocs, writeBatch, updateDoc, deleteField, deleteDoc, addDoc, getCountFromServer } from 'firebase/firestore';
import { logSecurityEvent, AuditEvent } from '@/lib/auditLogger';
import { CustomSelect } from '@/components/ui/CustomSelect';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { revalidatePage } from '@/app/actions/revalidate';
import { ProfileSettings } from '@/types';
import { useWatchlist } from '@/context/WatchlistContext';

interface ProfileSettingsPanelProps {
  user: any;
  profile: ProfileSettings;
  setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>;
  isOwner: boolean;
  watchlist: any[];
  userReviews: any[];
  handleTogglePref: (field: any) => Promise<void>;
  handleRegionChange: (region: string) => Promise<void>;
  handleToggleSub: (platformName: string) => Promise<void>;
  onSignOut?: () => void;
  onDirectSignOut?: () => void;
  systemAchievements?: { id: string; label: string; val: string; icon: string }[];
  additionalDetails?: Record<number, any>;
  handleToggleLike?: (movieId: number, currentLiked: boolean) => Promise<void>;
  handleShareNote?: (movieId: number, movieTitle: string) => Promise<void>;
}

const STREAMING_PLATFORMS = [
  { id: 'netflix', name: 'Netflix', logo: 'N', color: 'bg-red-600', glow: 'shadow-red-500/30' },
  { id: 'disney', name: 'Disney+', logo: 'D', color: 'bg-blue-600', glow: 'shadow-blue-500/30' },
  { id: 'prime', name: 'Prime Video', logo: 'P', color: 'bg-cyan-500', glow: 'shadow-cyan-400/30' },
  { id: 'hbo', name: 'HBO Max', logo: 'H', color: 'bg-purple-600', glow: 'shadow-purple-500/30' },
  { id: 'hotstar', name: 'Hotstar', logo: 'H', color: 'bg-blue-500', glow: 'shadow-blue-400/30' },
  { id: 'jiocinema', name: 'JioCinema', logo: 'J', color: 'bg-pink-600', glow: 'shadow-pink-500/30' },
  { id: 'sonyliv', name: 'SonyLIV', logo: 'S', color: 'bg-yellow-500', glow: 'shadow-yellow-400/30' },
  { id: 'aha', name: 'Aha', logo: 'A', color: 'bg-orange-500', glow: 'shadow-orange-400/30' },
  { id: 'zee5', name: 'Zee5', logo: 'Z', color: 'bg-indigo-500', glow: 'shadow-indigo-400/30' },
  { id: 'apple', name: 'Apple TV+', logo: '🍎', color: 'bg-slate-700', glow: 'shadow-slate-500/30' },
  { id: 'hulu', name: 'Hulu', logo: 'H', color: 'bg-green-500', glow: 'shadow-green-400/30' },
  { id: 'max', name: 'Max', logo: 'M', color: 'bg-blue-800', glow: 'shadow-blue-700/30' },
];

const SETTING_TABS = [
  { id: 'notifications', icon: '🔔', name: 'Notifications', label: 'Updates & Alerts' },
  { id: 'preferences', icon: '⚙️', name: 'Preferences', label: 'DNA & Filters' },
  { id: 'privacy', icon: '🛡️', name: 'Privacy & Security', label: 'Sessions & Data' },
  { id: 'payment', icon: '💳', name: 'Payment Methods', label: 'Billing & Premium' },
  { id: 'help', icon: '❓', name: 'Help & Support', label: 'FAQ & Dispatches' },
  { id: 'tracking', icon: '🕵️', name: 'Watchlists & Tracking', label: 'Aggregator Insights' },
  { id: 'activity', icon: '🏆', name: 'Activity & Badges', label: 'Timeline & Achievements' },
  { id: 'notes', icon: '📝', name: 'Director\'s Notes', label: 'Reviews & Critiques' }
];

export default function ProfileSettingsPanel({
  user,
  profile,
  setProfile,
  isOwner,
  watchlist,
  userReviews,
  handleTogglePref,
  handleRegionChange,
  handleToggleSub,
  onSignOut,
  onDirectSignOut,
  systemAchievements = [],
  additionalDetails = {},
  handleToggleLike,
  handleShareNote
}: ProfileSettingsPanelProps) {
  const [activeSettingTab, setActiveSettingTab] = useState<
    'notifications' | 'preferences' | 'privacy' | 'payment' | 'help' | 'tracking' | 'activity' | 'notes'
  >('notifications');
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const { customWatchlists, createCustomWatchlist, deleteCustomWatchlist } = useWatchlist();

  const [localBrowserEnabled, setLocalBrowserEnabled] = useState(true);
  const [localPushEnabled, setLocalPushEnabled] = useState(false);

  useEffect(() => {
    // Read local browser pref
    const browserPref = localStorage.getItem('streamfind_channel_browser');
    setLocalBrowserEnabled(browserPref === null ? true : browserPref === 'true');

    // Check if we have an FCM token for this device
    const checkPush = async () => {
      try {
        const token = localStorage.getItem('fcm_token');
        if (token && 'Notification' in window && Notification.permission === 'granted') {
          setLocalPushEnabled(true);
        }
      } catch (e) {}
    };
    checkPush();
  }, []);

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab) {
      setActiveSettingTab(tab as any);
    }
  }, [searchParams]);

  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isLogoutAllModalOpen, setIsLogoutAllModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [keepCurrentDevice, setKeepCurrentDevice] = useState(true);
  const [clearedTimelineIds, setClearedTimelineIds] = useState<string[]>([]);
  const [showActivityPopup, setShowActivityPopup] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [totalAuditLogs, setTotalAuditLogs] = useState(0);

  // Billing states
  const [billingPlan, setBillingPlan] = useState<string>('free');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [renewalDate, setRenewalDate] = useState<string>('N/A');
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  const signOutTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    return () => {
      if (signOutTimerRef.current) clearTimeout(signOutTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestore(app);
    const auditRef = collection(db, `users/${user.uid}/audit_logs`);
    const q = query(auditRef, orderBy('timestamp', 'desc'), limit(5));

    // Fetch the true total count of audit logs (alerts) for the badge
    getCountFromServer(auditRef).then((snap) => {
      setTotalAuditLogs(snap.data().count);
    }).catch((error) => {
      if (error.code !== 'permission-denied') console.error('Count fetch error:', error);
    });

    const unsubscribeAudit = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditEvent));
      setAuditLogs(logs);
    }, (error) => {
      // Silently handle permission errors for new users without data yet
      if (error.code !== 'permission-denied') {
        console.error('Audit logs listener error:', error);
      }
    });

    const userDocRef = doc(db, `users/${user.uid}`);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBillingPlan(data.plan || 'free');
        setInvoices(data.invoices || []);
        if (data.subscriptionUpdatedAt) {
          const date = data.subscriptionUpdatedAt.toDate();
          date.setFullYear(date.getFullYear() + 1); // Mock 1 year validity
          setRenewalDate(date.toLocaleDateString());
        }
      }
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.error('User doc listener error:', error);
      }
    });

    return () => {
      unsubscribeAudit();
      unsubscribeUser();
    };
  }, [user?.uid]);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('streamfind_cleared_timeline_ids');
      if (stored) {
        try {
          setClearedTimelineIds(JSON.parse(stored));
        } catch (e) {
          console.error("Error parsing cleared timeline IDs:", e);
        }
      }
    }
  }, []);

  const [tmdbLanguages, setTmdbLanguages] = useState<{ value: string, label: string }[]>([]);
  const [tmdbRegions, setTmdbRegions] = useState<{ value: string, label: string }[]>([]);

  useEffect(() => {
    const fetchTmdbConfig = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) return;

        const [langRes, reqRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/configuration/languages?api_key=${apiKey}`),
          fetch(`https://api.themoviedb.org/3/configuration/countries?api_key=${apiKey}`)
        ]);

        if (langRes.ok) {
          const langs = await langRes.json();
          // Sort english first, then alphabetical
          const mappedLangs = langs.map((l: any) => ({
            value: l.iso_639_1,
            label: l.english_name || l.name || l.iso_639_1
          })).sort((a: any, b: any) => {
            if (a.value === 'en') return -1;
            if (b.value === 'en') return 1;
            return a.label.localeCompare(b.label);
          });
          setTmdbLanguages(mappedLangs);
        }

        if (reqRes.ok) {
          const regions = await reqRes.json();
          const mappedRegions = regions.map((r: any) => ({
            value: r.iso_3166_1,
            label: r.english_name || r.native_name || r.iso_3166_1
          })).sort((a: any, b: any) => {
            if (a.value === 'IN') return -1;
            if (b.value === 'IN') return 1;
            if (a.value === 'US') return -1;
            if (b.value === 'US') return 1;
            return a.label.localeCompare(b.label);
          });
          setTmdbRegions(mappedRegions);
        }
      } catch (err) {
        console.error("Failed to fetch TMDB config", err);
      }
    };
    fetchTmdbConfig();
  }, []);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async () => {
    if (!user) return toast.error('You must be logged in to upgrade');
    setIsUpgrading(true);

    try {
      const res = await loadRazorpay();
      if (!res) {
        toast.error('Failed to load payment gateway. Please check your connection.');
        setIsUpgrading(false);
        return;
      }

      // Create order
      const token = await user.getIdToken();
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '', 
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'StreamFinds Premium',
        description: 'Upgrade to StreamFinds Premium',
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            toast.loading('Verifying payment...', { id: 'verify-payment' });
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: orderData.amount,
                currency: orderData.currency,
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              toast.success('Successfully upgraded to Premium!', { id: 'verify-payment' });
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (err: any) {
            toast.error(err.message, { id: 'verify-payment' });
          }
        },
        prefill: {
          name: user.displayName || '',
          email: user.email || '',
        },
        theme: {
          color: '#ff284e'
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      paymentObject.open();

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  // Carousel gesture drag settings for Director's Notes
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);
  const startX = React.useRef(0);
  const scrollLeft = React.useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - carouselRef.current.offsetLeft;
    scrollLeft.current = carouselRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    carouselRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      carouselRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const ratingCount = userReviews.length;
  const watchCount = watchlist.length;
  const totalScore = ratingCount * 3 + watchCount;

  let level = 1;
  if (totalScore >= 30) level = 15;
  else if (totalScore >= 15) level = 10;
  else if (totalScore >= 5) level = 5;
  else if (totalScore >= 1) level = 2;

  const watchHistory = React.useMemo(() => {
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
    return events.filter(e => !clearedTimelineIds.includes(e.id)).slice(0, 4);
  }, [watchlist, userReviews, clearedTimelineIds]);

  const recentActivities = React.useMemo(() => {
    if (!isMounted) return [];
    return getUserActivities();
  }, [isMounted, watchlist, userReviews, clearedTimelineIds, showActivityPopup]);

  const badges = systemAchievements.map(ach => {
    let unlocked = false;
    const numMatch = ach.val.match(/\d+(\.\d+)?/);
    const num = numMatch ? parseFloat(numMatch[0]) : 0;
    const combinedStr = `${ach.val.toLowerCase()} ${ach.label.toLowerCase()}`;

    if (combinedStr.includes('lvl') || combinedStr.includes('level')) unlocked = level >= num;
    else if (combinedStr.includes('mov') || combinedStr.includes('watch')) unlocked = watchCount >= num;
    else if (combinedStr.includes('x') || combinedStr.includes('streak') || combinedStr.includes('rate')) unlocked = ratingCount >= num;
    else unlocked = totalScore >= num;

    let IconComp: any = Award;
    let color = "text-white/40";
    let isCustomIcon = ach.icon.startsWith('http');
    if (unlocked && !isCustomIcon) {
      if (ach.icon === 'Trophy') color = "text-brand";
      else if (ach.icon === 'Zap') color = "text-cyan-400";
      else if (ach.icon === 'Award') color = "text-purple-400";
      else color = "text-orange-400";
    }
    if (ach.icon === 'Trophy') IconComp = Trophy;
    else if (ach.icon === 'Zap') IconComp = Zap;
    else if (ach.icon === 'Award') IconComp = Award;
    else if (ach.icon === 'Clock') IconComp = Clock;

    return { icon: isCustomIcon ? ach.icon : IconComp, isCustomIcon, title: ach.label, desc: ach.val, unlocked, color };
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);

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
    const currentTop10 = profile.top10 || [];
    if (!user || currentTop10.length >= 5) return;
    if (currentTop10.some(m => m.id === movie.id)) return;
    const updatedTop10 = [...currentTop10, movie];
    const sanitizedTop10 = JSON.parse(JSON.stringify(updatedTop10));
    try {
      const docRef = doc(getFirestore(app), `users/${user.uid}`);
      await setDoc(docRef, { top10: sanitizedTop10 }, { merge: true });
      setProfile(prev => ({ ...prev, top10: updatedTop10 }));
      setSearchQuery(''); setSearchResults([]); setShowSearch(false);
      toast.success(`${movie.title} added to Top 5`);
    } catch (err) {
      console.error("Error adding to Top 5:", err);
      toast.error("Failed to add movie to Top 5");
    }
  };

  const handleRemoveTopMovie = async (movieId: number) => {
    if (!user || !profile.top10) return;
    const updatedTop10 = profile.top10.filter(m => m.id !== movieId);
    try {
      const docRef = doc(getFirestore(app), `users/${user.uid}`);
      await setDoc(docRef, { top10: updatedTop10 }, { merge: true });
      setProfile(prev => ({ ...prev, top10: updatedTop10 }));
    } catch (error) {
      console.error('Error removing top movie:', error);
      alert('Failed to remove movie.');
    }
  };

  const handleMoveTopMovie = async (index: number, direction: 'up' | 'down') => {
    if (!user || !profile.top10) return;
    const updatedTop10 = [...profile.top10];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updatedTop10.length) return;
    const temp = updatedTop10[index];
    updatedTop10[index] = updatedTop10[targetIndex];
    updatedTop10[targetIndex] = temp;
    try {
      const docRef = doc(getFirestore(app), `users/${user.uid}`);
      await setDoc(docRef, { top10: updatedTop10 }, { merge: true });
      setProfile(prev => ({ ...prev, top10: updatedTop10 }));
      toast.success("Reordered Top 5");
    } catch (err) {
      console.error("Error reordering Top 5:", err);
      toast.error("Failed to reorder movies");
    }
  };

  const topTen = profile.top10 ? profile.top10.slice(0, 5) : [];
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [ticketType, setTicketType] = useState<'general' | 'bug' | 'missing' | 'wrong_availability' | 'feature'>('general');
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);
  const [newWatchlistName, setNewWatchlistName] = useState('');

  // --- Release Calendar State ---
  const [upcomingMovies, setUpcomingMovies] = useState<{ id: number; title: string; release_date: string; poster_path: string | null }[]>([]);
  const [trackedReleases, setTrackedReleases] = useState<number[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  // Fetch upcoming movies from TMDB
  useEffect(() => {
    const fetchUpcoming = async () => {
      setIsLoadingCalendar(true);
      try {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) return;
        const res = await fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=en-US&page=1`);
        if (!res.ok) return;
        const data = await res.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0); // normalize to start of today
        const futureMovies = (data.results || [])
          .filter((m: any) => {
            if (!m.release_date) return false;
            return new Date(m.release_date) >= today;
          })
          .slice(0, 10)
          .map((m: any) => ({
            id: m.id,
            title: m.title,
            release_date: m.release_date,
            poster_path: m.poster_path
          }));
        setUpcomingMovies(futureMovies);
      } catch (err) {
        console.error('Failed to fetch upcoming movies', err);
      } finally {
        setIsLoadingCalendar(false);
      }
    };
    fetchUpcoming();
  }, []);

  // Subscribe to user's tracked releases in Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestore(app);
    const q = collection(db, `users/${user.uid}/trackedReleases`);
    const unsub = onSnapshot(q, (snap) => {
      setTrackedReleases(snap.docs.map(d => Number(d.id)));
    }, (err) => {
      if (err.code !== 'permission-denied') console.error('Tracked releases error:', err);
    });
    return () => unsub();
  }, [user?.uid]);

  // Toggle tracking a release + auto-enable notifyNewRelease toggle
  const handleToggleTrackedRelease = async (movieId: number, movieTitle: string) => {
    if (!user?.uid) { toast.error('Please log in to track releases'); return; }
    const db = getFirestore(app);
    const docRef = doc(db, `users/${user.uid}/trackedReleases/${movieId}`);
    const isTracked = trackedReleases.includes(movieId);
    try {
      if (isTracked) {
        await deleteDoc(docRef);
        toast.success(`Removed "${movieTitle}" from reminders`);
      } else {
        await setDoc(docRef, { movieId, title: movieTitle, trackedAt: new Date() });
        toast.success(`🔔 Tracking "${movieTitle}" — you'll be notified on release!`);
        // Auto-enable the notifyNewRelease toggle if it's currently off
        if (!profile.notifyNewRelease) {
          await handleTogglePref('notifyNewRelease');
        }

        // Trigger universal email notification (will silently abort if email channel is off)
        try {
          const token = await user.getIdToken();
          fetch('/api/notifications/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              type: 'TRACK_RELEASE',
              data: { movieTitle }
            })
          }).catch(console.error); // Run in background
        } catch (e) {
          console.error('Failed to send tracking email notification', e);
        }
      }
    } catch (err) {
      console.error('Error toggling tracked release:', err);
      toast.error('Failed to update release tracker');
    }
  };
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestore(app);
    const q = query(collection(db, 'users', user.uid, 'sessions'), orderBy('lastActive', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentSessionId = localStorage.getItem('moviefind_session_id');
      const sessions = snapshot.docs.map(doc => {
        const data = doc.data();
        let lastActiveStr = 'Unknown';
        if (data.lastActive) {
          const date = data.lastActive.toDate();
          const diffMs = Date.now() - date.getTime();
          if (diffMs < 5 * 60 * 1000) lastActiveStr = 'Active now';
          else if (diffMs < 60 * 60 * 1000) lastActiveStr = `${Math.floor(diffMs / 60000)} mins ago`;
          else if (diffMs < 24 * 60 * 60 * 1000) lastActiveStr = `${Math.floor(diffMs / 3600000)} hours ago`;
          else lastActiveStr = date.toLocaleDateString();
        }
        return {
          id: doc.id,
          device: data.deviceInfo?.fullString || 'Unknown Device',
          browser: data.deviceInfo?.browser || 'Unknown',
          location: data.location || 'Location unavailable',
          lastActive: lastActiveStr,
          current: doc.id === currentSessionId
        };
      });
      setActiveSessions(sessions);
    });
    return () => unsubscribe();
  }, [user]);
  const handleLocalToggle = async (field: keyof ProfileSettings) => {
    const newValue = !profile[field];
    setProfile(prev => ({ ...prev, [field]: newValue }));
    if (user) {
      try {
        const docRef = doc(getFirestore(app), `users/${user.uid}`);
        await setDoc(docRef, { [field]: newValue }, { merge: true });
        toast.success('Preference updated successfully');
        // Immediate UI update; no need for router refresh or revalidation
      } catch (err) {
        console.error("Failed to update preference", err);
        toast.error("Failed to save to database");
      }
    }
  };

  const handleLocalSelect = async (field: keyof ProfileSettings, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    if (user) {
      try {
        const docRef = doc(getFirestore(app), `users/${user.uid}`);
        await setDoc(docRef, { [field]: value }, { merge: true });
        toast.success('Settings updated');
        // Immediate UI update; no need for router refresh or revalidation
      } catch (err) {
        console.error("Failed to update settings", err);
        toast.error("Failed to save to database");
      }
    }
  };
  const handleToggleDnaMood = async (mood: string) => {
    const moods = profile.dnaMoods || [];
    let updated = moods.includes(mood) ? moods.filter(m => m !== mood) : [...moods, mood];
    setProfile(prev => ({ ...prev, dnaMoods: updated }));
    if (user) {
      try {
        const docRef = doc(getFirestore(app), `users/${user.uid}`);
        await setDoc(docRef, { dnaMoods: updated }, { merge: true });
        toast.success(`${mood} filter updated`);
        router.refresh();
        // Instantly trigger server-side revalidation of home and browse pages
        revalidatePage('/');
        revalidatePage('/browse');
      } catch (err) {
        console.error("Failed to update dnaMoods", err);
        toast.error("Failed to save to database");
      }
    }
  };

  return (
    <div className="mt-8 md:mt-12 bg-[#050505]/40 border border-white/10 rounded-[2rem] md:rounded-[40px] p-4 md:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative font-sans">
      {/* Background Glows & Blur Layer */}
      <div className="absolute inset-0 rounded-[2rem] md:rounded-[40px] backdrop-blur-3xl pointer-events-none z-0" />
      <div className="absolute inset-0 overflow-hidden rounded-[2rem] md:rounded-[40px] pointer-events-none z-0 mix-blend-screen opacity-50">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/20 rounded-full -mr-48 -mt-48 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full -ml-48 -mb-48 blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 relative z-10 w-full">
        {/* Mobile Header / Drawer Toggle */}
        <div className="lg:hidden flex items-center justify-between bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-2xl shadow-xl">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand/30 to-purple-500/30 border border-white/20 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(255,255,255,0.1)]">
               {SETTING_TABS.find(t => t.id === activeSettingTab)?.icon}
             </div>
             <div>
               <h3 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">
                 {SETTING_TABS.find(t => t.id === activeSettingTab)?.name}
               </h3>
               <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider mt-0.5">{SETTING_TABS.find(t => t.id === activeSettingTab)?.label}</p>
             </div>
           </div>
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 text-white transition-all active:scale-95 shadow-lg">
             <Menu className="w-5 h-5" />
           </button>
        </div>

        {/* Mobile Drawer (AnimatePresence) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9998] lg:hidden"
              />
              <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto no-scrollbar bg-[#0a0a0a]/90 border-t border-white/20 rounded-t-[40px] p-6 z-[9999] lg:hidden shadow-[0_-20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl flex flex-col gap-3"
              >
                <div className="w-16 h-1.5 bg-white/30 rounded-full mx-auto mb-6" />
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tight text-white mb-4 px-2 drop-shadow-lg">Control Center</h3>
                {SETTING_TABS.map((t) => {
                  const isActive = activeSettingTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setActiveSettingTab(t.id as any); setIsMobileMenuOpen(false); }}
                      className={`flex items-center gap-4 px-5 py-4 rounded-[24px] transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-brand/20 to-brand/5 border border-brand/40 shadow-[0_0_20px_rgba(229,9,20,0.2)]' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                    >
                      <span className="text-2xl drop-shadow-md">{t.icon}</span>
                      <div className="text-left">
                        <div className={`text-sm font-black uppercase tracking-wider ${isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-white/70'}`}>{t.name}</div>
                        <div className={`text-[10px] uppercase tracking-widest ${isActive ? 'text-brand/80' : 'text-white/40'}`}>{t.label}</div>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar Bento */}
        <div className="hidden lg:flex w-full lg:w-1/4 shrink-0 flex-col gap-3 sticky top-24 self-start">
          <div className="mb-6 px-4 py-6 bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-[32px] backdrop-blur-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/20 blur-[40px] rounded-full pointer-events-none" />
            <h3 className="text-4xl font-display font-black uppercase italic tracking-tight text-glow bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80 relative z-10">
              Control <br/><span className="text-brand">Center</span>
            </h3>
            <p className="text-white/50 text-[10px] font-black mt-2 tracking-widest uppercase relative z-10">Configure preferences</p>
          </div>
          <div className="flex flex-col gap-2">
            {SETTING_TABS.map((t) => {
              const isActive = activeSettingTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveSettingTab(t.id as any)}
                  className={`relative flex flex-col items-start shrink-0 px-6 py-4 rounded-[24px] transition-all duration-300 group overflow-hidden border ${isActive ? 'border-brand/40 bg-brand/10 shadow-[0_0_20px_rgba(229,9,20,0.15)]' : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'}`}
                >
                  {isActive && (
                    <motion.div layoutId="desktopActiveTab" className="absolute inset-0 bg-gradient-to-r from-brand/20 to-transparent pointer-events-none" />
                  )}
                  <div className="flex items-center gap-4 relative z-10">
                    <span className={`text-xl transition-transform duration-500 group-hover:scale-125 ${isActive ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'opacity-60'}`}>{t.icon}</span>
                    <span className={`text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors ${isActive ? 'text-white drop-shadow-md' : 'text-white/60 group-hover:text-white/90'}`}>{t.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold mt-1.5 ml-9 uppercase tracking-widest relative z-10 transition-colors ${isActive ? 'text-brand/80' : 'text-white/30 group-hover:text-white/50'}`}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex-grow lg:w-3/4 bg-[#0a0a0a]/60 border border-white/10 rounded-[2rem] md:rounded-[40px] p-5 md:p-10 min-h-[500px] flex flex-col justify-between shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-3xl relative overflow-hidden">
          <div className="space-y-6">
            {activeSettingTab === 'notifications' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-brand/20 blur-[60px] rounded-full pointer-events-none" />
                  <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Notification Channels & Alerts</h4>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Every setting here saves instantly to your account across all devices.</p>
                </div>

                <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl shadow-inner">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                      <Bell className="w-5 h-5 drop-shadow-md" />
                    </div>
                    <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">Delivery Channels</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { key: 'channelEmail', title: 'Email', icon: '📧', desc: 'Alerts to your inbox.' },
                      { key: 'channelPush', title: 'Push', icon: '📱', desc: 'Mobile device alerts.' },
                      { key: 'channelBrowser', title: 'Browser', icon: '🖥️', desc: 'Desktop toast updates.' }
                    ].map((c) => {
                      const isActive = 
                        c.key === 'channelBrowser' ? localBrowserEnabled :
                        c.key === 'channelPush' ? localPushEnabled :
                        (profile[c.key as keyof ProfileSettings] as boolean | undefined) ?? true;
                        
                      return (
                        <button
                          key={c.key}
                          onClick={async () => {
                            if (c.key === 'channelBrowser') {
                              const newVal = !localBrowserEnabled;
                              setLocalBrowserEnabled(newVal);
                              syncBrowserChannelPref(newVal);
                              toast.success(newVal ? 'Browser toasts enabled' : 'Browser toasts disabled');
                            } else if (c.key === 'channelPush') {
                              if (!isActive) {
                                try {
                                  if (!('Notification' in window)) {
                                    toast.error('This browser does not support push notifications.');
                                    return;
                                  }
                                  const permission = await Notification.requestPermission();
                                  if (permission === 'granted') {
                                    const { getMessagingInstance } = await import('../../lib/firebase');
                                    const messaging = await getMessagingInstance();
                                    if (messaging) {
                                      const { getToken } = await import('firebase/messaging');
                                      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
                                      if (!vapidKey) {
                                        toast.error('VAPID key missing. Setup incomplete.');
                                        return;
                                      }
                                      const token = await getToken(messaging, { vapidKey });
                                      if (token && user) {
                                        const db = getFirestore(app);
                                        const docRef = doc(db, `users/${user.uid}/fcmTokens/${token}`);
                                        await setDoc(docRef, { token, device: navigator.userAgent, createdAt: new Date() });
                                        localStorage.setItem('fcm_token', token);
                                        setLocalPushEnabled(true);
                                        toast.success('Push notifications enabled for this device.');
                                      }
                                    }
                                  } else {
                                    toast.error('Notification permission denied by user/browser.');
                                  }
                                } catch (e: any) {
                                  console.error('Push setup error:', e);
                                  toast.error(`Push error: ${e.message || 'Unknown error'}`);
                                }
                              } else {
                                try {
                                  const token = localStorage.getItem('fcm_token');
                                  if (token && user) {
                                    const db = getFirestore(app);
                                    const docRef = doc(db, `users/${user.uid}/fcmTokens/${token}`);
                                    await deleteDoc(docRef);
                                  }
                                  localStorage.removeItem('fcm_token');
                                  setLocalPushEnabled(false);
                                  toast.success('Push notifications disabled for this device.');
                                } catch (e) {
                                  console.error('Error disabling push:', e);
                                }
                              }
                            } else {
                              await handleTogglePref(c.key);
                            }
                          }}
                          className={`p-6 rounded-[24px] border cursor-pointer transition-all duration-300 text-left relative overflow-hidden group hover:-translate-y-1 ${isActive
                            ? 'bg-gradient-to-br from-brand/20 to-transparent border-brand/40 shadow-[0_10px_30px_rgba(229,9,20,0.2)]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 shadow-inner'
                            }`}
                        >
                          {isActive && <div className="absolute -top-6 -right-6 w-24 h-24 bg-brand/30 rounded-full blur-[40px] pointer-events-none" />}
                          <div className="flex items-center justify-between mb-4 relative z-10">
                            <span className="text-3xl drop-shadow-lg">{c.icon}</span>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-brand border-brand shadow-[0_0_15px_rgba(229,9,20,0.8)] scale-110' : 'bg-black/50 border-white/30 group-hover:border-white/50'}`}>
                              {isActive && <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />}
                            </div>
                          </div>
                          <p className={`text-sm font-black uppercase tracking-wider relative z-10 transition-colors ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>{c.title}</p>
                          <p className={`text-[10px] mt-1 font-bold tracking-widest uppercase relative z-10 transition-colors ${isActive ? 'text-white/70' : 'text-white/40 group-hover:text-white/60'}`}>{c.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl shadow-inner">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                      <Film className="w-5 h-5 drop-shadow-md" />
                    </div>
                    <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">New Releases</h5>
                  </div>
                  <div className="space-y-3">
                  {([
                    { key: 'notifyNewRelease', label: 'Watchlist Releases', desc: 'Alert when a title on your watchlist is officially released.' },
                    { key: 'notifyNewEpisodes', label: 'New Episode Alerts', desc: 'Notified the moment a new episode of a tracked series drops.' },
                    { key: 'notifyNewSeasons', label: 'New Season Announcements', desc: 'Reminders when new seasons are confirmed or added.' },
                  ] as { key: keyof ProfileSettings; label: string; desc: string }[]).map((item) => {
                    const isActive = (profile[item.key] as boolean | undefined) ?? true;
                    return (
                      <div key={item.key as string} className="flex gap-4 items-center justify-between p-5 rounded-[20px] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                        <div>
                          <p className="text-xs font-black text-white uppercase tracking-wider group-hover:text-brand transition-colors drop-shadow-sm">{item.label}</p>
                          <p className="text-[10px] text-white/50 mt-1.5 font-bold tracking-widest uppercase group-hover:text-white/70 transition-colors">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => handleTogglePref(item.key as any)}
                          className={`w-14 h-7 rounded-full relative transition-all duration-500 border-2 shrink-0 cursor-pointer overflow-hidden ${isActive
                            ? 'bg-brand/80 border-brand shadow-[0_0_20px_rgba(229,9,20,0.6)]'
                            : 'bg-black/60 border-white/20 hover:border-white/40 shadow-inner'
                            }`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-white/20 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                          <div
                            className={`absolute top-0.5 bottom-0.5 w-5 bg-white rounded-full transition-all duration-500 shadow-[0_2px_5px_rgba(0,0,0,0.3)] ${isActive ? 'translate-x-7 scale-110' : 'translate-x-1 opacity-60 scale-90'
                              }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                  </div>
                </div>

                <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl shadow-inner">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                      <Heart className="w-5 h-5 drop-shadow-md" />
                    </div>
                    <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">Community & Social</h5>
                  </div>
                  <div className="space-y-3">
                    {([
                    { key: 'notifyPlatformAdded', label: 'New Streaming Platforms', desc: 'Alerted when StreamFinds integrates a new provider.' },
                    { key: 'notifyNewFeatures', label: 'New Product Features', desc: 'Be first to know about aggregation upgrades, calendar views, and badges.' },
                  ] as { key: keyof ProfileSettings; label: string; desc: string }[]).map((item) => {
                    const isActive = (profile[item.key] as boolean | undefined) ?? true;
                    return (
                      <div key={item.key as string} className="flex gap-4 items-center justify-between p-5 rounded-[20px] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                        <div>
                          <p className="text-xs font-black text-white uppercase tracking-wider group-hover:text-brand transition-colors drop-shadow-sm">{item.label}</p>
                          <p className="text-[10px] text-white/50 mt-1.5 font-bold tracking-widest uppercase group-hover:text-white/70 transition-colors">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => handleTogglePref(item.key as any)}
                          className={`w-14 h-7 rounded-full relative transition-all duration-500 border-2 shrink-0 cursor-pointer overflow-hidden ${isActive
                            ? 'bg-brand/80 border-brand shadow-[0_0_20px_rgba(229,9,20,0.6)]'
                            : 'bg-black/60 border-white/20 hover:border-white/40 shadow-inner'
                            }`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-white/20 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                          <div
                            className={`absolute top-0.5 bottom-0.5 w-5 bg-white rounded-full transition-all duration-500 shadow-[0_2px_5px_rgba(0,0,0,0.3)] ${isActive ? 'translate-x-7 scale-110' : 'translate-x-1 opacity-60 scale-90'
                              }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                  </div>
                </div>

                <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl shadow-inner">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                      <Star className="w-5 h-5 drop-shadow-md" />
                    </div>
                    <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">Personalized Alerts</h5>
                  </div>
                  <div className="space-y-3">
                  {([
                    { key: 'notifyFavGenres', label: 'Trending in Favorite Genres', desc: 'Alerts matching critical genres from your DNA profile.' },
                    { key: 'notifyWatchHistoryRecs', label: 'History Recommendations', desc: 'Tailored picks based on your ratings and watch history.' },
                    { key: 'notifySimilarContent', label: 'Similar Content Alerts', desc: 'Movies sharing directors, actors, or themes you love.' },
                  ] as { key: keyof ProfileSettings; label: string; desc: string }[]).map((item) => {
                    const isActive = (profile[item.key] as boolean | undefined) ?? true;
                    return (
                      <div key={item.key as string} className="flex gap-4 items-center justify-between p-5 rounded-[20px] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                        <div>
                          <p className="text-xs font-black text-white uppercase tracking-wider group-hover:text-brand transition-colors drop-shadow-sm">{item.label}</p>
                          <p className="text-[10px] text-white/50 mt-1.5 font-bold tracking-widest uppercase group-hover:text-white/70 transition-colors">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => handleTogglePref(item.key as any)}
                          className={`w-14 h-7 rounded-full relative transition-all duration-500 border-2 shrink-0 cursor-pointer overflow-hidden ${isActive
                            ? 'bg-brand/80 border-brand shadow-[0_0_20px_rgba(229,9,20,0.6)]'
                            : 'bg-black/60 border-white/20 hover:border-white/40 shadow-inner'
                            }`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-white/20 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                          <div
                            className={`absolute top-0.5 bottom-0.5 w-5 bg-white rounded-full transition-all duration-500 shadow-[0_2px_5px_rgba(0,0,0,0.3)] ${isActive ? 'translate-x-7 scale-110' : 'translate-x-1 opacity-60 scale-90'
                              }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 mt-8">
                  <div className="rounded-[32px] bg-gradient-to-br from-purple-500/10 via-[#0a0a0a]/80 to-indigo-500/5 border border-white/10 backdrop-blur-2xl shadow-[inset_0_0_20px_rgba(168,85,247,0.1)] overflow-hidden">
                    <div className="flex flex-row items-center justify-between px-6 sm:px-8 pt-8 pb-6 border-b border-white/5 gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-[20px] bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                          <Shield className="w-6 h-6 text-purple-400 drop-shadow-md" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 truncate drop-shadow-md">
                            Vigilance Hub
                          </h5>
                          <p className="text-[10px] text-white/50 font-bold mt-1 tracking-widest uppercase truncate">
                            Real-time security &amp; account activity monitoring
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0 whitespace-nowrap gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 shadow-inner">
                        <div className="w-2 h-2 shrink-0 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,1)] animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-400 drop-shadow-sm">All Clear</span>
                      </div>
                    </div>
                    <div className="p-6 sm:p-8 space-y-8">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { label: 'Active Sessions', value: activeSessions.length.toString(), icon: '💻', color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/20' },
                          { label: 'Login Streak', value: `${profile?.loginStreak || 1}d`, icon: '🔑', color: 'text-green-400', bg: 'bg-green-500/5 border-green-500/20' },
                          { label: 'Alerts', value: totalAuditLogs.toString(), icon: '⚠️', color: 'text-yellow-400', bg: 'bg-yellow-500/5 border-yellow-500/20' },
                        ].map((stat) => (
                          <div key={stat.label} className={`p-4 rounded-[20px] border ${stat.bg} backdrop-blur-md flex flex-col gap-2 hover:bg-white/5 transition-all duration-300 shadow-inner`}>
                            <span className="text-2xl drop-shadow-md">{stat.icon}</span>
                            <p className={`text-2xl font-display font-black tracking-tight drop-shadow-lg ${stat.color}`}>{stat.value}</p>
                            <p className="text-[9px] font-bold uppercase text-white/40 tracking-widest leading-tight">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <h6 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Recent Account Events</h6>
                        {auditLogs.length > 0 ? auditLogs.map((ev, i) => (
                          <div key={ev.id || i} className="flex items-center gap-4 p-4 rounded-[20px] bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-300 group shadow-inner">
                            <div className={`w-3 h-3 rounded-full shrink-0 shadow-md ${ev.dot}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black uppercase text-white tracking-widest truncate drop-shadow-sm group-hover:text-purple-400 transition-colors">{ev.event}</p>
                              <p className="text-[10px] text-white/40 font-bold tracking-widest mt-1 truncate">{ev.detail}</p>
                            </div>
                            <span className="text-[9px] text-white/30 font-black uppercase tracking-widest shrink-0 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                              {ev.timestamp ? new Date(ev.timestamp?.toDate?.() || ev.timestamp).toLocaleDateString() : 'Just now'}
                            </span>
                          </div>
                        )) : (
                          <div className="p-6 text-center border border-white/10 rounded-[24px] bg-white/[0.02] backdrop-blur-md shadow-inner">
                            <p className="text-[10px] text-white/50 uppercase tracking-widest font-black">No recent events</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4 pt-6 border-t border-white/5">
                        <h6 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Security Alert Preferences</h6>
                        {([
                          { key: 'securityAlertNewDevice', label: 'Login from New Device', desc: 'Instant alert when account is accessed from an unrecognized device.' },
                          { key: 'securityAlertSuspicious', label: 'Suspicious Activity Alerts', desc: 'Notified of unusual login patterns or location changes.' },
                          { key: 'securityAlertProfileChange', label: 'Profile Change Confirmed', desc: 'Confirmation when display name, bio, or avatar is updated.' },
                          { key: 'securityAlertWeeklyDigest', label: 'Weekly Security Digest', desc: 'Summary of login activity and account changes every Sunday.' },
                        ] as { key: keyof ProfileSettings; label: string; desc: string }[]).map((t) => {
                          const isActive = profile[t.key] ?? true;
                          return (
                            <div key={t.key} className="flex gap-4 items-center justify-between p-4 rounded-[20px] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                              <div>
                                <p className="text-[11px] font-black text-white uppercase tracking-wider group-hover:text-purple-400 transition-colors drop-shadow-sm">{t.label}</p>
                                <p className="text-[10px] text-white/50 mt-1.5 font-bold tracking-widest uppercase transition-colors group-hover:text-white/70">{t.desc}</p>
                              </div>
                              <button
                                onClick={() => {
                                  handleTogglePref(t.key as any);
                                  logSecurityEvent(user?.uid, 'Security Preference Updated', `${t.label} was toggled`, 'bg-brand');
                                }}
                                className={`w-14 h-7 rounded-full relative transition-all duration-500 border-2 shrink-0 cursor-pointer overflow-hidden ${isActive
                                  ? 'bg-purple-600/80 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]'
                                  : 'bg-black/60 border-white/20 hover:border-white/40 shadow-inner'
                                  }`}
                              >
                                <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-white/20 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                                <div className={`absolute top-0.5 bottom-0.5 w-5 bg-white rounded-full transition-all duration-500 shadow-[0_2px_5px_rgba(0,0,0,0.3)] ${isActive ? 'translate-x-7 scale-110' : 'translate-x-1 opacity-60 scale-90'}`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-3 pt-6 border-t border-white/5">
                        <button
                          onClick={() => toast.success('Sending login activity report to your email.')}
                          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/10 text-[10px] font-black uppercase tracking-widest text-white hover:text-purple-300 transition-all duration-300 shadow-inner hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                        >
                          <Activity className="w-4 h-4" /> Email Activity Report
                        </button>
                        <button
                          onClick={async () => {
                            if (!user?.uid) return;
                            const t = toast.loading('Terminating all sessions…');
                            try {
                              const token = await user.getIdToken();
                              const res = await fetch('/api/user/revoke-sessions', {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ uid: user.uid }),
                              });
                              if (!res.ok) throw new Error();
                              logSecurityEvent(user?.uid, 'All Sessions Terminated', 'All refresh tokens revoked via Firebase Admin.', 'bg-red-500');
                              toast.dismiss(t);
                              toast.success('All other active sessions have been terminated.');
                            } catch {
                              toast.dismiss(t);
                              toast.error('Failed to terminate sessions.');
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/5 text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-all"
                        >
                          <Power className="w-3 h-3" /> Terminate All Sessions
                        </button>
                        {/* 
                        <button
                          onClick={() => toast.error('2FA setup is currently unavailable.')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/25 hover:bg-purple-500/20 text-[9px] font-black uppercase tracking-widest text-purple-400/50 transition-all"
                        >
                          <ShieldCheck className="w-3 h-3" /> Enable 2FA
                        </button>
                        */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeSettingTab === 'preferences' && (
              <div className="space-y-8 animate-fadeIn relative">
                <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-brand/20 blur-[60px] rounded-full pointer-events-none" />
                  <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Curation Preferences</h4>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Configure language, region, content filters, and build your content DNA profile.</p>
                </div>

                {profile.plan !== 'premium' && (
                  <div className="absolute inset-0 z-50 rounded-[32px] bg-black/50 backdrop-blur-md flex items-center justify-center mt-24">
                    <div className="bg-[#0a0a0a]/80 border border-brand/40 p-8 rounded-[32px] max-w-md text-center shadow-[0_0_50px_rgba(240,171,252,0.2)] flex flex-col items-center transform transition-all duration-500 hover:scale-[1.02] backdrop-blur-2xl">
                      <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand mb-6 shadow-[inset_0_0_20px_rgba(240,171,252,0.2)]">
                        <Lock className="w-8 h-8 drop-shadow-md" />
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-3 drop-shadow-md">Upgrade to Premium</h3>
                      <p className="text-xs text-white/60 mb-8 leading-relaxed font-medium">Unlock full access to the DNA Filter, custom region and language settings, and personalized streaming catalogs.</p>
                      <button 
                        onClick={() => setActiveSettingTab('payment' as any)} 
                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-brand to-purple-500 text-white text-xs font-black uppercase tracking-widest hover:shadow-[0_0_30px_rgba(240,171,252,0.5)] hover:scale-[1.02] transition-all duration-300 border border-white/20"
                      >
                        Unlock Preferences
                      </button>
                    </div>
                  </div>
                )}

                <div className={profile.plan !== 'premium' ? 'opacity-30 pointer-events-none select-none blur-sm transition-all duration-500 space-y-8' : 'space-y-8'}>
                  
                  <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl shadow-inner">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        <Globe className="w-5 h-5 drop-shadow-md" />
                      </div>
                      <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">Global Settings</h5>
                    </div>

                    <div className="flex gap-4 items-center justify-between p-5 rounded-[24px] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group shadow-inner">
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-wider group-hover:text-brand transition-colors drop-shadow-sm">Auto Filter (DNA Match)</p>
                        <p className="text-[10px] text-white/50 mt-1.5 font-bold tracking-widest uppercase group-hover:text-white/70 transition-colors">Automatically apply your DNA Filter settings. Turn off to view default catalog.</p>
                      </div>
                      <button
                        onClick={() => handleLocalToggle('autoFilter')}
                        className={`w-14 h-7 rounded-full relative transition-all duration-500 border-2 shrink-0 cursor-pointer overflow-hidden ${(profile.autoFilter ?? false)
                          ? 'bg-brand/80 border-brand shadow-[0_0_20px_rgba(240,171,252,0.6)]'
                          : 'bg-black/60 border-white/20 hover:border-white/40 shadow-inner'
                          }`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-white/20 transition-opacity duration-500 ${(profile.autoFilter ?? false) ? 'opacity-100' : 'opacity-0'}`} />
                        <div className={`absolute top-0.5 bottom-0.5 w-5 bg-white rounded-full transition-all duration-500 shadow-[0_2px_5px_rgba(0,0,0,0.3)] ${(profile.autoFilter ?? false) ? 'translate-x-7 scale-110' : 'translate-x-1 opacity-60 scale-90'}`} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div className="space-y-3 relative group">
                        <label className="text-[11px] font-black uppercase text-white/50 tracking-widest px-2 group-hover:text-brand transition-colors">Prevalent Language</label>
                        <CustomSelect
                          value={profile.prefLanguage || 'en'}
                          onChange={(val) => handleLocalSelect('prefLanguage', val)}
                          options={tmdbLanguages.length > 0 ? tmdbLanguages : [{ value: 'en', label: 'English' }]}
                          className="bg-black/60 border border-white/10 rounded-[24px] p-5 text-sm font-bold group-hover:border-white/30 transition-all duration-300 shadow-inner hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                        />
                      </div>
                      <div className="space-y-3 relative group">
                        <label className="text-[11px] font-black uppercase text-white/50 tracking-widest px-2 group-hover:text-brand transition-colors">Active Watch Region</label>
                        <CustomSelect
                          value={profile.watchRegion || 'IN'}
                          onChange={(val) => handleRegionChange(val)}
                          options={tmdbRegions.length > 0 ? tmdbRegions : [{ value: 'IN', label: 'India' }]}
                          className="bg-black/60 border border-white/10 rounded-[24px] p-5 text-sm font-bold group-hover:border-white/30 transition-all duration-300 shadow-inner hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl shadow-inner">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-10 h-10 rounded-2xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                        <MonitorPlay className="w-5 h-5 drop-shadow-md" />
                      </div>
                      <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">Content Format Preference</h5>
                    </div>
                    <div className="flex gap-4">
                      {[
                        { id: 'movies', label: '🎬 Movies Only' },
                        { id: 'tv', label: '📺 TV Shows Only' },
                        { id: 'both', label: '✨ Both' }
                      ].map((item) => {
                        const isActive = (profile.prefContentType || 'both') === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleLocalSelect('prefContentType', item.id)}
                            className={`flex-1 py-5 px-4 rounded-[24px] border text-xs font-black uppercase tracking-widest transition-all duration-300 hover:-translate-y-1 ${isActive ? 'bg-gradient-to-br from-brand/20 to-transparent border-brand/50 text-white shadow-[0_10px_20px_rgba(240,171,252,0.2)] scale-[1.02]' : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10 shadow-inner'
                              }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-[inset_0_0_30px_rgba(168,85,247,0.05)]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full pointer-events-none" />
                    
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                      <div className="w-12 h-12 rounded-[20px] bg-brand/20 border border-brand/40 flex items-center justify-center text-brand shadow-[0_0_20px_rgba(240,171,252,0.3)]">
                        <Fingerprint className="w-6 h-6 drop-shadow-md" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">🧬 DNA Filter</h5>
                        <p className="text-[10px] text-white/50 tracking-widest font-bold uppercase mt-1">Your Unique Feature</p>
                      </div>
                    </div>

                    <div className="space-y-8 relative z-10">
                      <div className="space-y-4">
                      <p className="text-[11px] font-black uppercase text-white/60 tracking-widest px-2">Select Moods</p>
                      <div className="flex flex-wrap gap-3">
                        {['Feel Good', 'Dark', 'Emotional', 'Family', 'Inspirational'].map((mood) => {
                          const activeMoods = profile.dnaMoods || [];
                          const isActive = activeMoods.includes(mood);
                          return (
                            <button
                              key={mood}
                              onClick={() => handleToggleDnaMood(mood)}
                              className={`px-6 py-3 rounded-[20px] border text-[11px] font-black uppercase tracking-widest transition-all duration-300 hover:-translate-y-1 ${isActive ? 'bg-gradient-to-r from-brand/30 to-purple-500/30 border-brand/50 text-white shadow-[0_10px_20px_rgba(240,171,252,0.3)] scale-105' : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/30 shadow-inner'
                                }`}
                            >
                              {mood}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[11px] font-black uppercase text-white/60 tracking-widest px-2">Maximum Runtime</p>
                      <div className="flex gap-3">
                        {[
                          { id: '90m', label: 'Under 90 mins' },
                          { id: '120m', label: 'Under 2 hours' },
                          { id: 'none', label: 'No preference' }
                        ].map((item) => {
                          const isActive = (profile.dnaRuntime || 'none') === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleLocalSelect('dnaRuntime', item.id)}
                              className={`flex-1 py-4 px-4 rounded-[20px] border text-[11px] font-black uppercase tracking-widest transition-all duration-300 hover:-translate-y-1 ${isActive ? 'bg-gradient-to-r from-brand/30 to-purple-500/30 border-brand/50 text-white shadow-[0_10px_20px_rgba(240,171,252,0.3)] scale-[1.02]' : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/30 shadow-inner'
                                }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-white/10">
                      <div className="flex items-center justify-between px-2">
                        <p className="text-[11px] font-black uppercase text-white/60 tracking-widest">📡 My Streaming Platforms</p>
                        <span className="text-[10px] text-brand font-black uppercase tracking-widest bg-brand/10 border border-brand/30 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(240,171,252,0.2)]">
                          {profile.subscriptions?.length || 0} Active
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest px-2">Select platforms you subscribe to. We'll prioritize results from these services.</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                        {STREAMING_PLATFORMS.map((platform) => {
                          const isActive = profile.subscriptions?.includes(platform.name) || false;
                          return (
                            <button
                              key={platform.id}
                              onClick={() => handleToggleSub(platform.name)}
                              title={platform.name}
                              className={`relative group flex flex-col items-center gap-4 p-5 rounded-[24px] border transition-all duration-300 hover:-translate-y-1 ${isActive ? `bg-gradient-to-br from-white/10 to-white/5 border-white/30 shadow-[0_10px_30px_rgba(255,255,255,0.1)] ${platform.glow} scale-[1.02]` : 'bg-[#0a0a0a]/50 border-white/10 hover:border-white/30 hover:bg-white/5 shadow-inner'
                                }`}
                            >
                              <div className={`w-14 h-14 rounded-[20px] ${platform.color} flex items-center justify-center text-white font-black text-xl shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${isActive ? 'ring-2 ring-white/50 ring-offset-4 ring-offset-[#0a0a0a]' : ''}`}>
                                {platform.logo}
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-widest leading-tight text-center line-clamp-2 transition-colors ${isActive ? 'text-white drop-shadow-md' : 'text-white/40 group-hover:text-white/80'}`}>{platform.name}</span>
                              {isActive && (
                                <div className="absolute top-3 right-3 w-5 h-5 bg-brand rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(240,171,252,1)] animate-in zoom-in duration-300">
                                  <svg width="10" height="10" viewBox="0 0 7 7" fill="none"><path d="M1 3.5L3 5.5L6 1.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}
            {activeSettingTab === 'privacy' && (
              <div className="space-y-8 animate-fadeIn relative">
                <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/20 blur-[60px] rounded-full pointer-events-none" />
                  <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Privacy & Security</h4>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Review active connections, secure your account details, and manage local logs.</p>
                </div>
                {/* TEMPORARILY DISABLED - Account Security / 2FA
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Account Security</h5>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setIsTwoFactorModalOpen(true)}
                      className="bg-white/5 border border-white/10 hover:border-brand/40 text-white font-black text-[10px] uppercase tracking-wider px-6 py-4 rounded-xl transition-all flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5" /> Set up Two-Factor Auth
                    </button>
                  </div>
                </div>
                */}
                <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl shadow-inner">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        <MonitorSmartphone className="w-5 h-5 drop-shadow-md" />
                      </div>
                      <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">Active Sessions</h5>
                    </div>
                    <button
                      onClick={() => setIsLogoutAllModalOpen(true)}
                      className="text-[10px] font-black text-brand uppercase tracking-widest hover:text-white hover:bg-brand bg-brand/10 px-4 py-2 rounded-xl border border-brand/30 transition-all duration-300 shadow-[0_0_10px_rgba(240,171,252,0.1)] hover:shadow-[0_0_20px_rgba(240,171,252,0.4)]"
                    >
                      Logout All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-5 bg-white/[0.02] border border-white/5 rounded-[20px] flex items-center justify-between hover:bg-white/5 hover:border-white/10 transition-all duration-300 group shadow-inner"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/5 rounded-2xl text-white/50 group-hover:text-white/80 transition-colors border border-white/5 group-hover:border-white/10">
                            {session.device.includes('iPhone') ? <Smartphone className="w-5 h-5 drop-shadow-sm" /> : <Laptop className="w-5 h-5 drop-shadow-sm" />}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight text-white group-hover:text-indigo-400 transition-colors drop-shadow-sm">{session.device}</p>
                            <p className="text-[10px] text-white/40 font-bold mt-1 tracking-widest uppercase">{session.browser} • {session.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-5">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5">{session.lastActive}</span>
                          {!session.current && (
                            <button
                              onClick={async () => {
                                try {
                                  await deleteDoc(doc(getFirestore(app), `users/${user.uid}/sessions/${session.id}`));
                                  toast.success(`Logged out of ${session.device}.`);
                                } catch (e) {
                                  toast.error('Failed to logout device.');
                                }
                              }}
                              className="text-[10px] font-black text-red-500/70 hover:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-xl transition-all duration-300 uppercase tracking-widest border border-transparent hover:border-red-500/20"
                            >
                              Logout
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-[inset_0_0_30px_rgba(249,115,22,0.05)]">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 blur-[80px] rounded-full pointer-events-none" />
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-12 h-12 rounded-[20px] bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                      <Database className="w-6 h-6 drop-shadow-md" />
                    </div>
                    <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">Data Controls</h5>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                    {[
                      {
                        label: 'Download My Data', isPremiumOnly: true, action: async () => {
                          if (!user?.uid || !user?.email) { toast.error('No account found.'); return; }
                          const loadingToast = toast.loading('Compiling your data archive…');
                          try {
                            const db = getFirestore(app);
                            const auditSnap = await getDocs(
                              collection(db, 'users', user.uid, 'audit_logs')
                            );
                            const auditLogs = auditSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                            const searchSnap = await getDocs(
                              collection(db, 'users', user.uid, 'search_history')
                            );
                            const searchHistory = searchSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                            const { generateUserDataPdf } = await import('@/lib/pdfGenerator');
                            const pdfData = {
                              user: {
                                uid: user.uid,
                                displayName: user.displayName,
                                email: user.email,
                                photoURL: user.photoURL,
                                emailVerified: user.emailVerified,
                                creationTime: user.metadata?.creationTime,
                                lastSignInTime: user.metadata?.lastSignInTime,
                              },
                              profile,
                              watchlist,
                              userReviews,
                              activeSessions,
                              auditLogs,
                              searchHistory,
                            };
                            const { blob, base64 } = generateUserDataPdf(pdfData);

                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `StreamFind_Data_${new Date().toISOString().split('T')[0]}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);

                            const res = await fetch('/api/user/export-data', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${await user.getIdToken()}`
                              },
                              body: JSON.stringify({
                                uid: user.uid,
                                email: user.email,
                                displayName: user.displayName,
                                pdfBase64: base64
                              }),
                            });

                            if (!res.ok) throw new Error('Server error');
                            toast.dismiss(loadingToast);
                            logSecurityEvent(user?.uid, 'Data Export Requested', `Full PDF archive downloaded & emailed to ${user.email}`, 'bg-blue-400');
                            toast.success(`Complete data archive downloaded and sent to ${user.email}!`);
                          } catch (err) {
                            console.error('Data Export Error:', err);
                            toast.dismiss(loadingToast);
                            toast.error('Failed to compile data. Please try again.');
                          }
                        }, icon: Download
                      },
                      {
                        label: 'Clear Search History', action: async () => {
                          const loadingToast = toast.loading('Clearing search history…');
                          try {
                            const searchKeys = ['searchHistory', 'recentSearches', 'streamfind_search', 'search_history'];
                            searchKeys.forEach(k => localStorage.removeItem(k));
                            Object.keys(localStorage)
                              .filter(k => k.toLowerCase().includes('search'))
                              .forEach(k => localStorage.removeItem(k));

                            if (user?.uid) {
                              const db = getFirestore(app);
                              await updateDoc(doc(db, `users/${user.uid}`), {
                                searchHistory: deleteField(),
                                recentSearches: deleteField(),
                              });
                              try {
                                const shDocs = await getDocs(collection(db, `users/${user.uid}/search_history`));
                                if (!shDocs.empty) {
                                  const batch = writeBatch(db);
                                  shDocs.forEach(d => batch.delete(d.ref));
                                  await batch.commit();
                                }
                              } catch { }
                            }

                            logSecurityEvent(user?.uid, 'Search History Cleared', 'All search history wiped from local storage and Firebase.', 'bg-orange-400');
                            toast.dismiss(loadingToast);
                            toast.success('Search history cleared from local storage and Firebase.');
                          } catch {
                            toast.dismiss(loadingToast);
                            toast.error('Failed to clear search history.');
                          }
                        }, icon: RefreshCw
                      },
                      {
                        label: 'Clear Watch History', action: async () => {
                          if (!user?.uid) return;
                          const loadingToast = toast.loading('Clearing watch history…');
                          try {
                            const db = getFirestore(app);
                            const batch = writeBatch(db);
                            const wlDocs = await getDocs(collection(db, `users/${user.uid}/watchlist`));
                            wlDocs.forEach(d => batch.delete(d.ref));
                            const rvDocs = await getDocs(collection(db, `users/${user.uid}/reviews`));
                            rvDocs.forEach(d => batch.delete(d.ref));
                            await batch.commit();
                            logSecurityEvent(user?.uid, 'Watch History Cleared', 'Watchlist and reviews wiped from Firebase and local state.', 'bg-red-500');
                            toast.dismiss(loadingToast);
                            toast.success('Watch history cleared from all sources.');
                          } catch {
                            toast.dismiss(loadingToast);
                            toast.error('Failed to clear watch history.');
                          }
                        }, icon: Trash2
                      },
                      {
                        label: 'Delete Curation Data', action: async () => {
                          if (!user?.uid) return;
                          const loadingToast = toast.loading('Deleting curation data…');
                          try {
                            const db = getFirestore(app);
                            await updateDoc(doc(db, `users/${user.uid}`), {
                              dnaMoods: deleteField(),
                              dnaRuntime: deleteField(),

                              top10: deleteField(),
                            });
                            setProfile(prev => ({
                              ...prev,
                              dnaMoods: [],
                              dnaRuntime: 'none',

                              top10: undefined,
                            }));
                            logSecurityEvent(user?.uid, 'Curation Data Deleted', 'DNA filters and top picks wiped from Firebase and local state.', 'bg-red-500');
                            toast.dismiss(loadingToast);
                            toast.success('Curation data deleted from all sources.');
                          } catch {
                            toast.dismiss(loadingToast);
                            toast.error('Failed to delete curation data.');
                          }
                        }, icon: AlertCircle
                      }
                    ].map((item, idx) => {
                      const isLocked = (item as any).isPremiumOnly && profile.plan !== 'premium';
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (isLocked) {
                              toast.error('Upgrade to Premium to unlock!');
                              router.push('/profile?tab=payment');
                              return;
                            }
                            item.action();
                          }}
                          className={`flex flex-col items-center justify-center p-6 rounded-[24px] border transition-all duration-500 hover:-translate-y-2 gap-4 relative overflow-hidden group ${
                            isLocked 
                              ? 'bg-black/60 border-white/5 opacity-40 cursor-not-allowed shadow-inner' 
                              : item.label.includes('Delete') || item.label.includes('Clear') 
                                ? 'bg-[#0a0a0a]/50 border-white/10 hover:border-red-500/50 hover:bg-red-500/10 shadow-[0_5px_15px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_30px_rgba(239,68,68,0.3)] backdrop-blur-xl' 
                                : 'bg-[#0a0a0a]/50 border-white/10 hover:border-brand/40 hover:bg-brand/5 shadow-[0_5px_15px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_30px_rgba(240,171,252,0.2)] backdrop-blur-xl'
                          }`}
                        >
                          {isLocked && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] font-black uppercase tracking-widest text-brand">Premium Only</span>
                            </div>
                          )}
                          {isLocked ? (
                            <div className="w-14 h-14 rounded-[20px] bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                              <Lock className="w-6 h-6 text-white/30" />
                            </div>
                          ) : (
                            <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all duration-500 shadow-md ${
                              item.label.includes('Delete') || item.label.includes('Clear') 
                                ? 'bg-red-500/10 border border-red-500/20 group-hover:bg-red-500/20 group-hover:scale-110 group-hover:rotate-6' 
                                : 'bg-brand/10 border border-brand/20 group-hover:bg-brand/20 group-hover:scale-110 group-hover:-rotate-6'
                            }`}>
                              <item.icon className={`w-6 h-6 transition-colors duration-300 ${
                                item.label.includes('Delete') || item.label.includes('Clear') 
                                  ? 'text-red-400/80 group-hover:text-red-400 drop-shadow-md' 
                                  : 'text-brand/80 group-hover:text-brand drop-shadow-md'
                              }`} />
                            </div>
                          )}
                          <span className={`text-[10px] font-black uppercase tracking-widest text-center leading-tight transition-colors duration-300 relative z-0 ${
                            isLocked
                              ? 'text-white/30'
                              : item.label.includes('Delete') || item.label.includes('Clear')
                                ? 'text-white/60 group-hover:text-red-400'
                                : 'text-white/60 group-hover:text-brand'
                          }`}>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full pointer-events-none" />
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-12 h-12 rounded-[20px] bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                      <UserCog className="w-6 h-6 drop-shadow-md" />
                    </div>
                    <div>
                      <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">Account Management</h5>
                      <p className="text-[10px] text-white/50 font-bold tracking-widest uppercase mt-1">Manage authentication, session, and account status.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                    <button
                      onClick={async () => {
                        try {
                          const email = profile.email || '';
                          if (!email) { toast.error('No email found on your account.'); return; }
                          const res = await fetch('/api/auth/send-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'reset', email })
                          });
                          if (!res.ok) throw new Error('Failed');
                          toast.success(`Reset link sent to ${email}`);
                        } catch { toast.error('Failed to send reset email. Try again.'); }
                      }}
                      className="group flex items-center gap-5 p-6 rounded-[24px] bg-white/5 border border-white/10 hover:border-brand/40 hover:bg-[#0a0a0a] transition-all duration-300 text-left shadow-[0_5px_15px_rgba(0,0,0,0.2)] hover:shadow-[0_10px_30px_rgba(240,171,252,0.15)]"
                    >
                      <div className="w-14 h-14 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-brand/10 group-hover:border-brand/30 transition-all duration-500 shrink-0 group-hover:scale-110 shadow-inner">
                        <Lock className="w-6 h-6 text-white/40 group-hover:text-brand transition-colors drop-shadow-md" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase text-white tracking-widest group-hover:text-brand transition-colors drop-shadow-sm">Reset Password</p>
                        <p className="text-[10px] text-white/50 font-bold mt-1 tracking-widest uppercase">Send a reset link to your email</p>
                      </div>
                    </button>
                    <button
                      onClick={() => onSignOut?.()}
                      className="group flex items-center gap-5 p-6 rounded-[24px] bg-white/5 border border-white/10 hover:border-yellow-500/40 hover:bg-[#0a0a0a] transition-all duration-300 text-left shadow-[0_5px_15px_rgba(0,0,0,0.2)] hover:shadow-[0_10px_30px_rgba(234,179,8,0.15)]"
                    >
                      <div className="w-14 h-14 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-yellow-500/10 group-hover:border-yellow-500/30 transition-all duration-500 shrink-0 group-hover:scale-110 shadow-inner">
                        <LogOut className="w-6 h-6 text-white/40 group-hover:text-yellow-400 transition-colors drop-shadow-md" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase text-white tracking-widest group-hover:text-yellow-400 transition-colors drop-shadow-sm">Sign Out</p>
                        <p className="text-[10px] text-white/50 font-bold mt-1 tracking-widest uppercase">Securely log out of this device</p>
                      </div>
                    </button>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-4 relative z-10">
                    <button
                      onClick={() => toast.error('Account deactivation requires email verification.')}
                      className="group flex items-center justify-center gap-3 px-6 py-4 rounded-[20px] bg-white/5 border border-white/10 hover:bg-yellow-500/10 hover:border-yellow-500/30 transition-all duration-300 shadow-inner"
                    >
                      <AlertTriangle className="w-5 h-5 text-white/40 group-hover:text-yellow-400 transition-colors drop-shadow-sm group-hover:scale-110 duration-300" />
                      <span className="text-[11px] font-black uppercase text-white/60 tracking-widest group-hover:text-yellow-400 transition-colors">Deactivate Account</span>
                    </button>
                    <button
                      onClick={() => toast.error('Account deletion is permanent. Please contact support.')}
                      className="group flex items-center justify-center gap-3 px-6 py-4 rounded-[20px] bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300 shadow-inner"
                    >
                      <UserX className="w-5 h-5 text-red-500/60 group-hover:text-red-500 transition-colors drop-shadow-sm group-hover:scale-110 duration-300" />
                      <span className="text-[11px] font-black uppercase text-red-500/60 tracking-widest group-hover:text-red-500 transition-colors">Delete Account Permanently</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSettingTab === 'payment' && (
              <div className="space-y-8 animate-fadeIn relative">
                <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 blur-[60px] rounded-full pointer-events-none" />
                  <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Payment & Billing</h4>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Manage your billing, saved methods, and premium subscriptions.</p>
                </div>

                {/* Payment Security Info */}
                <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                  <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
                    <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex-shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      <ShieldCheck className="w-8 h-8 text-emerald-400 drop-shadow-md" />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-white uppercase tracking-widest mb-2 drop-shadow-md">Payments secured by Razorpay</h5>
                      <p className="text-[11px] text-white/60 leading-relaxed font-bold">
                        Your card numbers, UPI IDs, and bank details are <span className="text-emerald-400 font-black drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]">never stored</span> on our servers or in your browser. 
                        All payment data is handled exclusively by Razorpay, which is PCI-DSS Level 1 compliant — the highest level of payment security certification.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-5">
                        <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400/80 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">PCI-DSS</span>
                        <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400/80 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">256-BIT SSL</span>
                        <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400/80 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">RBI COMPLIANT</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gradient-to-br from-brand/20 to-purple-500/10 border border-brand/30 rounded-[32px] p-8 md:p-10 relative overflow-hidden flex flex-col justify-center shadow-[inset_0_0_50px_rgba(240,171,252,0.1)]">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-brand/30 blur-[80px] rounded-full pointer-events-none" />
                      <p className="text-[11px] text-brand uppercase tracking-widest font-black relative z-10 drop-shadow-md">Current Plan</p>
                      <p className="text-4xl font-display font-black text-white mt-2 uppercase italic tracking-tight relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                        {billingPlan === 'premium' ? 'Premium' : 'Free Tier'}
                      </p>
                      {billingPlan === 'premium' ? (
                        <p className="text-[11px] text-white/80 mt-3 font-bold tracking-widest relative z-10">You have access to all premium features.</p>
                      ) : (
                        <p className="text-[11px] text-white/80 mt-3 font-bold tracking-widest relative z-10">Upgrade to Premium for full features.</p>
                      )}
                      
                      {billingPlan !== 'premium' && (
                        <button 
                          onClick={handleUpgrade}
                          disabled={isUpgrading}
                          className="mt-8 px-8 py-5 bg-gradient-to-r from-brand to-purple-500 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:shadow-[0_0_30px_rgba(240,171,252,0.5)] transition-all duration-300 hover:scale-105 disabled:opacity-50 relative z-10 border border-white/20"
                        >
                          {isUpgrading ? 'Loading...' : 'Upgrade Now'}
                        </button>
                      )}
                    </div>
                    
                    <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl space-y-6 shadow-inner flex flex-col justify-between">
                      <div className="space-y-6">
                        <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                          <span className="text-[11px] text-white/50 uppercase font-black tracking-widest">Renewal Date</span>
                          <span className="text-xs text-white font-bold tracking-wider">{billingPlan === 'premium' ? renewalDate : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center px-2">
                          <span className="text-[11px] text-white/50 uppercase font-black tracking-widest">Billing History</span>
                          <button className="text-[10px] text-brand hover:text-white transition-colors font-black uppercase tracking-widest bg-brand/10 hover:bg-brand/30 px-3 py-1.5 rounded-xl border border-brand/20">View All</button>
                        </div>
                        
                        <div className="space-y-3">
                        {invoices.length > 0 ? (
                          invoices.slice(0, 1).map((inv, idx) => (
                            <div key={idx} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/5 transition-colors">
                              <span className="text-[11px] text-white/50 font-mono tracking-widest">#{inv.id?.substring(0, 8)}</span>
                              <span className="text-[11px] text-white/90 font-black tracking-widest">₹{inv.amount}</span>
                              <button 
                                onClick={async () => {
                                  try {
                                    toast.loading('Generating invoice…', { id: 'invoice-dl' });
                                    const { generateInvoicePdf } = await import('@/lib/pdfGenerator');
                                    const blob = generateInvoicePdf(inv, {
                                      displayName: user?.displayName,
                                      email: user?.email,
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `StreamFind_Invoice_${inv.id?.substring(0, 12) || 'unknown'}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    toast.success('Invoice downloaded!', { id: 'invoice-dl' });
                                  } catch (err) {
                                    console.error('Invoice download error:', err);
                                    toast.error('Failed to generate invoice.', { id: 'invoice-dl' });
                                  }
                                }}
                                className="text-[10px] bg-white/10 hover:bg-brand/20 hover:text-brand border border-white/10 hover:border-brand/30 text-white px-4 py-2 rounded-xl uppercase font-black tracking-widest transition-all"
                              >Download</button>
                            </div>
                          ))
                        ) : (
                          <div className="flex justify-center items-center py-8 border border-white/5 rounded-2xl bg-white/[0.02] border-dashed">
                            <span className="text-[11px] text-white/30 uppercase font-black tracking-widest">No invoices yet</span>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Premium Features */}
                <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl mt-8 shadow-inner">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                      <Star className="w-5 h-5 drop-shadow-md" />
                    </div>
                    <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">Premium Features Included</h5>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { title: 'Ad-Free Experience', icon: MonitorPlay },
                      { title: 'Advanced Filters', icon: Sliders },
                      { title: 'Early Access', icon: Unlock },
                      { title: 'Multiple Watchlists', icon: LayoutList }
                    ].map((feat, i) => (
                      <div key={i} className="p-6 rounded-[24px] bg-gradient-to-br from-white/5 to-transparent border border-white/10 text-center flex flex-col items-center gap-4 hover:-translate-y-2 transition-transform duration-500 hover:shadow-[0_10px_30px_rgba(255,255,255,0.05)] shadow-inner group">
                        <div className="w-14 h-14 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-brand/20 transition-all duration-500 shadow-[inset_0_0_10px_rgba(240,171,252,0.1)]">
                          <feat.icon className="w-6 h-6 text-brand drop-shadow-md" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors leading-relaxed">{feat.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSettingTab === 'help' && (
              <div className="space-y-8 animate-fadeIn relative">
                <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />
                  <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Help & Support</h4>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Get assistance, contact support, and view legal documents.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: FAQ & Legal */}
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <h5 className="text-[11px] font-black uppercase tracking-widest text-white/50 drop-shadow-sm pl-2">Frequently Asked Questions</h5>
                      <div className="space-y-3">
                        {[
                          { q: 'What is StreamFinds?', a: 'A universal streaming aggregator that tracks what to watch and where.' },
                          { q: 'How does availability tracking work?', a: 'We sync daily with global databases to ensure accurate streaming platforms.' },
                          { q: 'Why can\'t I play content directly?', a: 'StreamFinds redirects you to the official platform where the content is hosted.' },
                          { q: 'How often is data updated?', a: 'Pricing, availability, and trending metrics are refreshed every 24 hours.' }
                        ].map((faq, i) => (
                          <div key={i} className="p-6 rounded-[24px] bg-[#0a0a0a]/50 border border-white/10 backdrop-blur-xl hover:bg-white/5 transition-all duration-300 shadow-inner group">
                            <p className="text-[11px] font-black text-white uppercase tracking-wider group-hover:text-blue-400 transition-colors drop-shadow-sm">{faq.q}</p>
                            <p className="text-[10px] text-white/50 mt-2 leading-relaxed font-bold tracking-wide">{faq.a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Contact Support */}
                  <div className="space-y-6">
                    <h5 className="text-[11px] font-black uppercase tracking-widest text-white/50 drop-shadow-sm pl-2">Contact Support</h5>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <a href="https://wa.me/message/YOUR_WHATSAPP_LINK_HERE" target="_blank" rel="noreferrer" className="p-6 rounded-[24px] bg-gradient-to-br from-[#25D366]/10 to-transparent border border-[#25D366]/20 flex flex-col items-center gap-4 hover:-translate-y-2 transition-all duration-500 group shadow-[0_5px_15px_rgba(37,211,102,0.1)] hover:shadow-[0_10px_30px_rgba(37,211,102,0.2)]">
                        <div className="w-14 h-14 bg-[#25D366]/10 border border-[#25D366]/30 rounded-[20px] flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-inner">
                          <MessageSquare className="w-6 h-6 text-[#25D366] drop-shadow-md" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-[#25D366] tracking-widest">WhatsApp Chat</span>
                      </a>
                      <a href="mailto:support@streamfind.com" className="p-6 rounded-[24px] bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 flex flex-col items-center gap-4 hover:-translate-y-2 transition-all duration-500 group shadow-[0_5px_15px_rgba(59,130,246,0.1)] hover:shadow-[0_10px_30px_rgba(59,130,246,0.2)]">
                        <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/30 rounded-[20px] flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-inner">
                          <Mail className="w-6 h-6 text-blue-400 drop-shadow-md" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Email Support</span>
                      </a>
                    </div>

                    <div className="p-8 rounded-[32px] bg-[#0a0a0a]/50 border border-white/10 backdrop-blur-xl shadow-inner space-y-6 relative overflow-hidden">
                      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand/10 blur-[40px] rounded-full pointer-events-none" />
                      <div className="space-y-2 relative z-10">
                        <label className="text-[10px] font-black text-white/50 uppercase tracking-widest pl-1">Inquiry Type</label>
                        <CustomSelect
                          value={supportMessage.startsWith('Type:') ? supportMessage.split(':')[1] : 'Submit Ticket'}
                          onChange={(val) => setSupportMessage(`Type:${val}`)}
                          options={[
                            { value: 'Submit Ticket', label: 'Submit Ticket' },
                            { value: 'Feedback', label: 'Feedback' },
                            { value: 'Report Wrong Availability', label: 'Report Wrong Availability' },
                            { value: 'Report Missing Show/Movie', label: 'Report Missing Show/Movie' },
                            { value: 'Suggest New Streaming Service', label: 'Suggest New Streaming Service' },
                            { value: 'Feature Requests', label: 'Feature Requests' }
                          ]}
                          className="bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-bold tracking-widest text-white shadow-inner focus-within:border-brand/50 transition-colors"
                        />
                      </div>
                      <div className="space-y-2 relative z-10">
                        <label className="text-[10px] font-black text-white/50 uppercase tracking-widest pl-1">Your Message</label>
                        <textarea
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-bold tracking-widest text-white placeholder-white/20 focus:outline-none focus:border-brand/50 h-32 resize-none shadow-inner transition-colors"
                          placeholder="Describe your issue or request..."
                        />
                      </div>
                      <button
                        onClick={async () => {
                          if (!supportMessage) return toast.error('Please enter a message');
                          setIsSubmittingSupport(true);
                          try {
                            const db = getFirestore(app);
                            const type = supportMessage.startsWith('Type:') ? supportMessage.split(':')[1].split('\n')[0] : 'Submit Ticket';
                            const msg = supportMessage.includes('\n') ? supportMessage.substring(supportMessage.indexOf('\n') + 1).trim() : supportMessage;
                            
                            await addDoc(collection(db, 'support_tickets'), {
                              userId: user?.uid || 'anonymous',
                              email: user?.email || '',
                              type: type,
                              message: msg || supportMessage,
                              status: 'open',
                              createdAt: new Date().toISOString()
                            });
                            
                            toast.success('Ticket submitted successfully!');
                            setSupportMessage('');
                          } catch (e) {
                            console.error('Failed to submit ticket', e);
                            toast.error('Failed to submit ticket. Please try again later.');
                          } finally {
                            setIsSubmittingSupport(false);
                          }
                        }}
                        disabled={isSubmittingSupport}
                        className="w-full py-4 bg-brand hover:bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all duration-300 disabled:opacity-50 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(240,171,252,0.4)] relative z-10"
                      >
                        {isSubmittingSupport ? 'Sending...' : 'Submit Request'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Full Width Legal Section */}
                <div className="space-y-6 pt-10 mt-10 border-t border-white/10 w-full">
                  <h5 className="text-[11px] font-black uppercase tracking-widest text-white/50 drop-shadow-sm pl-2">Legal & Policies</h5>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { title: 'Terms of Service', path: '/terms' },
                      { title: 'Privacy Policy', path: '/privacy' },
                      { title: 'Cookie Policy', path: '/cookie-policy' },
                      { title: 'DMCA Policy', path: '/dmca' },
                      { title: 'Data Disclaimer', path: '/data-disclaimer' }
                    ].map((doc, i) => (
                      <Link key={i} href={doc.path} className="p-6 bg-[#0a0a0a]/50 border border-white/10 rounded-[24px] text-[10px] font-black uppercase text-white/60 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all duration-300 text-left flex flex-col justify-between h-full gap-4 group hover:-translate-y-1 backdrop-blur-xl shadow-inner">
                        <div className="flex justify-between items-center w-full">
                          <span className="tracking-widest">{doc.title}</span>
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSettingTab === 'tracking' && (
              <div className="space-y-8 animate-fadeIn relative">
                <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/20 blur-[60px] rounded-full pointer-events-none" />
                  <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Watchlists & Tracking</h4>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Organize your movies, monitor watch history, and track releases.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: My Watchlists */}
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <h5 className="text-[11px] font-black uppercase tracking-widest text-white/50 drop-shadow-sm pl-2">My Watchlists</h5>
                      <div className="p-8 bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] space-y-4 backdrop-blur-xl shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-[40px] rounded-full pointer-events-none" />
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors relative z-10 group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <CheckCircle2 className="w-5 h-5 text-brand drop-shadow-md" />
                            </div>
                            <span className="text-xs font-black text-white uppercase tracking-wider">Watched Content</span>
                          </div>
                          <span className="text-[11px] font-black text-white/50 tracking-widest bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">{watchlist.length} titles</span>
                        </div>

                      </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-white/10">
                      <h5 className="text-[11px] font-black uppercase tracking-widest text-white/50 drop-shadow-sm pl-2">Custom Lists</h5>
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={newWatchlistName}
                            onChange={(e) => setNewWatchlistName(e.target.value)}
                            className="w-full bg-[#0a0a0a]/50 border border-white/10 rounded-2xl p-4 text-[11px] font-bold text-white placeholder-white/20 focus:outline-none focus:border-brand/50 shadow-inner tracking-widest transition-colors"
                            placeholder="e.g., Sci-Fi Classics"
                          />
                        </div>
                        <button
                          onClick={async () => {
                            if (!newWatchlistName.trim()) return toast.error('Please enter a list name');
                            try {
                              await createCustomWatchlist(newWatchlistName);
                              setNewWatchlistName('');
                              toast.success('Custom watchlist created!');
                            } catch (e) {
                              toast.error('Failed to create watchlist');
                            }
                          }}
                          className="px-6 py-4 bg-white/10 hover:bg-brand/20 hover:text-brand border border-white/10 hover:border-brand/30 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-inner h-[50px] flex items-center"
                        >
                          Add
                        </button>
                      </div>

                      <div className="space-y-3">
                        {customWatchlists.map(list => (
                          <div key={list.id} className="p-5 rounded-2xl bg-[#0a0a0a]/50 border border-white/10 flex items-center justify-between group backdrop-blur-md shadow-inner hover:bg-white/5 transition-colors">
                            <div>
                              <p className="text-xs font-black text-white uppercase tracking-wider">{list.name}</p>
                              <p className="text-[10px] text-white/50 font-bold tracking-widest mt-1">{list.count} items</p>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await deleteCustomWatchlist(list.id);
                                  toast.success('Watchlist deleted');
                                } catch (e) {
                                  toast.error('Failed to delete watchlist');
                                }
                              }}
                              className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all border border-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Release Calendar */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <h5 className="text-[11px] font-black uppercase tracking-widest text-white/50 drop-shadow-sm">Release Calendar</h5>
                      <span className="text-[9px] px-3 py-1.5 bg-brand/20 border border-brand/30 text-brand rounded-xl uppercase font-black tracking-widest shadow-[0_0_15px_rgba(240,171,252,0.2)] animate-pulse">Live</span>
                    </div>

                    <div className="p-8 bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] space-y-6 backdrop-blur-xl shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-40 h-40 bg-brand/10 blur-[50px] rounded-full pointer-events-none" />
                      <div className="flex items-center gap-4 pb-6 border-b border-white/10 relative z-10">
                        <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                          <Calendar className="w-7 h-7 text-white/60 drop-shadow-md" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white uppercase tracking-widest">Upcoming Releases</p>
                          <p className="text-[10px] font-bold tracking-widest text-white/50 mt-1">Click 🔔 to get notified when released.</p>
                        </div>
                      </div>

                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between px-1">
                          <h6 className="text-[10px] font-black uppercase tracking-widest text-brand drop-shadow-sm">In Theaters Soon</h6>
                          {trackedReleases.length > 0 && (
                            <span className="text-[10px] text-white/50 font-black tracking-widest bg-white/5 px-2 py-1 rounded-lg border border-white/10">{trackedReleases.length} tracked</span>
                          )}
                        </div>
                        <div className="space-y-3 max-h-[380px] overflow-y-auto overscroll-contain custom-scrollbar pr-2" data-lenis-prevent="true" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                          {isLoadingCalendar ? (
                            <div className="space-y-3">
                              {[1,2,3].map(i => (
                                <div key={i} className="h-16 rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                              ))}
                            </div>
                          ) : upcomingMovies.length === 0 ? (
                            <div className="py-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl border-dashed">
                              <p className="text-[11px] font-black tracking-widest text-white/30 uppercase">No upcoming movies found.</p>
                            </div>
                          ) : (
                            upcomingMovies.map((movie) => {
                              const isTracked = trackedReleases.includes(movie.id);
                              const releaseDate = movie.release_date
                                ? new Date(movie.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'TBA';
                              return (
                                <div key={movie.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all duration-300 group ${isTracked ? 'bg-brand/10 border-brand/30 shadow-[0_0_15px_rgba(240,171,252,0.1)]' : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5'}`}>
                                  <div className="flex items-center gap-4 min-w-0">
                                    {movie.poster_path && (
                                      <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0 shadow-md">
                                        <Image
                                          src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                                          alt={movie.title}
                                          fill
                                          className="object-cover"
                                          unoptimized
                                        />
                                      </div>
                                    )}
                                    <div className="min-w-0 pr-2">
                                      <p className="text-[11px] font-black text-white uppercase truncate tracking-wider">{movie.title}</p>
                                      <p className="text-[10px] font-bold tracking-widest text-white/50 mt-1">{releaseDate}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleToggleTrackedRelease(movie.id, movie.title)}
                                    className={`p-3 rounded-xl shrink-0 transition-all duration-300 ${isTracked ? 'text-brand bg-brand/20 border border-brand/30' : 'text-white/40 bg-white/5 border border-white/10 hover:text-brand hover:bg-brand/10 hover:border-brand/30'}`}
                                    title={isTracked ? 'Remove reminder' : 'Set reminder'}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      className="w-4 h-4 transition-all"
                                      stroke="currentColor"
                                      strokeWidth={2.5}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      fill={isTracked ? 'currentColor' : 'none'}
                                    >
                                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                        {trackedReleases.length > 0 && (
                          <div className="p-4 bg-brand/5 border border-brand/10 rounded-2xl text-center">
                            <p className="text-[10px] font-bold tracking-widest text-white/60">
                              ✅ Notifications enabled via <span className="text-brand font-black cursor-pointer hover:underline" onClick={() => setActiveSettingTab('notifications')}>Notifications tab</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeSettingTab === 'activity' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8 relative"
              >
                <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-[60px] rounded-full pointer-events-none" />
                  <h3 className="text-3xl font-display font-black text-white uppercase italic tracking-tight drop-shadow-md mb-2">Activity & Badges</h3>
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Track your journey and unlock milestones.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-8 shadow-inner backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-[40px] rounded-full pointer-events-none" />
                    <div className="flex items-center justify-between mb-8 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                          <History className="w-6 h-6 text-white/40 drop-shadow-md" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-sm">Timeline</h3>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => {
                            const idsToClear = [...watchlist.map(m => `watchlist-${m.id}`), ...userReviews.map(r => `review-${r.movieId}`)];
                            setClearedTimelineIds(idsToClear);
                            localStorage.setItem('streamfind_cleared_timeline_ids', JSON.stringify(idsToClear));
                            clearUserActivities();
                          }}
                          className="text-[10px] font-black tracking-widest text-white/40 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto overscroll-contain pr-4 custom-scrollbar relative z-10" data-lenis-prevent="true" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                      <div className="space-y-8 relative">
                        <div className="absolute left-2.5 top-0 bottom-4 w-px bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
                        {watchHistory.length === 0 ? (
                          <div className="py-12 text-center bg-white/[0.02] border border-white/5 rounded-2xl border-dashed">
                            <span className="text-white/30 text-[11px] uppercase font-black tracking-widest">Timeline empty. Save ratings/watchlist.</span>
                          </div>
                        ) : (
                          watchHistory.map((item) => (
                            <div key={item.id} className="relative pl-12 group">
                              <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-[#0a0a0a] border-2 border-white/10 flex items-center justify-center z-10 transition-all duration-300 group-hover:border-brand shadow-[0_0_10px_rgba(255,255,255,0.05)] group-hover:shadow-[0_0_15px_rgba(240,171,252,0.3)] group-hover:scale-110">
                                <div className="w-2 h-2 bg-white/30 rounded-full group-hover:bg-brand transition-colors duration-300" />
                              </div>
                              <p className="text-[11px] font-black text-brand uppercase tracking-widest drop-shadow-sm">{item.action}</p>
                              <p className="text-sm font-black text-white mt-1 group-hover:text-white/80 transition-colors">{item.title}</p>
                              <p className="text-[10px] text-white/40 mt-1.5 font-bold tracking-widest">{item.time}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => setShowActivityPopup(true)}
                        className="w-full mt-8 py-4 bg-white/5 hover:bg-brand/20 hover:text-brand rounded-2xl text-[11px] font-black uppercase tracking-widest text-white/40 border border-white/10 hover:border-brand/30 transition-all duration-300 shadow-inner relative z-10 hover:shadow-[0_0_20px_rgba(240,171,252,0.2)]"
                      >
                        Show Recent Activity
                      </button>
                    )}
                  </div>
                  <div className="p-8 bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] shadow-inner backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-500/10 blur-[40px] rounded-full pointer-events-none" />
                    <div className="flex items-center justify-between mb-8 relative z-10">
                      <h3 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-sm">Binge Badges</h3>
                      <span className="text-[11px] font-black text-white/50 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                        <span className="text-yellow-400">{badges.filter(b => b.unlocked).length}</span> / {badges.length}
                      </span>
                    </div>
                    <div className="max-h-[380px] overflow-y-auto overscroll-contain pr-2 custom-scrollbar relative z-10" data-lenis-prevent="true" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                      <div className="space-y-4">
                        {badges.map((badge) => (
                          <div key={badge.title} className={`p-5 rounded-[24px] border flex items-center justify-between group transition-all duration-300 ${badge.unlocked ? 'bg-white/5 border-white/10 shadow-[0_5px_15px_rgba(0,0,0,0.2)] hover:bg-white/10' : 'bg-black/20 border-dashed border-white/5 opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}>
                            <div className="flex items-center gap-5">
                              <div className={`p-4 rounded-2xl border border-white/10 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center w-14 h-14 shadow-inner relative overflow-hidden ${badge.color}`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
                                {badge.isCustomIcon ? (
                                  <Image width={24} height={24} src={badge.icon as string} alt={badge.title} className="w-6 h-6 object-contain relative z-10 drop-shadow-md" />
                                ) : (
                                  <badge.icon className="w-6 h-6 relative z-10 drop-shadow-md" />
                                )}
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-white uppercase tracking-wider">{badge.title}</p>
                                <p className="text-[10px] text-white/50 font-bold tracking-widest mt-1">{badge.desc}</p>
                              </div>
                            </div>
                            {badge.unlocked && <CheckCircle2 className="w-6 h-6 text-brand drop-shadow-[0_0_10px_rgba(240,171,252,0.5)]" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingTab === 'notes' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 relative"
              >
                <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/20 blur-[60px] rounded-full pointer-events-none" />
                  <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Director&apos;s Notes</h4>
                  <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Your detailed reviews and cinematic critiques.</p>
                </div>

                <div className="relative">
                  {userReviews.length === 0 ? (
                    <div className="py-20 bg-[#0a0a0a]/50 border border-dashed border-white/10 rounded-[40px] text-center flex flex-col items-center justify-center gap-6 backdrop-blur-xl shadow-inner relative overflow-hidden">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none" />
                      <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-center shadow-inner relative z-10">
                        <Film className="w-10 h-10 text-white/30 drop-shadow-md" />
                      </div>
                      <p className="text-[11px] uppercase font-black tracking-widest leading-relaxed text-white/50 relative z-10 max-w-sm">No custom written notes submitted yet.<br />Leave reviews on details pages to fill your diary!</p>
                    </div>
                  ) : (
                    <div className="relative group/carousel">
                      <div
                        ref={carouselRef}
                        className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-6 scroll-smooth cursor-grab active:cursor-grabbing select-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        {userReviews.map((review) => (
                          <div
                            key={review.movieId}
                            className="w-full sm:w-[500px] shrink-0 snap-start p-8 bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] hover:bg-white/5 transition-all duration-300 group flex flex-col gap-6 backdrop-blur-xl shadow-inner relative overflow-hidden"
                          >
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand/10 blur-[50px] rounded-full pointer-events-none transition-all duration-500 group-hover:bg-brand/20" />
                            
                            <div className="flex gap-6 relative z-10">
                              <div className="w-20 shrink-0 h-32 bg-white/5 rounded-2xl overflow-hidden shadow-[0_10px_20px_rgba(0,0,0,0.5)] border border-white/10 relative">
                                <Image
                                  src={review.moviePoster || 'https://placehold.co/200x300?text=No+Image'}
                                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                                  fill
                                  sizes="100px"
                                  alt={review.movieTitle}
                                />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="text-sm font-black uppercase text-white tracking-wider line-clamp-1 drop-shadow-sm">{review.movieTitle}</p>
                                    <div className="flex gap-1 mt-2 bg-black/40 w-fit px-3 py-1.5 rounded-full border border-white/5">
                                      {Array.from({ length: 5 }).map((_, s) => (
                                        <Star
                                          key={s}
                                          className={`w-3.5 h-3.5 ${s < review.rating ? 'text-brand fill-brand drop-shadow-[0_0_8px_rgba(240,171,252,0.8)]' : 'text-white/20'}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-white/60 text-[11px] leading-relaxed font-bold italic line-clamp-3">
                                  {review.reviewText ? `"${review.reviewText}"` : "Rated only, no written critique submitted."}
                                </p>
                              </div>
                            </div>

                            {additionalDetails[review.movieId] && (
                              <div className="space-y-4 border-t border-white/10 pt-6 relative z-10">
                                {additionalDetails[review.movieId].director && (
                                  <div className="p-4 rounded-[20px] bg-brand/5 border border-brand/20 shadow-inner">
                                    <p className="text-[10px] font-black uppercase text-brand tracking-widest mb-2 drop-shadow-sm">Director's Note</p>
                                    <p className="text-white/70 text-[11px] italic font-bold leading-relaxed">
                                      Directed by <span className="text-white font-black">{additionalDetails[review.movieId].director}</span>. Behind-the-scenes trivia: This masterpiece was meticulously crafted to deliver a raw, visual-first cinematic experience.
                                    </p>
                                  </div>
                                )}
                                {additionalDetails[review.movieId].topCriticReview && (
                                  <div className="p-4 rounded-[20px] bg-white/5 border border-white/10 shadow-inner">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-[10px] font-black uppercase text-white/50 tracking-widest">Top Critic Insight</p>
                                      <span className="text-[9px] font-black text-white/80 bg-white/10 px-2 py-1 rounded-lg uppercase tracking-widest truncate max-w-[120px]">By {additionalDetails[review.movieId].topCriticReview!.author}</span>
                                    </div>
                                    <p className="text-white/60 text-[11px] italic leading-relaxed line-clamp-2 font-medium">
                                      "{additionalDetails[review.movieId].topCriticReview!.content}"
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="mt-auto pt-6 border-t border-white/10 flex items-center gap-6 relative z-10">
                              {handleToggleLike && (
                                <button
                                  onClick={() => handleToggleLike(review.movieId, !!review.liked)}
                                  className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-brand transition-colors bg-white/5 hover:bg-brand/10 border border-white/10 hover:border-brand/30 px-4 py-2 rounded-xl"
                                >
                                  <Heart className={`w-4 h-4 transition-colors ${review.liked ? 'text-brand fill-brand drop-shadow-[0_0_8px_rgba(240,171,252,0.8)]' : 'text-white/40'}`} />
                                  <span className={review.liked ? 'text-brand' : ''}>
                                    {review.liked ? 'Liked' : 'Like'}
                                  </span>
                                </button>
                              )}
                              {handleShareNote && (
                                <button
                                  onClick={() => handleShareNote(review.movieId, review.movieTitle)}
                                  className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-4 py-2 rounded-xl"
                                >
                                  <Share2 className="w-4 h-4" /> Share Note
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {userReviews.length > 1 && (
                        <>
                          <button
                            onClick={() => scrollCarousel('left')}
                            className="absolute left-[-15px] top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-brand hover:text-white hover:border-brand/50 transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-20"
                          >
                            <ChevronLeft className="w-5 h-5 text-white" />
                          </button>
                          <button
                            onClick={() => scrollCarousel('right')}
                            className="absolute right-[-15px] top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-brand hover:text-white hover:border-brand/50 transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-20"
                          >
                            <ChevronRight className="w-5 h-5 text-white" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 text-[10px] text-white/30 font-semibold flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
            <span className="leading-relaxed">Aggregator preferences automatically sync across all logged devices.</span>
            <span className="text-brand flex items-center gap-1.5 bg-brand/10 px-3 py-1.5 rounded-full md:bg-transparent md:px-0 md:py-0 md:rounded-none border border-brand/20 md:border-transparent">
              <ShieldCheck className="w-3.5 h-3.5" /> Encrypted Sync
            </span>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showActivityPopup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-surface border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Recent Activity Log</h3>
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mt-1">Real-time user engagement timeline</p>
                </div>
                <button
                  onClick={() => setShowActivityPopup(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 max-h-[350px] overflow-y-auto overscroll-contain pr-2 custom-scrollbar" data-lenis-prevent="true" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                {recentActivities.length === 0 ? (
                  <div className="py-12 text-center">
                    <Activity className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <p className="text-xs text-white/40 uppercase font-black tracking-widest">No activities logged yet</p>
                    <p className="text-[10px] text-white/20 uppercase font-bold mt-1">Try searching, filtering, adding to watchlist, or rating movies!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((act: any) => {
                      const timeStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const dateStr = new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
                      return (
                        <div key={act.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-start justify-between gap-4 hover:border-brand/30 transition-colors">
                          <div className="flex gap-3 items-start">
                            <div className="p-2 bg-brand/10 text-brand rounded-xl mt-0.5">
                              <Activity className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-brand uppercase tracking-widest">{act.action}</span>
                              <p className="text-xs font-bold text-white/90 mt-1">{act.detail}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-tight">{timeStr}</p>
                            <p className="text-[8px] font-bold text-white/10 uppercase tracking-widest mt-0.5">{dateStr}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-white/5 bg-black/40 flex justify-between gap-4">
                <button
                  onClick={() => {
                    const idsToClear = [...watchlist.map(m => `watchlist-${m.id}`), ...userReviews.map(r => `review-${r.movieId}`)];
                    setClearedTimelineIds(idsToClear);
                    localStorage.setItem('streamfind_cleared_timeline_ids', JSON.stringify(idsToClear));
                    clearUserActivities();
                    setShowActivityPopup(false);
                    toast.success("Activity history cleared");
                  }}
                  className="px-4 py-2 border border-white/10 hover:border-red-500/30 hover:text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 transition-colors"
                >
                  Clear History
                </button>
                <button
                  onClick={() => setShowActivityPopup(false)}
                  className="px-6 py-2 bg-brand text-black hover:bg-brand/90 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLogoutAllModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
            >
              <div className="p-6 border-b border-white/5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-widest text-white">Logout All Devices?</h3>
                  <p className="text-xs text-white/50 mt-1">
                    You are about to terminate all active sessions on other devices.
                  </p>
                </div>
              </div>

              <div className="p-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${keepCurrentDevice ? 'bg-brand border-brand' : 'bg-transparent border-white/20 group-hover:border-white/40'}`}>
                    {keepCurrentDevice && <Check className="w-3.5 h-3.5 text-black" />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-white">Keep current device logged in</p>
                    <p className="text-[10px] text-white/40 mt-0.5">Untick this to be completely signed out everywhere.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={keepCurrentDevice}
                    onChange={(e) => setKeepCurrentDevice(e.target.checked)}
                  />
                </label>
              </div>

              <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-3">
                <button
                  onClick={() => setIsLogoutAllModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest text-white/50 hover:text-white hover:border-white/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!user?.uid) return;
                    setIsLogoutAllModalOpen(false);
                    const t = toast.loading('Terminating sessions...');
                    try {
                      const db = getFirestore(app);
                      const sessionsSnap = await getDocs(collection(db, 'users', user.uid, 'sessions'));
                      const batch = writeBatch(db);
                      
                      let revokedCount = 0;
                      sessionsSnap.docs.forEach(doc => {
                        const data = doc.data();
                        if (keepCurrentDevice && data.current) {
                          return;
                        }
                        batch.delete(doc.ref);
                        revokedCount++;
                      });
                      
                      if (revokedCount === 0) {
                        toast.dismiss(t);
                        toast.success('No other sessions to revoke.');
                        return;
                      }

                      await batch.commit();
                      
                      logSecurityEvent(user?.uid, 'Sessions Revoked', `${revokedCount} device session(s) were logged out.`, 'bg-red-500');
                      toast.dismiss(t);
                      
                      if (!keepCurrentDevice) {
                        toast.success('All sessions revoked. Signing you out…');
                        if (signOutTimerRef.current) clearTimeout(signOutTimerRef.current);
                        signOutTimerRef.current = setTimeout(() => onDirectSignOut?.(), 1500);
                      } else {
                        toast.success(`Revoked ${revokedCount} session(s).`);
                      }
                    } catch (error) {
                      toast.dismiss(t);
                      toast.error('Failed to revoke sessions.');
                      console.error(error);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-xs font-black uppercase tracking-widest transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
