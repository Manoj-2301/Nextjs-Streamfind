'use client';
import { getFirestore } from 'firebase/firestore';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { toast, ToastBar } from 'react-hot-toast';
import { app } from '@/lib/firebase';
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
  Star,
  AlertCircle,
  Cpu,
  LayoutDashboard,
  X,
  Mail,
  MessageCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

import AnalyticsView from './AnalyticsView';
import UsersView from './UsersView';
import ContentView from './ContentView';
import SystemView from './SystemView';
import AffiliatesView from './AffiliatesView';
import ContactQueriesView, { ContactQuery } from './ContactQueriesView';
import { AdminUser, AdminRating, FeaturedCuration } from './types';

export default function AdminComponent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [ratings, setRatings] = useState<AdminRating[]>([]);
  const [queries, setQueries] = useState<ContactQuery[]>([]);
  const [curations, setCurations] = useState<FeaturedCuration[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!user || user.email !== 'mt398401@gmail.com') return;
    let active = true;

    const setupListeners = async () => {
      if (!isMounted) return;
      setIsDataLoading(true);
      setError(null);
      try {
        const { getFirestore, collection, collectionGroup, onSnapshot, doc, updateDoc } = await import('firebase/firestore');
        const { app } = await import('@/lib/firebase');
        const db = getFirestore(app);

        // Setup real-time listeners
        const unsubQueries = onSnapshot(collection(db, 'contact_queries'), (snap) => {
          if (!active) return;
          const items: ContactQuery[] = [];
          snap.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() } as ContactQuery));
          setQueries(items);
        }, (err) => {
          if (active) setError('Failed to fetch contact_queries: ' + err.message);
        });

        const unsubCurations = onSnapshot(collection(db, 'featured_curations'), (snap) => {
          if (!active) return;
          const items: FeaturedCuration[] = [];
          snap.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() } as FeaturedCuration));
          items.sort((a, b) => (a.slotNo || '').localeCompare(b.slotNo || ''));
          setCurations(items);
        }, (err) => {
          if (active) setError('Failed to fetch featured_curations: ' + err.message);
        });

        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
          if (!active) return;
          const items: AdminUser[] = [];
          snap.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() } as AdminUser));
          
          // Auto-mark inactive
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          items.forEach(u => {
            if (u.status === 'Inactive') return;
            const lastActive = u.lastActive?.toDate ? u.lastActive.toDate().getTime() : null;
            if (lastActive !== null && lastActive < thirtyDaysAgo) {
              updateDoc(doc(db, 'users', u.id), { status: 'Inactive' }).catch(e => console.warn(e));
              u.status = 'Inactive';
              if (u.email) {
                fetch('/api/notify/moderation', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userEmail: u.email,
                    userName: u.displayName || u.email.split('@')[0] || 'Cinephile',
                    type: 'inactive'
                  })
                }).catch(e => console.warn(e));
              }
            }
          });
          setUsers(items);
        }, (err) => {
          if (active) setError('Failed to fetch users: ' + err.message);
        });

        const unsubRatings = onSnapshot(collectionGroup(db, 'ratings'), (snap) => {
          if (!active) return;
          const items: AdminRating[] = [];
          snap.forEach(docSnap => {
            const parts = docSnap.ref.path.split('/');
            const userId = parts[1] || '';
            const movieId = parts[3] || '';
            items.push({ id: docSnap.id, userId, movieId, ...docSnap.data() } as AdminRating);
          });
          setRatings(items);
          setIsDataLoading(false);

          // Asynchronously fetch missing movie titles from TMDB API proxy
          const ratingsMissingTitles = items.filter(r => !r.movieTitle && r.movieId);
          if (ratingsMissingTitles.length > 0) {
            import('@/services/tmdbService').then(({ getMovieDetails }) => {
              Promise.all(
                ratingsMissingTitles.map(async (r) => {
                  try {
                    const movie = await getMovieDetails(Number(r.movieId));
                    if (movie && movie.title) {
                      return { userId: r.userId, movieId: r.movieId, title: movie.title };
                    }
                  } catch (e) {
                    console.warn(`Failed to resolve title for movie ID ${r.movieId}:`, e);
                  }
                  return null;
                })
              ).then((resolved) => {
                const titleMap = new Map<string, string>();
                resolved.forEach((item) => {
                  if (item) {
                    titleMap.set(`${item.userId}_${item.movieId}`, item.title);
                  }
                });
                if (titleMap.size > 0 && active) {
                  setRatings(prev => prev.map(r => {
                    const key = `${r.userId}_${r.movieId}`;
                    if (titleMap.has(key)) {
                      return { ...r, movieTitle: titleMap.get(key) };
                    }
                    return r;
                  }));
                }
              });
            }).catch(e => console.warn('Failed to dynamically import tmdbService in index.tsx:', e));
          }
        }, (err) => {
          if (active) {
            setError(err.message || String(err));
            setIsDataLoading(false);
          }
        });

        return () => {
          unsubQueries();
          unsubCurations();
          unsubUsers();
          unsubRatings();
        };

      } catch (err: any) {
        console.error("Error loading admin dashboard metrics:", err);
        if (active) {
          setError(err.message || String(err));
          setIsDataLoading(false);
        }
      }
    };

    let cleanupListeners: (() => void) | void;
    setupListeners().then(cleanup => {
      cleanupListeners = cleanup;
    });

    return () => {
      active = false;
      if (cleanupListeners) cleanupListeners();
    };
  }, [user, isMounted]);

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
      const userRef = doc(getFirestore(app), 'users', selectedUser.id);
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
      toast.success(`User configuration saved successfully.${emailNote}`);
    } catch (err) {
      console.error("Error updating user configuration:", err);
      toast.error("Failed to update user: " + (err instanceof Error ? err.message : String(err)));
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
      toast.success(`Password reset link sent to ${email} successfully.`);
    } catch (err) {
      console.error("Error sending reset password:", err);
      toast.error("Failed to send reset password email: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4 min-w-[280px]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h4 className="text-white font-bold text-base mb-1">Delete User</h4>
            <span className="text-sm font-medium text-white/60 leading-relaxed">Are you sure you want to completely delete this user? This action is permanent.</span>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white transition-all">Cancel</button>
          <button onClick={() => { toast.dismiss(t.id); executeDeleteUser(userId); }} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)] rounded-xl text-xs font-bold text-white transition-all">Yes, Delete</button>
        </div>
      </div>
    ), { duration: Infinity, style: { padding: '20px', borderRadius: '24px', background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.1)' } });
  };

  const executeDeleteUser = async (userId: string) => {
    try {
      setIsDataLoading(true);

      // 1. Fetch user's reviews/ratings to clean up public movie review records
      const userRatings = ratings.filter(r => r.userId === userId);

      // Delete all public movie review subcollection docs
      for (const rating of userRatings) {
        try {
          await deleteDoc(doc(getFirestore(app), `movies/${rating.movieId}/reviews/${userId}`));
        } catch (e) {
          console.warn(`Could not delete public review for movie ${rating.movieId}:`, e);
        }
      }

      // Delete all rating subcollection docs
      for (const rating of userRatings) {
        try {
          await deleteDoc(doc(getFirestore(app), `users/${userId}/ratings/${rating.movieId}`));
        } catch (e) {
          console.warn(`Could not delete rating ${rating.movieId}:`, e);
        }
      }

      // Delete all watchlist documents
      try {
        const watchlistSnap = await getDocs(collection(getFirestore(app), `users/${userId}/watchlist`));
        for (const docSnap of watchlistSnap.docs) {
          await deleteDoc(docSnap.ref);
        }
      } catch (e) {
        console.warn("Could not delete watchlist subcollection:", e);
      }

      // 2. Delete main user profile document
      await deleteDoc(doc(getFirestore(app), 'users', userId));

      // 3. Delete from Firebase Authentication via our secure API
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth(app);
        const res = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: userId, adminEmail: auth.currentUser?.email })
        });
        const data = await res.json();
        if (!res.ok) {
           console.error("Auth deletion failed:", data.error);
           toast.error("Data deleted, but failed to erase Auth record: " + data.error, { duration: 2000 });
        }
      } catch (e) {
        console.error("Failed to call delete-user API:", e);
      }

      // 4. Update local state
      setUsers(prev => prev.filter(u => u.id !== userId));
      setRatings(prev => prev.filter(r => r.userId !== userId));
      setIsDataLoading(false);
      toast.success("User and all associated database records have been deleted successfully.", { duration: 2000 });
    } catch (err) {
      console.error("Error deleting user document recursively:", err);
      toast.error("Failed to delete user: " + (err instanceof Error ? err.message : String(err)), { duration: 2000 });
      setIsDataLoading(false);
    }
  };

  const handleDeleteReview = async (userId: string, movieId: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4 min-w-[280px]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h4 className="text-white font-bold text-base mb-1">Delete Review</h4>
            <span className="text-sm font-medium text-white/60 leading-relaxed">Are you sure you want to delete this critique/review?</span>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white transition-all">Cancel</button>
          <button onClick={() => { toast.dismiss(t.id); executeDeleteReview(userId, movieId); }} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)] rounded-xl text-xs font-bold text-white transition-all">Yes, Delete</button>
        </div>
      </div>
    ), { duration: Infinity, style: { padding: '20px', borderRadius: '24px', background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.1)' } });
  };

  const executeDeleteReview = async (userId: string, movieId: string) => {
    try {
      await deleteDoc(doc(getFirestore(app), `users/${userId}/ratings/${movieId}`));

      // Clean up public movie review doc if possible (similar to handleDeleteUser logic)
      try {
        await deleteDoc(doc(getFirestore(app), `movies/${movieId}/reviews/${userId}`));
      } catch (e) {
        console.warn(`Could not delete public review for movie ${movieId}:`, e);
      }

      // Notify user about removal
      const user = users.find(u => u.id === userId);
      const rating = ratings.find(r => r.userId === userId && r.movieId === movieId);
      
      let resolvedMovieTitle = rating?.movieTitle;
      if (!resolvedMovieTitle && movieId) {
        try {
          const { getMovieDetails } = await import('@/services/tmdbService');
          const movie = await getMovieDetails(Number(movieId));
          if (movie && movie.title) {
            resolvedMovieTitle = movie.title;
          }
        } catch (e) {
          console.warn(`Failed to resolve movie title from TMDB in handleDeleteReview:`, e);
        }
      }

      if (user?.email) {
        fetch('/api/notify/moderation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: user.email,
            userName: user.displayName || user.email.split('@')[0] || 'Cinephile',
            type: 'removed',
            movieTitle: resolvedMovieTitle || 'Unknown Movie',
            reason: 'inappropriate content'
          })
        }).then(res => {
          if (!res.ok) console.warn('Removal email may not have sent:', res.status);
        }).catch(err => console.warn('Removal email failed:', err));
      }
      setRatings(prev => prev.filter(r => !(r.userId === userId && String(r.movieId) === String(movieId))));
      toast.success("Review deleted successfully.");
    } catch (err) {
      console.error('Error deleting review document:', err);
      toast.error('Failed to delete review: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleApproveReview = async (userId: string, movieId: string) => {
    try {
      await updateDoc(doc(getFirestore(app), `users/${userId}/ratings/${movieId}`), {
        approved: true
      });
      setRatings(prev => prev.map(r => {
        if (r.userId === userId && String(r.movieId) === String(movieId)) {
          return { ...r, approved: true };
        }
        return r;
      }));
      toast.success("Review approved successfully.");
    } catch (err) {
      console.error("Error approving review:", err);
      toast.error("Failed to approve review: " + (err instanceof Error ? err.message : String(err)));
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
    { id: 'contact', label: 'Queries', icon: Mail },
    { id: 'affiliates', label: 'Affiliates', icon: ExternalLink },
    { id: 'system', label: 'System', icon: Cpu },
  ];

  const handleDeleteQuery = async (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4 min-w-[280px]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h4 className="text-white font-bold text-base mb-1">Delete Query</h4>
            <span className="text-sm font-medium text-white/60 leading-relaxed">Are you sure you want to delete this query?</span>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white transition-all">Cancel</button>
          <button onClick={() => { toast.dismiss(t.id); executeDeleteQuery(id); }} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)] rounded-xl text-xs font-bold text-white transition-all">Yes, Delete</button>
        </div>
      </div>
    ), { duration: Infinity, style: { padding: '20px', borderRadius: '24px', background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.1)' } });
  };

  const executeDeleteQuery = async (id: string) => {
    try {
      await deleteDoc(doc(getFirestore(app), 'contact_queries', id));
      setQueries(prev => prev.filter(q => q.id !== id));
      toast.success('Query deleted successfully');
    } catch (error) {
      console.error('Error deleting query:', error);
      toast.error('Failed to delete query');
    }
  };

  const handleMarkQueryAsRead = async (id: string) => {
    try {
      await updateDoc(doc(getFirestore(app), 'contact_queries', id), {
        status: 'Read'
      });
      setQueries(prev => prev.map(q => q.id === id ? { ...q, status: 'Read' } : q));
    } catch (error) {
      console.error('Error updating query status:', error);
    }
  };

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

          <div className="flex gap-2 w-full md:w-auto justify-start md:justify-center overflow-x-auto pb-2 md:pb-0 scrollbar-none">
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
              curations={curations}
              isLoading={isDataLoading}
              onDeleteReview={handleDeleteReview}
              onApproveReview={handleApproveReview}
              onSetCurations={setCurations}
            />
          )}
          {activeTab === 'system' && <SystemView key="system" />}
          {activeTab === 'contact' && (
            <ContactQueriesView 
              key="contact"
              queries={queries}
              isLoading={isDataLoading}
              onDeleteQuery={handleDeleteQuery}
              onMarkAsRead={handleMarkQueryAsRead}
            />
          )}
          {activeTab === 'affiliates' && <AffiliatesView key="affiliates" />}
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
