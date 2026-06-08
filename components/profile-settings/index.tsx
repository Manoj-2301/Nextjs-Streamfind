'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import {
  Bell, Settings, Shield, CreditCard, HelpCircle, Film, Tv, Play, Plus,
  Trash2, Mail, Check, X, ShieldCheck, Download, RefreshCw, Eye, Lock,
  Info, Activity, Globe, Heart, ChevronDown, CheckCircle2, Layout, Calendar,
  ArrowRight, MessageSquare, AlertCircle, Laptop, Smartphone, AlertTriangle, LogOut,
  Search, ArrowUp, ArrowDown, History, Award, Clock, Trophy, Zap, Star, ChevronLeft, ChevronRight, Share2,
  UserX, MonitorPlay, Sliders, Unlock, LayoutList, ExternalLink, Power
} from 'lucide-react';
import { getUserActivities, clearUserActivities } from '@/lib/genreTracker';
import { searchMovies } from '@/services/tmdbService';
import { Movie } from '@/types';
import { app } from '@/lib/firebase';
import { getFirestore, doc, setDoc, collection, query, orderBy, limit, onSnapshot, getDocs, writeBatch, updateDoc, deleteField, deleteDoc, addDoc } from 'firebase/firestore';
import { logSecurityEvent, AuditEvent } from '@/lib/auditLogger';
import { CustomSelect } from '@/components/ui/CustomSelect';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { revalidatePage } from '@/app/actions/revalidate';
import { ProfileSettings } from '@/types';

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

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab) {
      setActiveSettingTab(tab as any);
    }
  }, [searchParams]);

  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isLogoutAllModalOpen, setIsLogoutAllModalOpen] = useState(false);
  const [keepCurrentDevice, setKeepCurrentDevice] = useState(true);
  const [clearedTimelineIds, setClearedTimelineIds] = useState<string[]>([]);
  const [showActivityPopup, setShowActivityPopup] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);

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
  const [customWatchlists, setCustomWatchlists] = useState<{ id: string; name: string; count: number }[]>([
    { id: '1', name: 'Sci-Fi Gems', count: 12 },
    { id: '2', name: 'Late Night Thrillers', count: 8 },
    { id: '3', name: 'Family Weekend Critiques', count: 15 }
  ]);
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
    <div className="mt-12 bg-surface/30 border border-white/5 rounded-[40px] p-6 md:p-12 shadow-2xl backdrop-blur-xl relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="lg:w-1/4 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto no-scrollbar lg:sticky lg:top-32 self-start pb-4 lg:pb-0">
          <div className="hidden lg:block mb-6">
            <h3 className="text-3xl font-display font-black uppercase italic tracking-tight text-glow">
              Control <span className="text-brand">Center</span>
            </h3>
            <p className="text-white/40 text-xs font-medium mt-1">Configure your personal preferences</p>
          </div>
          {[
            { id: 'notifications', icon: '🔔', name: 'Notifications', label: 'Updates & Alerts' },
            { id: 'preferences', icon: '⚙️', name: 'Preferences', label: 'DNA & Filters' },
            { id: 'privacy', icon: '🛡️', name: 'Privacy & Security', label: 'Sessions & Data' },
            { id: 'payment', icon: '💳', name: 'Payment Methods', label: 'Billing & Premium' },
            { id: 'help', icon: '❓', name: 'Help & Support', label: 'FAQ & Dispatches' },
            { id: 'tracking', icon: '🕵️', name: 'Watchlists & Tracking', label: 'Aggregator Insights' },
            { id: 'activity', icon: '🏆', name: 'Activity & Badges', label: 'Timeline & Achievements' },
            { id: 'notes', icon: '📝', name: 'Director\'s Notes', label: 'Reviews & Critiques' }
          ].map((t) => {
            const isActive = activeSettingTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveSettingTab(t.id as any)}
                className={`flex flex-col items-center lg:items-start shrink-0 px-5 lg:px-6 py-4 rounded-2xl border transition-all ${isActive
                  ? 'bg-brand/10 border-brand/35 text-brand shadow-lg shadow-brand/5'
                  : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:border-white/10'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl lg:text-sm">{t.icon}</span>
                  <span className="hidden lg:block text-xs font-black uppercase tracking-wider">{t.name}</span>
                </div>
                <span className="hidden lg:block text-[9px] text-white/30 font-medium mt-0.5">{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex-grow lg:w-3/4 bg-black/40 border border-white/5 rounded-[32px] p-6 md:p-8 min-h-[500px] flex flex-col justify-between">
          <div className="space-y-6">
            {activeSettingTab === 'notifications' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="border-b border-white/5 pb-4">
                  <h4 className="text-xl font-display font-black uppercase italic text-white tracking-tight">Notification Channels & Alerts</h4>
                  <p className="text-white/40 text-xs mt-1">Every setting here saves instantly to your account across all devices.</p>
                </div>
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Notification Channels</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { key: 'channelEmail' as const, title: 'Email', icon: '📧', desc: 'Alerts to your inbox.' },
                      { key: 'channelPush' as const, title: 'Push', icon: '📱', desc: 'Mobile device alerts.' },
                      { key: 'channelBrowser' as const, title: 'Browser', icon: '🖥️', desc: 'Desktop toast updates.' }
                    ].map((c) => {
                      const isActive = profile[c.key] ?? true;
                      return (
                        <button
                          key={c.key}
                          onClick={() => handleTogglePref(c.key)}
                          className={`p-5 rounded-2xl border cursor-pointer transition-all text-left relative overflow-hidden group ${isActive
                            ? 'bg-brand/8 border-brand/25 text-white shadow-md shadow-brand/5'
                            : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10 hover:bg-white/8'
                            }`}
                        >
                          {isActive && <div className="absolute top-0 right-0 w-16 h-16 bg-brand/10 rounded-full -mr-6 -mt-6 blur-xl" />}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base">{c.icon}</span>
                            <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${isActive ? 'bg-brand border-brand shadow-[0_0_6px_rgba(240,171,252,0.6)]' : 'bg-transparent border-white/20'}`} />
                          </div>
                          <p className="text-xs font-black uppercase">{c.title}</p>
                          <p className="text-[9px] text-white/30 mt-0.5 font-medium">{c.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">🎬 New Releases</h5>
                  {([
                    { key: 'notifyNewRelease', label: 'Watchlist Releases', desc: 'Alert when a title on your watchlist is officially released.' },
                    { key: 'notifyNewEpisodes', label: 'New Episode Alerts', desc: 'Notified the moment a new episode of a tracked series drops.' },
                    { key: 'notifyNewSeasons', label: 'New Season Announcements', desc: 'Reminders when new seasons are confirmed or added.' },
                  ] as { key: keyof ProfileSettings; label: string; desc: string }[]).map((item) => {
                    const isActive = (profile[item.key] as boolean | undefined) ?? true;
                    return (
                      <div key={item.key as string} className="flex gap-4 items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                        <div>
                          <p className="text-xs font-black text-white uppercase">{item.label}</p>
                          <p className="text-[10px] text-white/40 mt-1">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => handleTogglePref(item.key as any)}
                          className={`w-11 h-6 rounded-full relative transition-all duration-300 border shrink-0 cursor-pointer ${isActive
                            ? 'bg-brand border-brand shadow-[0_0_10px_rgba(240,171,252,0.4)]'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                        >
                          <div className={`absolute top-0 bottom-0 my-auto w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${isActive ? 'left-[23px]' : 'left-[3px]'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">📡 Platform Updates</h5>
                  {([
                    { key: 'notifyPlatformAdded', label: 'New Streaming Platforms', desc: 'Alerted when StreamFinds integrates a new provider.' },
                    { key: 'notifyNewFeatures', label: 'New Product Features', desc: 'Be first to know about aggregation upgrades, calendar views, and badges.' },
                  ] as { key: keyof ProfileSettings; label: string; desc: string }[]).map((item) => {
                    const isActive = (profile[item.key] as boolean | undefined) ?? true;
                    return (
                      <div key={item.key as string} className="flex gap-4 items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                        <div>
                          <p className="text-xs font-black text-white uppercase">{item.label}</p>
                          <p className="text-[10px] text-white/40 mt-1">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => handleTogglePref(item.key as any)}
                          className={`w-11 h-6 rounded-full relative transition-all duration-300 border shrink-0 cursor-pointer ${isActive
                            ? 'bg-brand border-brand shadow-[0_0_10px_rgba(240,171,252,0.4)]'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                        >
                          <div className={`absolute top-0 bottom-0 my-auto w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${isActive ? 'left-[23px]' : 'left-[3px]'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">✨ Personalized Alerts</h5>
                  {([
                    { key: 'notifyFavGenres', label: 'Trending in Favorite Genres', desc: 'Alerts matching critical genres from your DNA profile.' },
                    { key: 'notifyWatchHistoryRecs', label: 'History Recommendations', desc: 'Tailored picks based on your ratings and watch history.' },
                    { key: 'notifySimilarContent', label: 'Similar Content Alerts', desc: 'Movies sharing directors, actors, or themes you love.' },
                  ] as { key: keyof ProfileSettings; label: string; desc: string }[]).map((item) => {
                    const isActive = (profile[item.key] as boolean | undefined) ?? true;
                    return (
                      <div key={item.key as string} className="flex gap-4 items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                        <div>
                          <p className="text-xs font-black text-white uppercase">{item.label}</p>
                          <p className="text-[10px] text-white/40 mt-1">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => handleTogglePref(item.key as any)}
                          className={`w-11 h-6 rounded-full relative transition-all duration-300 border shrink-0 cursor-pointer ${isActive
                            ? 'bg-brand border-brand shadow-[0_0_10px_rgba(240,171,252,0.4)]'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                        >
                          <div className={`absolute top-0 bottom-0 my-auto w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${isActive ? 'left-[23px]' : 'left-[3px]'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-6 border-t border-white/5">
                  <div className="rounded-[28px] bg-gradient-to-br from-purple-950/30 via-black/40 to-indigo-950/20 border border-purple-500/15 overflow-hidden">
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black uppercase tracking-widest text-white">🛡 Vigilance Hub</h5>
                          <p className="text-[9px] text-white/30 font-medium mt-0.5">Real-time security &amp; account activity monitoring</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-green-400">All Clear</span>
                      </div>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { label: 'Active Sessions', value: activeSessions.length.toString(), icon: '💻', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/15' },
                          { label: 'Login Streak', value: `${profile?.loginStreak || 1}d`, icon: '🔑', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/15' },
                          { label: 'Alerts', value: auditLogs.length.toString(), icon: '⚠️', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/15' },
                          // { label: '2FA Status', value: 'Off', icon: '🔒', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/15' },
                        ].map((stat) => (
                          <div key={stat.label} className={`p-3 rounded-2xl border ${stat.bg} flex flex-col gap-1`}>
                            <span className="text-base">{stat.icon}</span>
                            <p className={`text-base font-black ${stat.color}`}>{stat.value}</p>
                            <p className="text-[8px] font-black uppercase text-white/30 tracking-widest leading-tight">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <h6 className="text-[9px] font-black uppercase tracking-widest text-white/30">Recent Account Events</h6>
                        {auditLogs.length > 0 ? auditLogs.map((ev, i) => (
                          <div key={ev.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors group">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${ev.dot}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase text-white/80 tracking-tight truncate">{ev.event}</p>
                              <p className="text-[9px] text-white/30 font-medium mt-0.5 truncate">{ev.detail}</p>
                            </div>
                            <span className="text-[8px] text-white/20 font-black uppercase tracking-widest shrink-0">
                              {ev.timestamp ? new Date(ev.timestamp?.toDate?.() || ev.timestamp).toLocaleDateString() : 'Just now'}
                            </span>
                          </div>
                        )) : (
                          <div className="p-4 text-center border border-white/5 rounded-xl bg-white/5">
                            <p className="text-[9px] text-white/40 uppercase tracking-widest font-black">No recent events</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 pt-2 border-t border-white/5">
                        <h6 className="text-[9px] font-black uppercase tracking-widest text-white/30">Security Alert Preferences</h6>
                        {([
                          { key: 'securityAlertNewDevice', label: 'Login from New Device', desc: 'Instant alert when account is accessed from an unrecognized device.' },
                          { key: 'securityAlertSuspicious', label: 'Suspicious Activity Alerts', desc: 'Notified of unusual login patterns or location changes.' },
                          { key: 'securityAlertProfileChange', label: 'Profile Change Confirmed', desc: 'Confirmation when display name, bio, or avatar is updated.' },
                          { key: 'securityAlertWeeklyDigest', label: 'Weekly Security Digest', desc: 'Summary of login activity and account changes every Sunday.' },
                        ] as { key: keyof ProfileSettings; label: string; desc: string }[]).map((t) => {
                          const isActive = profile[t.key] ?? true;
                          return (
                            <div key={t.key} className="flex gap-4 items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                              <div>
                                <p className="text-[10px] font-black text-white uppercase">{t.label}</p>
                                <p className="text-[9px] text-white/30 mt-0.5">{t.desc}</p>
                              </div>
                              <button
                                onClick={() => {
                                  handleTogglePref(t.key as any);
                                  logSecurityEvent(user?.uid, 'Security Preference Updated', `${t.label} was toggled`, 'bg-brand');
                                }}
                                className={`w-11 h-6 rounded-full relative transition-all duration-300 border shrink-0 cursor-pointer ${isActive
                                  ? 'bg-purple-500 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                                  : 'bg-white/5 border-white/10 hover:border-white/20'
                                  }`}
                              >
                                <div className={`absolute top-0 bottom-0 my-auto w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${isActive ? 'left-[23px]' : 'left-[3px]'}`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => toast.success('Sending login activity report to your email.')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all"
                        >
                          <Activity className="w-3 h-3" /> Email Activity Report
                        </button>
                        <button
                          onClick={async () => {
                            if (!user?.uid) return;
                            const t = toast.loading('Terminating all sessions…');
                            try {
                              const res = await fetch('/api/user/revoke-sessions', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ uid: user.uid }),
                              });
                              if (!res.ok) throw new Error();
                              logSecurityEvent(user?.uid, 'All Sessions Terminated', 'All refresh tokens revoked via Firebase Admin.', 'bg-red-500');
                              toast.dismiss(t);
                              toast.success('All sessions terminated. Signing you out…');
                              if (signOutTimerRef.current) clearTimeout(signOutTimerRef.current);
                              signOutTimerRef.current = setTimeout(() => onSignOut?.(), 1500);
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
                <div className="border-b border-white/5 pb-4">
                  <h4 className="text-xl font-display font-black uppercase italic text-white tracking-tight">Curation Preferences</h4>
                  <p className="text-white/40 text-xs mt-1">Configure language, region, content filters, and build your content DNA profile.</p>
                </div>

                {profile.plan !== 'premium' && (
                  <div className="absolute inset-0 z-50 rounded-2xl bg-black/60 backdrop-blur-sm flex items-center justify-center mt-20">
                    <div className="bg-black/80 border border-brand/30 p-8 rounded-3xl max-w-sm text-center shadow-[0_0_40px_rgba(240,171,252,0.15)] flex flex-col items-center transform transition-all hover:scale-105">
                      <div className="w-14 h-14 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-5 shadow-inner">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Upgrade to Premium</h3>
                      <p className="text-xs text-white/50 mb-8 leading-relaxed">Unlock full access to the DNA Filter, custom region and language settings, and personalized streaming catalogs.</p>
                      <button 
                        onClick={() => setActiveSettingTab('payment' as any)} 
                        className="w-full py-4 px-6 rounded-2xl bg-brand text-black text-xs font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(240,171,252,0.3)]"
                      >
                        Unlock Preferences
                      </button>
                    </div>
                  </div>
                )}

                <div className={profile.plan !== 'premium' ? 'opacity-30 pointer-events-none select-none blur-sm transition-all duration-500' : ''}>
                  <div className="flex gap-4 items-center justify-between py-4 border-b border-white/5">
                    <div>
                      <p className="text-xs font-black text-white uppercase">Auto Filter (DNA Match)</p>
                      <p className="text-[10px] text-white/40 mt-1">Automatically apply your DNA Filter settings. Turn off to view default catalog.</p>
                    </div>
                    <button
                      onClick={() => handleLocalToggle('autoFilter')}
                      className={`w-11 h-6 rounded-full relative transition-all duration-300 border shrink-0 cursor-pointer ${(profile.autoFilter ?? false)
                        ? 'bg-brand border-brand shadow-[0_0_10px_rgba(240,171,252,0.4)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                    >
                      <div className={`absolute top-0 bottom-0 my-auto w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${(profile.autoFilter ?? false) ? 'left-[23px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Prevalent Language</label>
                      <CustomSelect
                        value={profile.prefLanguage || 'en'}
                        onChange={(val) => handleLocalSelect('prefLanguage', val)}
                        options={tmdbLanguages.length > 0 ? tmdbLanguages : [{ value: 'en', label: 'English' }]}
                        className="bg-black/60 rounded-2xl p-4 text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Active Watch Region</label>
                      <CustomSelect
                        value={profile.watchRegion || 'IN'}
                        onChange={(val) => handleRegionChange(val)}
                        options={tmdbRegions.length > 0 ? tmdbRegions : [{ value: 'IN', label: 'India' }]}
                        className="bg-black/60 rounded-2xl p-4 text-xs font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-3 pt-6 border-t border-white/5 mt-6">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Content Format Preference</h5>
                    <div className="flex gap-3">
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
                            className={`flex-1 py-3 px-4 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${isActive ? 'bg-brand/10 border-brand/30 text-brand' : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/10'
                              }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-6 pt-6 border-t border-white/5 bg-white/[0.01] p-6 rounded-3xl border border-white/5 mt-6">
                    <div>
                      <h5 className="text-xs font-black uppercase text-brand tracking-widest mb-1">🧬 DNA Filter (Your Unique Feature)</h5>
                      <p className="text-[10px] text-white/40">Fine-tune your aggregator parameters. We build your personalized lists matching this template.</p>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase text-white/50 tracking-widest">Select Moods</p>
                      <div className="flex flex-wrap gap-2">
                        {['Feel Good', 'Dark', 'Emotional', 'Family', 'Inspirational'].map((mood) => {
                          const activeMoods = profile.dnaMoods || [];
                          const isActive = activeMoods.includes(mood);
                          return (
                            <button
                              key={mood}
                              onClick={() => handleToggleDnaMood(mood)}
                              className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${isActive ? 'bg-brand/20 border-brand text-brand' : 'bg-black/40 border-white/5 text-white/40 hover:text-white'
                                }`}
                            >
                              {mood}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase text-white/50 tracking-widest">Maximum Runtime</p>
                      <div className="flex gap-2">
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
                              className={`flex-1 py-2 px-3 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${isActive ? 'bg-brand/10 border-brand/35 text-brand' : 'bg-black/30 border-white/5 text-white/30 hover:text-white'
                                }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black uppercase text-white/50 tracking-widest">📡 My Streaming Platforms</p>
                        <span className="text-[8px] text-brand font-black uppercase tracking-widest bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-lg">
                          {profile.subscriptions?.length || 0} Active
                        </span>
                      </div>
                      <p className="text-[9px] text-white/30 font-medium -mt-1">Select platforms you subscribe to. We'll prioritize results from these services.</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {STREAMING_PLATFORMS.map((platform) => {
                          const isActive = profile.subscriptions?.includes(platform.name) || false;
                          return (
                            <button
                              key={platform.id}
                              onClick={() => handleToggleSub(platform.name)}
                              title={platform.name}
                              className={`relative group flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 ${isActive ? `bg-white/10 border-white/20 shadow-lg ${platform.glow}` : 'bg-black/30 border-white/5 hover:border-white/15 hover:bg-white/5'
                                }`}
                            >
                              <div className={`w-9 h-9 rounded-xl ${platform.color} flex items-center justify-center text-white font-black text-sm shadow-md transition-transform group-hover:scale-110 ${isActive ? 'ring-2 ring-white/30' : ''}`}>
                                {platform.logo}
                              </div>
                              <span className={`text-[8px] font-black uppercase tracking-wide leading-tight text-center line-clamp-2 ${isActive ? 'text-white' : 'text-white/40'}`}>{platform.name}</span>
                              {isActive && (
                                <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-brand rounded-full flex items-center justify-center">
                                  <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1 3.5L3 5.5L6 1.5" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
            )}
            {activeSettingTab === 'privacy' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="border-b border-white/5 pb-4">
                  <h4 className="text-xl font-display font-black uppercase italic text-white tracking-tight">Privacy & Security</h4>
                  <p className="text-white/40 text-xs mt-1">Review active connections, secure your account details, and manage local logs.</p>
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
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Active Sessions</h5>
                    <button
                      onClick={() => setIsLogoutAllModalOpen(true)}
                      className="text-[9px] font-black text-brand uppercase tracking-widest hover:underline"
                    >
                      Logout All Devices
                    </button>
                  </div>
                  <div className="space-y-3">
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:border-white/15 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-white/5 rounded-xl text-white/70">
                            {session.device.includes('iPhone') ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight text-white">{session.device}</p>
                            <p className="text-[9px] text-white/30 font-medium mt-0.5">{session.browser} • {session.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-tight">{session.lastActive}</span>
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
                              className="text-[9px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest"
                            >
                              Logout
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Data Controls</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {
                        label: 'Download My Data', isPremiumOnly: true, action: async () => {
                          if (!user?.uid || !user?.email) { toast.error('No account found.'); return; }
                          const loadingToast = toast.loading('Compiling your data archive…');
                          try {
                            // 1. Fetch audit logs from Firestore (not in component state)
                            const db = getFirestore(app);
                            const auditSnap = await getDocs(
                              collection(db, 'users', user.uid, 'audit_logs')
                            );
                            const auditLogs = auditSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                            // Also fetch search history
                            const searchSnap = await getDocs(
                              collection(db, 'users', user.uid, 'search_history')
                            );
                            const searchHistory = searchSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                            // 2. Generate PDF locally with ALL data
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

                            // 3. Trigger direct download
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `StreamFind_Data_${new Date().toISOString().split('T')[0]}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);

                            // 4. Send base64 PDF to backend for emailing
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
                            // 1. Clear all known localStorage search keys
                            const searchKeys = ['searchHistory', 'recentSearches', 'streamfind_search', 'search_history'];
                            searchKeys.forEach(k => localStorage.removeItem(k));
                            // Also scan for any dynamic search keys
                            Object.keys(localStorage)
                              .filter(k => k.toLowerCase().includes('search'))
                              .forEach(k => localStorage.removeItem(k));

                            // 2. Clear from Firestore user document (searchHistory field)
                            if (user?.uid) {
                              const db = getFirestore(app);
                              // Delete the searchHistory field from user doc
                              await updateDoc(doc(db, `users/${user.uid}`), {
                                searchHistory: deleteField(),
                                recentSearches: deleteField(),
                              });
                              // Also batch-delete search_history subcollection if it exists
                              try {
                                const shDocs = await getDocs(collection(db, `users/${user.uid}/search_history`));
                                if (!shDocs.empty) {
                                  const batch = writeBatch(db);
                                  shDocs.forEach(d => batch.delete(d.ref));
                                  await batch.commit();
                                }
                              } catch { /* subcollection may not exist, fine */ }
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
                            // Clear Firestore watchlist
                            const wlDocs = await getDocs(collection(db, `users/${user.uid}/watchlist`));
                            wlDocs.forEach(d => batch.delete(d.ref));
                            // Clear Firestore reviews
                            const rvDocs = await getDocs(collection(db, `users/${user.uid}/reviews`));
                            rvDocs.forEach(d => batch.delete(d.ref));
                            await batch.commit();
                            // Clear local state via props callback if available
                            // (parent component re-fetches from Firestore, which is now empty)
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
                            // Clear Firestore DNA fields
                            await updateDoc(doc(db, `users/${user.uid}`), {
                              dnaMoods: deleteField(),
                              dnaRuntime: deleteField(),

                              top10: deleteField(),
                            });
                            // Reset local profile state
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
                          className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all relative ${
                            isLocked 
                              ? 'bg-black/40 border border-white/5 text-white/30 cursor-not-allowed' 
                              : 'bg-white/5 border border-white/5 hover:border-white/20 text-white/80 hover:bg-white/10 cursor-pointer'
                          }`}
                        >
                          {isLocked ? (
                            <Lock className="w-4 h-4 text-brand/50" />
                          ) : (
                            <item.icon className="w-4 h-4 text-white/30" />
                          )}
                          <span className="text-[8px] font-black uppercase tracking-widest leading-relaxed">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3 border-t border-white/5 pt-6">
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Account Management</h5>
                    <p className="text-[9px] text-white/25 mt-1">Manage authentication, session, and account status.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={async () => {
                        try {
                          const { sendPasswordResetEmail } = await import('firebase/auth');
                          const { auth } = await import('@/lib/firebase');
                          const email = profile.email || '';
                          if (!email) { toast.error('No email found on your account.'); return; }
                          await sendPasswordResetEmail(auth, email);
                          toast.success(`Reset link sent to ${email}`);
                        } catch { toast.error('Failed to send reset email. Try again.'); }
                      }}
                      className="group flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/8 hover:border-brand/30 hover:bg-brand/5 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-brand/10 group-hover:border-brand/20 transition-all shrink-0">
                        <Lock className="w-4 h-4 text-white/40 group-hover:text-brand transition-colors" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-white group-hover:text-brand transition-colors">Reset Password</p>
                        <p className="text-[9px] text-white/30 mt-0.5">Send a reset link to your email</p>
                      </div>
                    </button>
                    <button
                      onClick={() => onSignOut?.()}
                      className="group flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/8 hover:border-red-500/30 hover:bg-red-500/5 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-red-500/10 group-hover:border-red-500/20 transition-all shrink-0">
                        <LogOut className="w-4 h-4 text-white/40 group-hover:text-red-400 transition-colors" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-white group-hover:text-red-400 transition-colors">Sign Out</p>
                        <p className="text-[9px] text-white/30 mt-0.5">End your current session</p>
                      </div>
                    </button>
                    <button
                      onClick={() => toast.error('Account deactivation requires email verification.')}
                      className="group flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/8 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-yellow-500/10 group-hover:border-yellow-500/20 transition-all shrink-0">
                        <AlertTriangle className="w-4 h-4 text-white/40 group-hover:text-yellow-400 transition-colors" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-white group-hover:text-yellow-400 transition-colors">Deactivate Account</p>
                        <p className="text-[9px] text-white/30 mt-0.5">Temporarily disable your profile</p>
                      </div>
                    </button>
                    <button
                      onClick={() => toast.error('Account deletion is permanent. Please contact support.')}
                      className="group flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/8 hover:border-red-500/30 hover:bg-red-500/5 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-red-500/10 group-hover:border-red-500/20 transition-all shrink-0">
                        <UserX className="w-4 h-4 text-white/40 group-hover:text-red-400 transition-colors" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-white group-hover:text-red-400 transition-colors">Delete Account</p>
                        <p className="text-[9px] text-white/30 mt-0.5">Permanently remove your data</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSettingTab === 'payment' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="border-b border-white/5 pb-4">
                  <h4 className="text-xl font-display font-black uppercase italic text-white tracking-tight">Payment Methods</h4>
                  <p className="text-white/40 text-xs mt-1">Manage your billing, saved methods, and premium subscriptions.</p>
                </div>

                {/* Payment Security Info */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Payment Security</h5>
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 flex-shrink-0">
                      <ShieldCheck className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">Payments secured by Razorpay</p>
                      <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                        Your card numbers, UPI IDs, and bank details are <span className="text-green-400 font-bold">never stored</span> on our servers or in your browser. 
                        All payment data is handled exclusively by Razorpay, which is PCI-DSS Level 1 compliant — the highest level of payment security certification.
                      </p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[8px] uppercase tracking-wider font-black text-white/30 px-2 py-1 rounded bg-white/5 border border-white/10">PCI-DSS</span>
                        <span className="text-[8px] uppercase tracking-wider font-black text-white/30 px-2 py-1 rounded bg-white/5 border border-white/10">256-BIT SSL</span>
                        <span className="text-[8px] uppercase tracking-wider font-black text-white/30 px-2 py-1 rounded bg-white/5 border border-white/10">RBI COMPLIANT</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Billing</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-brand/10 border border-brand/20">
                      <p className="text-[9px] text-brand uppercase tracking-widest font-black">Current Plan</p>
                      <p className="text-xl font-display font-black text-white mt-1 uppercase italic tracking-tight">
                        {billingPlan === 'premium' ? 'Premium' : 'Free Tier'}
                      </p>
                      {billingPlan === 'premium' ? (
                        <p className="text-[10px] text-white/50 mt-1">You have access to all premium features.</p>
                      ) : (
                        <p className="text-[10px] text-white/50 mt-1">Upgrade to Premium for full features.</p>
                      )}
                      
                      {billingPlan !== 'premium' && (
                        <button 
                          onClick={handleUpgrade}
                          disabled={isUpgrading}
                          className="mt-4 px-6 py-2 bg-brand text-black font-black uppercase tracking-widest text-[9px] rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                        >
                          {isUpgrading ? 'Loading...' : 'Upgrade Now'}
                        </button>
                      )}
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-white/40 uppercase font-black">Renewal Date</span>
                        <span className="text-xs text-white font-medium">{billingPlan === 'premium' ? renewalDate : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-white/40 uppercase font-black">Billing History</span>
                        <button className="text-[9px] text-brand hover:underline font-black uppercase">View All</button>
                      </div>
                      {invoices.length > 0 ? (
                        invoices.slice(0, 1).map((inv, idx) => (
                          <div key={idx} className="flex justify-between items-center pt-2 border-t border-white/5">
                            <span className="text-[10px] text-white/40 font-mono">#{inv.id?.substring(0, 8)}</span>
                            <span className="text-[9px] text-white/70">₹{inv.amount}</span>
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
                              className="text-[9px] bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded uppercase font-black"
                            >Download</button>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                          <span className="text-[10px] text-white/40 uppercase font-black">Invoices</span>
                          <span className="text-[9px] text-white/40 uppercase">No invoices yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Premium Features */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Premium Features</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { title: 'Ad-Free Experience', icon: MonitorPlay },
                      { title: 'Advanced Filters', icon: Sliders },
                      { title: 'Early Access', icon: Unlock },
                      { title: 'Multiple Watchlists', icon: LayoutList }
                    ].map((feat, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-black/20 border border-white/5 text-center flex flex-col items-center gap-2">
                        <feat.icon className="w-5 h-5 text-brand" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/60">{feat.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSettingTab === 'help' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="border-b border-white/5 pb-4">
                  <h4 className="text-xl font-display font-black uppercase italic text-white tracking-tight">Help & Support</h4>
                  <p className="text-white/40 text-xs mt-1">Get assistance, contact support, and view legal documents.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: FAQ & Legal */}
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Frequently Asked Questions</h5>
                      <div className="space-y-2">
                        {[
                          { q: 'What is StreamFinds?', a: 'A universal streaming aggregator that tracks what to watch and where.' },
                          { q: 'How does availability tracking work?', a: 'We sync daily with global databases to ensure accurate streaming platforms.' },
                          { q: 'Why can\'t I play content directly?', a: 'StreamFinds redirects you to the official platform where the content is hosted.' },
                          { q: 'How often is data updated?', a: 'Pricing, availability, and trending metrics are refreshed every 24 hours.' }
                        ].map((faq, i) => (
                          <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                            <p className="text-xs font-black text-white">{faq.q}</p>
                            <p className="text-[10px] text-white/60 mt-1 leading-relaxed">{faq.a}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Contact Support */}
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Contact Support</h5>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <a href="https://wa.me/message/YOUR_WHATSAPP_LINK_HERE" target="_blank" rel="noreferrer" className="p-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex flex-col items-center gap-2 hover:bg-[#25D366]/20 transition-all">
                        <MessageSquare className="w-5 h-5 text-[#25D366]" />
                        <span className="text-[9px] font-black uppercase text-[#25D366] tracking-widest">WhatsApp Chat</span>
                      </a>
                      <a href="mailto:support@streamfind.com" className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-2 hover:bg-white/10 transition-all">
                        <Mail className="w-5 h-5 text-white/60" />
                        <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">Email Support</span>
                      </a>
                    </div>

                    <div className="p-6 rounded-2xl bg-black/20 border border-white/5 space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Inquiry Type</label>
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
                          className="bg-white/5 rounded-xl p-3 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Your Message</label>
                        <textarea
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-brand h-24 resize-none"
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
                        className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors disabled:opacity-50"
                      >
                        {isSubmittingSupport ? 'Sending...' : 'Submit Request'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Full Width Legal Section */}
                <div className="space-y-4 pt-8 mt-8 border-t border-white/5 w-full">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Legal & Policies</h5>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { title: 'Terms of Service', path: '/terms' },
                      { title: 'Privacy Policy', path: '/privacy' },
                      { title: 'Cookie Policy', path: '/cookie-policy' },
                      { title: 'DMCA Policy', path: '/dmca' },
                      { title: 'Data Disclaimer', path: '/data-disclaimer' }
                    ].map((doc, i) => (
                      <Link key={i} href={doc.path} className="p-4 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase text-white/60 hover:text-white hover:bg-white/10 transition-all text-left flex flex-col justify-between h-full gap-2 group">
                        <div className="flex justify-between items-start w-full">
                          <span>{doc.title}</span>
                          <ExternalLink className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSettingTab === 'tracking' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="border-b border-white/5 pb-4">
                  <h4 className="text-xl font-display font-black uppercase italic text-white tracking-tight">Watchlists & Tracking</h4>
                  <p className="text-white/40 text-xs mt-1">Organize your movies, monitor watch history, and track releases.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: My Watchlists */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">My Watchlists</h5>
                      <div className="p-5 bg-black/20 border border-white/5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-brand" />
                            <span className="text-xs font-black text-white uppercase">Watched Content</span>
                          </div>
                          <span className="text-[10px] text-white/40">{watchlist.length} titles</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-yellow-400" />
                            <span className="text-xs font-black text-white uppercase">Continue Tracking</span>
                          </div>
                          <span className="text-[10px] text-white/40">Active</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Custom Lists</h5>
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={newWatchlistName}
                            onChange={(e) => setNewWatchlistName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-brand"
                            placeholder="e.g., Sci-Fi Classics"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (!newWatchlistName.trim()) return toast.error('Please enter a list name');
                            setCustomWatchlists(prev => [...prev, { id: Date.now().toString(), name: newWatchlistName, count: 0 }]);
                            setNewWatchlistName('');
                            toast.success('Custom watchlist created!');
                          }}
                          className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors"
                        >
                          Add
                        </button>
                      </div>

                      <div className="space-y-2">
                        {customWatchlists.map(list => (
                          <div key={list.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between group">
                            <div>
                              <p className="text-xs font-black text-white">{list.name}</p>
                              <p className="text-[9px] text-white/40 font-medium">{list.count} items</p>
                            </div>
                            <button
                              onClick={() => {
                                setCustomWatchlists(prev => prev.filter(l => l.id !== list.id));
                                toast.success('Watchlist deleted');
                              }}
                              className="p-2 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Release Calendar */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Release Calendar</h5>
                      <span className="text-[9px] px-2 py-1 bg-brand/10 text-brand rounded uppercase font-black tracking-widest">Beta</span>
                    </div>

                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-5">
                      <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                        <Calendar className="w-8 h-8 text-white/40" />
                        <div>
                          <p className="text-xs font-black text-white uppercase tracking-widest">Upcoming Releases</p>
                          <p className="text-[10px] text-white/40 mt-0.5">Track movies before they hit streaming.</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h6 className="text-[9px] font-black uppercase tracking-widest text-brand">Content Reminders</h6>
                        <div className="space-y-2">
                          {[
                            { name: 'Dune: Part Two', date: 'Available next week on Max' },
                            { name: 'Deadpool & Wolverine', date: 'In theaters next month' }
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                              <div>
                                <p className="text-[10px] font-black text-white uppercase">{item.name}</p>
                                <p className="text-[9px] text-white/40">{item.date}</p>
                              </div>
                              <Bell className="w-4 h-4 text-brand/70" />
                            </div>
                          ))}
                        </div>
                        <button className="w-full mt-2 py-2 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 rounded-xl transition-colors">
                          Browse Calendar
                        </button>
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
                className="space-y-8"
              >
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Activity & Badges</h3>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Track your journey and unlock milestones.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-black/20 border border-white/5 rounded-3xl p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <History className="w-5 h-5 text-white/30" />
                        <h3 className="text-xs font-black uppercase tracking-widest">Timeline</h3>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => {
                            const idsToClear = [...watchlist.map(m => `watchlist-${m.id}`), ...userReviews.map(r => `review-${r.movieId}`)];
                            setClearedTimelineIds(idsToClear);
                            localStorage.setItem('streamfind_cleared_timeline_ids', JSON.stringify(idsToClear));
                            clearUserActivities();
                          }}
                          className="text-[10px] font-black text-white/20 hover:text-white transition-colors"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto pr-4 custom-scrollbar" data-lenis-prevent>
                      <div className="space-y-8 relative">
                        <div className="absolute left-2.5 top-0 bottom-4 w-px bg-white/5" />
                        {watchHistory.length === 0 ? (
                          <div className="py-6 text-center text-white/25 text-[10px] uppercase font-bold tracking-wider">Timeline empty. Save ratings/watchlist.</div>
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
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => setShowActivityPopup(true)}
                        className="w-full mt-8 py-3 bg-white/5 hover:bg-brand/10 hover:text-brand rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/20 transition-all"
                      >
                        Show Recent Activity
                      </button>
                    )}
                  </div>
                  <div className="p-8 bg-black/20 border border-white/5 rounded-3xl shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs font-black uppercase tracking-widest">Binge Badges</h3>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{badges.filter(b => b.unlocked).length} / {badges.length} Unlocked</span>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto pr-4 custom-scrollbar" data-lenis-prevent>
                      <div className="space-y-4">
                        {badges.map((badge) => (
                          <div key={badge.title} className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${badge.unlocked ? 'bg-surface/50 border-white/10' : 'bg-black/20 border-dashed border-white/5 opacity-40 grayscale'}`}>
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl bg-surface border border-white/5 group-hover:scale-110 transition-transform flex items-center justify-center w-11 h-11 ${badge.color}`}>
                                {badge.isCustomIcon ? (
                                  <Image width={20} height={20} src={badge.icon as string} alt={badge.title} className="w-5 h-5 object-contain" />
                                ) : (
                                  <badge.icon className="w-5 h-5" />
                                )}
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
              </motion.div>
            )}

            {activeSettingTab === 'notes' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="border-b border-white/5 pb-4">
                  <h4 className="text-xl font-display font-black uppercase italic text-white tracking-tight">Director&apos;s Notes</h4>
                  <p className="text-white/40 text-xs mt-1">Your detailed reviews and cinematic critiques.</p>
                </div>

                <div className="relative">
                  {userReviews.length === 0 ? (
                    <div className="py-16 bg-surface/30 border border-dashed border-white/10 rounded-[40px] text-center text-white/30 flex flex-col items-center justify-center gap-4">
                      <Film className="w-12 h-12 text-white/10" />
                      <p className="text-sm uppercase font-black tracking-widest leading-relaxed">No custom written notes submitted yet.<br />Leave reviews on details pages to fill your diary!</p>
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
                            className="w-full sm:w-[450px] shrink-0 snap-start p-6 bg-surface/30 border border-white/5 rounded-[32px] hover:bg-surface/40 transition-colors group flex flex-col gap-6"
                          >
                            <div className="flex gap-4">
                              <div className="w-16 shrink-0 h-24 bg-white/5 rounded-xl overflow-hidden shadow-md relative">
                                <Image
                                  src={review.moviePoster || 'https://placehold.co/200x300?text=No+Image'}
                                  className="object-cover"
                                  fill
                                  sizes="100px"
                                  alt={review.movieTitle}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="text-sm font-black uppercase text-white/80 line-clamp-1">{review.movieTitle}</p>
                                    <div className="flex gap-1 mt-1">
                                      {Array.from({ length: 5 }).map((_, s) => (
                                        <Star
                                          key={s}
                                          className={`w-3 h-3 ${s < review.rating ? 'text-brand fill-brand' : 'text-white/10'}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-white/60 text-xs leading-relaxed font-medium italic line-clamp-3">
                                  {review.reviewText ? `"${review.reviewText}"` : "Rated only, no written critique submitted."}
                                </p>
                              </div>
                            </div>

                            {additionalDetails[review.movieId] && (
                              <div className="space-y-3 border-t border-white/5 pt-4">
                                {additionalDetails[review.movieId].director && (
                                  <div className="p-3 rounded-2xl bg-brand/5 border border-brand/20">
                                    <p className="text-[9px] font-black uppercase text-brand tracking-widest mb-1">Director's Note</p>
                                    <p className="text-white/80 text-[10px] italic font-medium">
                                      Directed by <span className="text-white font-bold">{additionalDetails[review.movieId].director}</span>. Behind-the-scenes trivia: This masterpiece was meticulously crafted to deliver a raw, visual-first cinematic experience.
                                    </p>
                                  </div>
                                )}
                                {additionalDetails[review.movieId].topCriticReview && (
                                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Top Critic Insight</p>
                                      <span className="text-[8px] font-black text-brand uppercase tracking-widest truncate max-w-[100px]">By {additionalDetails[review.movieId].topCriticReview!.author}</span>
                                    </div>
                                    <p className="text-white/60 text-[10px] italic leading-relaxed line-clamp-2">
                                      "{additionalDetails[review.movieId].topCriticReview!.content}"
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-6">
                              {handleToggleLike && (
                                <button
                                  onClick={() => handleToggleLike(review.movieId, !!review.liked)}
                                  className="flex items-center gap-1.5 text-[10px] font-black uppercase text-white/20 hover:text-white transition-colors"
                                >
                                  <Heart className={`w-3.5 h-3.5 transition-colors ${review.liked ? 'text-brand fill-brand' : 'text-white/20'}`} />
                                  <span className={review.liked ? 'text-brand' : 'text-white/40'}>
                                    {review.liked ? 'Liked' : 'Like'}
                                  </span>
                                </button>
                              )}
                              {handleShareNote && (
                                <button
                                  onClick={() => handleShareNote(review.movieId, review.movieTitle)}
                                  className="flex items-center gap-1.5 text-[10px] font-black uppercase text-white/20 hover:text-white transition-colors"
                                >
                                  <Share2 className="w-3.5 h-3.5" /> Share Note
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
                            className="absolute left-[-10px] top-1/2 -translate-y-1/2 p-2.5 rounded-full glass hover:bg-brand hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100 shadow-xl z-10"
                          >
                            <ChevronLeft className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={() => scrollCarousel('right')}
                            className="absolute right-[-10px] top-1/2 -translate-y-1/2 p-2.5 rounded-full glass hover:bg-brand hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100 shadow-xl z-10"
                          >
                            <ChevronRight className="w-4 h-4 text-white" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 text-[10px] text-white/30 font-semibold flex justify-between items-center">
            <span>Aggregator preferences automatically sync across all logged devices.</span>
            <span className="text-brand flex items-center gap-1">
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
              <div className="p-6 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar" data-lenis-prevent>
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
                        signOutTimerRef.current = setTimeout(() => onSignOut?.(), 1500);
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
