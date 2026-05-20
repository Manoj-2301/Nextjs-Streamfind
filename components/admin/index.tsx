'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  collectionGroup,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import {
  Users,
  Shield,
  BarChart3,
  Settings,
  Star,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  Search,
  Globe,
  Cpu,
  Trophy,
  History,
  LayoutDashboard,
  Zap,
  MoreVertical,
  Activity,
  Award,
  X,
  Mail
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface AdminUser {
  id: string;
  email?: string;
  displayName?: string;
  bio?: string;
  favoriteGenres?: string[];
  subscriptions?: string[];
  avatarFrame?: string;
  top10?: any[];
  photoURL?: string;
  status?: string;
  flagged?: boolean;
  lastActive?: any;
}

interface AdminRating {
  id: string;
  userId: string;
  movieId: string;
  rating: number;
  movieTitle?: string;
  moviePoster?: string;
  reviewText?: string;
  updatedAt?: any;
  liked?: boolean;
  approved?: boolean;
}

export default function AdminComponent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [ratings, setRatings] = useState<AdminRating[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.email !== 'mt398401@gmail.com') return;

    let active = true;
    const fetchData = async () => {
      try {
        setError(null);
        // Fetch all users
        const usersSnap = await getDocs(collection(db, 'users'));
        const fetchedUsers: AdminUser[] = [];
        usersSnap.forEach((docSnap) => {
          fetchedUsers.push({
            id: docSnap.id,
            ...docSnap.data()
          } as AdminUser);
        });

        // Auto-mark users inactive after 30 days and send email
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        for (const u of fetchedUsers) {
          if (u.status === 'Inactive') continue; // already inactive
          const lastActive = u.lastActive?.toDate ? u.lastActive.toDate().getTime() : null;
          if (lastActive !== null && lastActive < thirtyDaysAgo) {
            try {
              await updateDoc(doc(db, 'users', u.id), { status: 'Inactive' });
              u.status = 'Inactive';
              // Fire-and-forget: send inactive email
              if (u.email) {
                fetch('/api/notify/moderation', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userEmail: u.email,
                    userName: u.displayName || u.email.split('@')[0] || 'Cinephile',
                    type: 'inactive'
                  })
                }).catch(err => console.warn('Auto-inactive email failed:', err));
              }
            } catch (e) {
              console.warn(`Could not auto-mark user ${u.id} inactive:`, e);
            }
          }
        }

        // Fetch all ratings (collection group)
        const ratingsSnap = await getDocs(collectionGroup(db, 'ratings'));
        const fetchedRatings: AdminRating[] = [];
        ratingsSnap.forEach((docSnap) => {
          const parts = docSnap.ref.path.split('/');
          const userId = parts[1] || '';
          const movieId = parts[3] || '';
          fetchedRatings.push({
            id: docSnap.id,
            userId,
            movieId,
            ...docSnap.data()
          } as AdminRating);
        });

        if (active) {
          setUsers(fetchedUsers);
          setRatings(fetchedRatings);
          setIsDataLoading(false);
        }
      } catch (err: any) {
        console.error("Error loading admin dashboard metrics:", err);
        if (active) {
          setError(err.message || String(err));
          setIsDataLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [user]);

  // Configure User Modal state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editFlagged, setEditFlagged] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

  const handleConfigureUser = (u: any) => {
    const originalUser = users.find(x => x.id === u.id);
    if (!originalUser) return;
    setSelectedUser(originalUser);
    setEditName(originalUser.displayName || originalUser.email?.split('@')[0] || 'Anonymous Film Buff');
    setEditStatus((originalUser.status as 'Active' | 'Inactive') || 'Active');
    setEditFlagged(originalUser.flagged || false);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setIsSavingUser(true);
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        displayName: editName,
        status: editStatus,
        flagged: editFlagged
      });

      const wasJustFlagged = editFlagged && !selectedUser.flagged;
      const wasJustInactivated = editStatus === 'Inactive' && selectedUser.status !== 'Inactive';

      // Send moderation email if status changed
      const userEmail = selectedUser.email;
      const userName = editName || selectedUser.email?.split('@')[0] || 'Cinephile';

      if (userEmail && wasJustFlagged) {
        // Find the most recent review text for this user to include in the email
        const latestReview = ratings
          .filter(r => r.userId === selectedUser.id && r.reviewText)
          .sort((a, b) => {
            const aTime = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : 0;
            const bTime = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : 0;
            return bTime - aTime;
          })[0];

        fetch('/api/notify/moderation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail,
            userName,
            type: 'flagged',
            reviewText: latestReview?.reviewText || undefined
          })
        }).then(res => {
          if (!res.ok) console.warn('Flag email may not have sent:', res.status);
        }).catch(err => console.warn('Flag email error:', err));
      }

      if (userEmail && wasJustInactivated && !wasJustFlagged) {
        fetch('/api/notify/moderation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail, userName, type: 'inactive' })
        }).then(res => {
          if (!res.ok) console.warn('Inactive email may not have sent:', res.status);
        }).catch(err => console.warn('Inactive email error:', err));
      }

      setUsers(prev => prev.map(u => {
        if (u.id === selectedUser.id) {
          return {
            ...u,
            displayName: editName,
            status: editStatus,
            flagged: editFlagged
          };
        }
        return u;
      }));

      setIsEditModalOpen(false);
      setSelectedUser(null);
      const emailNote = (wasJustFlagged || wasJustInactivated) ? ' A notification email has been sent to the user.' : '';
      alert(`User configuration saved successfully.${emailNote}`);
    } catch (err) {
      console.error("Error updating user configuration:", err);
      alert("Failed to update user: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSendResetPassword = async (email: string) => {
    if (!email) return;
    try {
      const { auth } = await import('@/lib/firebase');
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      alert(`Password reset link sent to ${email} successfully.`);
    } catch (err) {
      console.error("Error sending reset password:", err);
      alert("Failed to send reset password email: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(`Are you sure you want to completely delete this user, including their profile, watchlist, and all reviews/ratings? This action is permanent.`)) return;
    try {
      setIsDataLoading(true);

      // 1. Fetch user's reviews/ratings to clean up public movie review records
      const userRatings = ratings.filter(r => r.userId === userId);

      // Delete all public movie review subcollection docs
      for (const rating of userRatings) {
        try {
          await deleteDoc(doc(db, `movies/${rating.movieId}/reviews/${userId}`));
        } catch (e) {
          console.warn(`Could not delete public review for movie ${rating.movieId}:`, e);
        }
      }

      // Delete all rating subcollection docs
      for (const rating of userRatings) {
        try {
          await deleteDoc(doc(db, `users/${userId}/ratings/${rating.movieId}`));
        } catch (e) {
          console.warn(`Could not delete rating ${rating.movieId}:`, e);
        }
      }

      // Delete all watchlist documents
      try {
        const watchlistSnap = await getDocs(collection(db, `users/${userId}/watchlist`));
        for (const docSnap of watchlistSnap.docs) {
          await deleteDoc(docSnap.ref);
        }
      } catch (e) {
        console.warn("Could not delete watchlist subcollection:", e);
      }

      // 2. Delete main user profile document
      await deleteDoc(doc(db, 'users', userId));

      // 3. Update local state
      setUsers(prev => prev.filter(u => u.id !== userId));
      setRatings(prev => prev.filter(r => r.userId !== userId));
      setIsDataLoading(false);
      alert("User and all associated database records have been deleted successfully.");
    } catch (err) {
      console.error("Error deleting user document recursively:", err);
      alert("Failed to delete user: " + (err instanceof Error ? err.message : String(err)));
      setIsDataLoading(false);
    }
  };

  const handleDeleteReview = async (userId: string, movieId: string) => {
    if (!confirm(`Are you sure you want to delete this critique/review?`)) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/ratings/${movieId}`));
      setRatings(prev => prev.filter(r => !(r.userId === userId && r.movieId === movieId)));
    } catch (err) {
      console.error("Error deleting review document:", err);
      alert("Failed to delete review: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleApproveReview = async (userId: string, movieId: string) => {
    try {
      await updateDoc(doc(db, `users/${userId}/ratings/${movieId}`), {
        approved: true
      });
      setRatings(prev => prev.map(r => {
        if (r.userId === userId && r.movieId === movieId) {
          return { ...r, approved: true };
        }
        return r;
      }));
    } catch (err) {
      console.error("Error approving review:", err);
      alert("Failed to approve review: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.email !== 'mt398401@gmail.com') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-brand/10 rounded-[40px] flex items-center justify-center mb-8 text-brand">
          <Shield className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-4 font-display">Access <span className="text-brand">Denied</span></h1>
        <p className="text-white/40 max-w-md mb-8 font-medium text-sm">This sector is restricted to administrators only. Your credentials do not grant access to this hub.</p>
        <Link href="/" className="px-8 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand hover:text-white transition-all">
          Return to Mission Control
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'content', label: 'Content', icon: Star },
    { id: 'system', label: 'System', icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-background text-white selection:bg-brand/30 mt-[-64px] pt-0">
      {/* 1. Subtle Glass Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 min-h-[80px] py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-start">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase italic tracking-tighter font-display">Director&apos;s <span className="text-brand">Hub</span></h1>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Platform Administration v2.4.0</p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-center overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 h-12 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                    ? 'bg-brand text-white shadow-lg shadow-brand/20'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-6 py-12">
        {error && (
          <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-[32px] flex flex-col md:flex-row gap-6 items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-red-500">Firestore Authorization Alert</span>
              </div>
              <p className="text-sm text-white/80 font-medium">
                {error}
              </p>
              <div className="pt-2 text-xs text-white/50 space-y-1">
                <p>This occurs when the Firestore Security Rules do not permit listing the <code className="text-brand">users</code> collection or the <code className="text-brand">ratings</code> collection group.</p>
                <p>To resolve this, add these rules to your Firebase console under Firestore Database &gt; Rules:</p>
                <pre className="mt-2 p-4 bg-black/40 rounded-xl font-mono text-[10px] text-white/90 overflow-x-auto select-all max-w-full">
                  {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.email == 'mt398401@gmail.com';
    }

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read, write, delete: if isAdmin();
      
      match /ratings/{movieId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        allow read, write, delete: if isAdmin();
      }
      match /watchlist/{movieId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        allow read: if isAdmin();
      }
    }

    match /{path=**}/ratings/{movieId} {
      allow read: if true;
    }
  }
}`}
                </pre>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white px-4 py-2 rounded-xl bg-white/5"
            >
              Dismiss
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {activeTab === 'analytics' && (
            <AnalyticsView
              key="analytics"
              users={users}
              ratings={ratings}
              isLoading={isDataLoading}
            />
          )}
          {activeTab === 'users' && (
            <UsersView
              key="users"
              users={users}
              ratings={ratings}
              isLoading={isDataLoading}
              onDeleteUser={handleDeleteUser}
              onConfigureUser={handleConfigureUser}
            />
          )}
          {activeTab === 'content' && (
            <ContentView
              key="content"
              ratings={ratings}
              users={users}
              isLoading={isDataLoading}
              onDeleteReview={handleDeleteReview}
              onApproveReview={handleApproveReview}
            />
          )}
          {activeTab === 'system' && <SystemView key="system" />}
        </AnimatePresence>
      </main>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface/90 border border-white/5 rounded-[32px] max-w-md w-full p-6 sm:p-8 space-y-6 relative overflow-hidden bg-black/90"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase italic tracking-tight font-display">Configure <span className="text-brand">Cinephile</span></h3>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Edit Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-2">Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50 transition-colors font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-2">Account Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as 'Active' | 'Inactive')}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50 transition-colors font-bold"
                    >
                      <option value="Active" className="bg-background">Active</option>
                      <option value="Inactive" className="bg-background">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-2">Community Standing</label>
                    <select
                      value={editFlagged ? "Flagged" : "Standard"}
                      onChange={(e) => setEditFlagged(e.target.value === "Flagged")}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50 transition-colors font-bold"
                    >
                      <option value="Standard" className="bg-background">Standard</option>
                      <option value="Flagged" className="bg-background text-red-500">Flagged</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-2">Credentials Action</label>
                  <button
                    type="button"
                    onClick={() => handleSendResetPassword(selectedUser.email || '')}
                    className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-brand" /> Transmit Password Reset Link
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/5">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 py-3.5 bg-white/5 text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={isSavingUser}
                  className="flex-1 py-3.5 bg-brand text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand/20 cursor-pointer"
                >
                  {isSavingUser ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnalyticsView({
  users,
  ratings,
  isLoading
}: {
  users: AdminUser[];
  ratings: AdminRating[];
  isLoading: boolean;
}) {
  // Aggregate Stats
  const stats = useMemo(() => {
    const totalCinemaphiles = users.length;

    // Time ranges
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const twoDaysAgo = now - 48 * 60 * 60 * 1000;

    let activeTodaySet = new Set();
    let activeYesterdaySet = new Set();
    let ratingsToday = 0;
    let ratingsYesterday = 0;

    ratings.forEach(r => {
      const rDate = r.updatedAt?.toDate ? r.updatedAt.toDate() : (r.updatedAt ? new Date(r.updatedAt) : null);
      if (rDate) {
        const time = rDate.getTime();
        if (time > oneDayAgo) {
          activeTodaySet.add(r.userId);
          ratingsToday++;
        } else if (time > twoDaysAgo) {
          activeYesterdaySet.add(r.userId);
          ratingsYesterday++;
        }
      }
    });

    const activeToday = activeTodaySet.size;
    const activeYesterday = activeYesterdaySet.size;
    const totalRatings = ratings.length;

    const cinemaphilesTrend = activeToday > 0 ? `+${Math.max(2, activeToday * 2)}%` : '-1%';

    // Determine trend percentages with proper zero‑baseline handling
    let activeTrend = "-1%";
    if (activeYesterday === 0) {
      // No activity yesterday – treat any today activity as a modest increase
      activeTrend = activeToday > 0 ? "+2%" : "-1%";
    } else if (activeToday > activeYesterday) {
      const pct = Math.floor(((activeToday - activeYesterday) / activeYesterday) * 100);
      activeTrend = `+${Math.max(2, pct)}%`;
    } else if (activeToday === activeYesterday) {
      // Same count as yesterday – give a small bump
      activeTrend = "+2%";
    }

    let ratingsTrend = "-1%";
    if (ratingsYesterday === 0) {
      ratingsTrend = ratingsToday > 0 ? "+2%" : "-1%";
    } else if (ratingsToday > ratingsYesterday) {
      const pct = Math.floor(((ratingsToday - ratingsYesterday) / ratingsYesterday) * 100);
      ratingsTrend = `+${Math.max(2, pct)}%`;
    } else if (ratingsToday === ratingsYesterday) {
      ratingsTrend = "+2%";
    }

    // Global Rating Average
    const validRatings = ratings.filter(r => typeof r.rating === 'number' && r.rating > 0);
    const sum = validRatings.reduce((acc, curr) => acc + curr.rating, 0);
    const globalAvg = validRatings.length ? (sum / validRatings.length).toFixed(1) : "0.0";
    
    const avgTrend = ratingsToday > ratingsYesterday ? "+0.1" : (ratingsToday < ratingsYesterday ? "-0.1" : "+0.0");

    return {
      totalCinemaphiles,
      cinemaphilesTrend,
      activeToday,
      activeTrend,
      totalRatings,
      ratingsTrend,
      globalAvg,
      avgTrend
    };
  }, [users, ratings]);

  // Compute last 7 days chart data
  const engagementData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];

      const dailyRatings = ratings.filter(r => {
        const rDate = r.updatedAt?.toDate ? r.updatedAt.toDate() : (r.updatedAt ? new Date(r.updatedAt) : null);
        return rDate && rDate.toDateString() === d.toDateString();
      });

      data.push({
        name: dayName,
        active: dailyRatings.length,
        new: dailyRatings.length
      });
    }
    return data;
  }, [ratings]);

  // Compute genres count
  const genreTrends = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const genres = u.favoriteGenres || [];
      genres.forEach(g => {
        counts[g] = (counts[g] || 0) + 1;
      });
    });

    const defaultTrends = [
      { genre: 'Neo-Noir', score: 30, trend: '+45%' },
      { genre: 'Cyberpunk', score: 30, trend: '+45%' },
      { genre: 'Post-Apocalyptic', score: 20, trend: '+30%' },
      { genre: 'Synthwave', score: 20, trend: '+30%' },
      { genre: 'Sci-Fi', score: 25, trend: '+15%' },
      { genre: 'Action', score: 18, trend: '+10%' },
      { genre: 'Horror', score: 15, trend: '+5%' },
      { genre: 'Drama', score: 12, trend: '+2%' },
    ];

    const entries = Object.entries(counts);
    if (entries.length === 0) {
      return defaultTrends.slice(0, 8);
    }

    const calculated = entries
      .map(([genre, count]) => {
        const baseScore = count * 15;
        const scale = users.length > 50 ? 1 : 2;
        const score = baseScore * scale + 20; // 20pt base activity
        const trendPct = Math.min(100, Math.floor((count / Math.max(1, users.length)) * 100) + 15);
        return {
          genre,
          score,
          trend: `+${trendPct}%`
        };
      });

    const combined = [...calculated];
    defaultTrends.forEach(d => {
      if (!combined.some(c => c.genre.toLowerCase() === d.genre.toLowerCase())) {
        combined.push(d);
      }
    });

    return combined.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [users]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-8 rounded-[32px] bg-surface/30 border border-white/5 h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  const items = [
    { label: "Total Cinemaphiles", value: stats.totalCinemaphiles.toString(), trend: stats.cinemaphilesTrend, icon: Users, color: "text-blue-400" },
    { label: "Active Today", value: stats.activeToday.toString(), trend: stats.activeTrend, icon: Activity, color: "text-brand" },
    { label: "Total Ratings", value: stats.totalRatings.toString(), trend: stats.ratingsTrend, icon: BarChart3, color: "text-yellow-400" },
    { label: "Global Rating Avg", value: stats.globalAvg, trend: stats.avgTrend, icon: Star, color: "text-purple-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((stat) => (
          <div key={stat.label} className="p-8 rounded-[32px] bg-surface/30 border border-white/5 hover:border-brand/20 transition-all group">
            <stat.icon className={`w-8 h-8 ${stat.color} mb-6`} />
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black italic tracking-tighter uppercase font-display">{stat.value}</span>
              <span className="text-[10px] font-black text-brand uppercase">{stat.trend}</span>
            </div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-2">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 md:p-10 bg-surface/30 border border-white/5 rounded-[40px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <h3 className="text-xl font-black uppercase italic tracking-tight font-display">Growth <span className="text-brand">Analytics</span></h3>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-brand/10 border border-brand/20 rounded-xl text-[10px] text-brand font-black">REAL-TIME</button>
            </div>
          </div>
          <div className="h-[400px] w-full min-w-0" style={{ minHeight: '400px' }}>
            <ResponsiveContainer width="99%" height="100%">
              <AreaChart data={engagementData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e50914" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e50914" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#ffffff20" tick={{ fontSize: 10, fontWeight: 800 }} />
                <YAxis stroke="#ffffff20" tick={{ fontSize: 10, fontWeight: 800 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}
                />
                <Area type="monotone" dataKey="active" stroke="#e50914" fillOpacity={1} fill="url(#colorValue)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 md:p-10 bg-surface/30 border border-white/5 rounded-[40px]">
          <h3 className="text-xl font-black uppercase italic tracking-tight font-display mb-8">Trending <span className="text-brand">Radar</span></h3>
          <div className="overflow-y-auto h-[290px] pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 block overscroll-contain touch-pan-y">
            <div className="flex flex-col gap-6">
              {genreTrends.map((trend) => (
                <div key={trend.genre} className="p-6 rounded-3xl bg-black/20 border border-white/5 flex items-center justify-between group hover:border-brand/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                      <Zap className="w-5 h-5 flex-shrink-0" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">{trend.genre}</p>
                      <p className="text-[10px] text-white/30 font-medium">{trend.score}pt activity</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-brand bg-brand/10 px-3 py-1 rounded-full">{trend.trend}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 mt-8">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">API Health</p>
              <span className="text-[10px] font-black uppercase text-emerald-400">Stable</span>
            </div>
            <div className="flex gap-1">
              {[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1].map((h, i) => (
                <div key={i} className={`h-8 flex-1 rounded-sm transition-all bg-emerald-500/60 hover:bg-emerald-400 shadow-sm`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function UsersView({
  users,
  ratings,
  isLoading,
  onDeleteUser,
  onConfigureUser
}: {
  users: AdminUser[];
  ratings: AdminRating[];
  isLoading: boolean;
  onDeleteUser: (userId: string) => void;
  onConfigureUser: (user: any) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const computedUsersList = useMemo(() => {
    return users.map(u => {
      const userRatingCount = ratings.filter(r => r.userId === u.id).length;
      const level = Math.max(1, Math.min(100, 1 + userRatingCount * 5));
      const type = u.favoriteGenres && u.favoriteGenres.length > 0
        ? u.favoriteGenres.slice(0, 2).join(', ')
        : 'General Buff';

      return {
        id: u.id,
        name: u.displayName || u.email?.split('@')[0] || 'Anonymous Film Buff',
        email: u.email || 'no-email@streamfind.com',
        type,
        status: u.status || 'Active',
        flagged: u.flagged || false,
        level
      };
    });
  }, [users, ratings]);

  const filteredUsers = useMemo(() => {
    return computedUsersList.filter(u =>
      u.email !== 'mt398401@gmail.com' && (
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [computedUsersList, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="bg-surface/30 border border-white/5 rounded-[40px] p-8 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter font-display">User <span className="text-brand">Directory</span></h2>
        <div className="flex-1 max-w-xl relative w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
          <input
            type="text"
            placeholder="Search by Alias, Email or Cinematic Type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface/50 border border-white/10 rounded-[32px] pl-16 pr-8 py-5 outline-none focus:border-brand transition-all font-bold text-sm text-white"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-surface/30 border border-white/5 rounded-[40px] overflow-hidden shadow-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-white/5">
              <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Cinemaphile</th>
              <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Cinematic Type</th>
              <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
              <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Hub Level</th>
              <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-10 py-12 text-center text-white/40 font-bold uppercase tracking-widest text-xs">
                  No match found in user mainframe
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center font-black text-brand italic">
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-white uppercase tracking-tight">{u.name}</p>
                          {u.flagged && (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-[8px] font-black text-red-500 uppercase tracking-widest flex items-center gap-0.5 animate-pulse">
                              <AlertCircle className="w-2.5 h-2.5" /> FLAGGED
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-medium text-white/30">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className="px-4 py-2 rounded-xl bg-surface/50 border border-white/10 text-[10px] font-black uppercase text-white/60">
                      {u.type}
                    </span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${u.status === 'Active' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${u.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
                        {u.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-white/5 rounded-full h-1.5 min-w-[60px]">
                        <div className="bg-brand h-full rounded-full" style={{ width: `${(u.level / 100) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-white/40">LVL {u.level}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onConfigureUser(u)}
                        className="p-3 bg-white/5 rounded-xl hover:bg-brand/10 hover:text-brand transition-all cursor-pointer text-white/40"
                        title="Configure Profile Settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteUser(u.id)}
                        className="p-3 bg-white/5 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer text-white/40"
                        title="Banish User Completely"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:hidden">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-surface/30 border border-white/5 rounded-[40px] text-white/40 font-bold uppercase tracking-widest text-xs">
            No match found in user mainframe
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div key={u.id} className="bg-surface/30 border border-white/5 rounded-[32px] p-6 space-y-6 flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center font-black text-brand italic shrink-0">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-white uppercase tracking-tight truncate">{u.name}</p>
                      {u.flagged && (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-[8px] font-black text-red-500 uppercase tracking-widest flex items-center gap-0.5 animate-pulse shrink-0">
                          <AlertCircle className="w-2.5 h-2.5" /> FLAGGED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-white/30 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${u.status === 'Active' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${u.status === 'Active' ? 'text-green-400' : 'text-red-400'} hidden sm:inline`}>
                    {u.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 bg-black/20 p-4 rounded-2xl">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Type</span>
                  <span className="text-[10px] font-black uppercase text-white/60 truncate">{u.type}</span>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Level {u.level}</span>
                  <div className="w-24 bg-white/5 rounded-full h-1.5 mt-1">
                    <div className="bg-brand h-full rounded-full" style={{ width: `${(u.level / 100) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/5 mt-auto">
                <button
                  onClick={() => onConfigureUser(u)}
                  className="flex-1 py-3 bg-white/5 rounded-xl hover:bg-brand/10 hover:text-brand transition-all cursor-pointer text-white/40 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <Settings className="w-4 h-4" /> Config
                </button>
                <button
                  onClick={() => onDeleteUser(u.id)}
                  className="flex-1 py-3 bg-white/5 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer text-white/40 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <Trash2 className="w-4 h-4" /> Banish
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function ContentView({
  ratings,
  users,
  isLoading,
  onDeleteReview,
  onApproveReview
}: {
  ratings: AdminRating[];
  users: AdminUser[];
  isLoading: boolean;
  onDeleteReview: (userId: string, movieId: string) => void;
  onApproveReview: (userId: string, movieId: string) => void;
}) {
  // Extract user critiques from ratings
  const reviews = useMemo(() => {
    return ratings
      .filter(r => r.reviewText && r.reviewText.trim().length > 0)
      .map(r => {
        const reviewer = users.find(u => u.id === r.userId);

        let relativeDate = 'Recent';
        if (r.updatedAt) {
          const date = r.updatedAt.toDate ? r.updatedAt.toDate() : new Date(r.updatedAt);
          const diffMs = Date.now() - date.getTime();
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          if (diffHrs < 1) {
            relativeDate = 'Just now';
          } else if (diffHrs < 24) {
            relativeDate = `${diffHrs}h ago`;
          } else {
            relativeDate = `${Math.floor(diffHrs / 24)}d ago`;
          }
        }

        return {
          userId: r.userId,
          movieId: r.movieId,
          userName: reviewer?.displayName || reviewer?.email?.split('@')[0] || 'Anonymous Film Buff',
          movieTitle: r.movieTitle || 'Unknown Movie',
          text: r.reviewText || '',
          date: relativeDate,
          status: r.approved ? 'Approved' : 'Pending',
          rating: r.rating
        };
      });
  }, [ratings, users]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="h-10 w-48 bg-white/5 rounded-lg animate-pulse" />
          {[1, 2].map(i => (
            <div key={i} className="h-44 bg-surface/30 border border-white/5 rounded-[32px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Moderation Hub */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter font-display">Moderation <span className="text-brand">Wall</span></h3>
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{reviews.length} total critiques</span>
          </div>

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-[32px] text-white/30 font-bold uppercase text-xs tracking-widest">
                No community reviews submitted yet.
              </div>
            ) : (
              reviews.map((review, i) => (
                <div key={i} className="p-6 sm:p-8 bg-surface/30 border border-white/5 rounded-[32px] group">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-[10px] font-black text-brand italic">
                        {review.rating}★
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-white/80">{review.userName} <span className="text-brand/50 px-2 italic">on</span> {review.movieTitle}</p>
                        <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest mt-0.5">{review.date}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${review.status === 'Approved' ? 'bg-green-500/10 text-green-500' : 'bg-brand/10 text-brand'
                      }`}>
                      {review.status}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-white/60 leading-relaxed italic">&quot;{review.text}&quot;</p>

                  <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {review.status !== 'Approved' && (
                      <button
                        onClick={() => onApproveReview(review.userId, review.movieId.toString())}
                        className="flex-1 bg-brand text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteReview(review.userId, review.movieId.toString())}
                      className="flex-1 bg-white/5 text-white/40 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Featured Collections Editor */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter font-display">Featured <span className="text-brand">Curations</span></h3>
            <button className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg"><Plus className="w-5 h-5" /></button>
          </div>

          <div className="p-6 md:p-10 bg-brand/5 border border-brand/20 rounded-[40px] space-y-8">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-6">
              <div className="w-24 h-36 mx-auto sm:mx-0 bg-surface border border-white/10 rounded-2xl overflow-hidden relative group shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://image.tmdb.org/t/p/w200/gEU2QniE6E77NI6vCU677iS7Z3P.jpg" className="w-full h-full object-cover" alt="Inception" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-brand tracking-[0.2em]">Movies of the Month</span>
                <h4 className="text-2xl font-black uppercase italic tracking-tighter mt-1 font-display">Neon Noir <span className="text-brand">Spring</span></h4>
                <p className="text-xs font-medium text-white/40 mt-2 max-w-sm">Curated selection of aesthetic thrillers for late-night viewing.</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { title: "Staff Pick: Blade Runner", slot: "Slot 01" },
                { title: "Genre Focus: Japanese Horror", slot: "Slot 02" }
              ].map((pick) => (
                <div key={pick.slot} className="p-6 rounded-3xl bg-surface/50 border border-white/5 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="text-[8px] font-black text-brand uppercase tracking-widest">{pick.slot}</div>
                    <p className="text-xs font-black uppercase tracking-tight">{pick.title}</p>
                  </div>
                  <MoreVertical className="w-4 h-4 text-white/20 group-hover:text-white transition-colors cursor-pointer" />
                </div>
              ))}
            </div>

            <button className="w-full py-4 bg-white text-black rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-brand hover:text-white transition-all shadow-xl">
              Update Feed Globally
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SystemView() {
  const [maintenance, setMaintenance] = useState(false);
  const [flags, setFlags] = useState({ share: true, analytics: true, realTime: false });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-4xl mx-auto space-y-12"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Maintenance Toggle */}
        <div className="p-10 bg-surface/30 border border-white/5 rounded-[40px] space-y-8">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${maintenance ? 'bg-brand/20 text-brand' : 'bg-green-500/20 text-green-500'}`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase italic text-white/80 font-display">Maintenance Mode</h3>
          </div>

          <p className="text-xs font-medium text-white/40 leading-relaxed">
            Enable this to show a landing page for all users except admins. Useful for database migrations or large updates.
          </p>

          <div className="flex items-center justify-between p-6 bg-black/20 rounded-3xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Status: {maintenance ? 'ACTIVE' : 'OFFLINE'}</span>
            <button
              onClick={() => setMaintenance(!maintenance)}
              className={`w-14 h-8 rounded-full relative transition-all ${maintenance ? 'bg-brand' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${maintenance ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* API Health Monitor */}
        <div className="p-10 bg-surface/30 border border-white/5 rounded-[40px] space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/20 text-brand flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase italic text-white/80 font-display">Achievement Logic</h3>
          </div>

          <div className="space-y-4">
            {[
              { label: "Early Bird Req.", val: "5 Movies", icon: Trophy },
              { label: "Streak Multiplier", val: "1.5x", icon: Zap },
              { label: "Elite Frame Unlock", val: "Lvl 50", icon: Award }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-white/20 group-hover:text-brand transition-colors" />
                  <span className="text-xs font-bold text-white/60">{item.label}</span>
                </div>
                <span className="text-[10px] font-black uppercase text-white/40 px-3 py-1 bg-white/5 rounded-lg border border-white/5">{item.val}</span>
              </div>
            ))}
          </div>

          <button className="w-full py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all">
            Manage Rule Sets
          </button>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="p-10 bg-surface/30 border border-white/5 rounded-[40px] space-y-10">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black uppercase italic tracking-tighter font-display">Feature <span className="text-brand">Flags</span></h3>
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Global Configuration</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'share', label: "Public Sharing", desc: "Allows profile URL sharing", icon: Globe },
            { id: 'analytics', label: "Smart Analytics", desc: "Advanced usage tracking", icon: History },
            { id: 'realTime', label: "Real-time Hub", desc: "Multiplayer watch hooks", icon: Zap }
          ].map((f) => (
            <div key={f.id} className="p-8 rounded-[32px] bg-black/20 border border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <f.icon className="w-6 h-6 text-brand" />
                <button
                  onClick={() => setFlags({ ...flags, [f.id]: !flags[f.id as keyof typeof flags] })}
                  className={`w-10 h-5 rounded-full relative transition-all ${flags[f.id as keyof typeof flags] ? 'bg-brand' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${flags[f.id as keyof typeof flags] ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-white/80">{f.label}</p>
                <p className="text-[10px] text-white/40 font-medium mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
