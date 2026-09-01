'use client';

/*
 * ============================================================
 * PrivacyTab
 *
 * Manages active sessions, data controls (download, clear search/watch
 * history, delete curation data), account management (reset password,
 * sign out, deactivate, delete), and session revocation.
 * ============================================================
 */

import React from 'react';
import {
  MonitorSmartphone, Database, UserCog, Lock, LogOut, AlertTriangle,
  UserX, Download, RefreshCw, Trash2, AlertCircle, Smartphone, Laptop
} from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import { logSecurityEvent } from '@/lib/auditLogger';
import { revokeSession } from '@/services/firebase/sessionService';
import {
  fetchUserAuditLogs,
  fetchUserSearchHistory,
  clearSearchHistory,
  clearWatchHistory,
  deleteCurationData,
} from '@/services/firebase/accountService';
import { ProfileSettings } from '@/types';

interface PrivacyTabProps {
  user: any;
  profile: ProfileSettings & { plan?: string; email?: string };
  setProfile: React.Dispatch<React.SetStateAction<any>>;
  watchlist: any[];
  userReviews: any[];
  activeSessions: any[];
  setIsLogoutAllModalOpen: (val: boolean) => void;
  onSignOut?: () => void;
  router: any;
}

export default function PrivacyTab({
  user,
  profile,
  setProfile,
  watchlist,
  userReviews,
  activeSessions,
  setIsLogoutAllModalOpen,
  onSignOut,
  router,
}: PrivacyTabProps) {
  const dataActions = [
    {
      label: 'Download My Data', isPremiumOnly: true, action: async () => {
        if (!user?.uid || !user?.email) { toast.error('No account found.'); return; }
        const loadingToast = toast.loading('Compiling your data archive…');
        try {
          const auditLogs = await fetchUserAuditLogs(user.uid);
          const searchHistory = await fetchUserSearchHistory(user.uid);
          const { generateUserDataPdf } = await import('@/lib/pdfGenerator');
          const pdfData = {
            user: { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL, emailVerified: user.emailVerified, creationTime: user.metadata?.creationTime, lastSignInTime: user.metadata?.lastSignInTime },
            profile, watchlist, userReviews, activeSessions, auditLogs, searchHistory,
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await user.getIdToken()}` },
            body: JSON.stringify({ uid: user.uid, email: user.email, displayName: user.displayName, pdfBase64: base64 }),
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
          Object.keys(localStorage).filter(k => k.toLowerCase().includes('search')).forEach(k => localStorage.removeItem(k));
          if (user?.uid) await clearSearchHistory(user.uid);
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
          await clearWatchHistory(user.uid);
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
          await deleteCurationData(user.uid);
          setProfile((prev: any) => ({ ...prev, dnaMoods: [], dnaRuntime: 'none', top10: undefined }));
          logSecurityEvent(user?.uid, 'Curation Data Deleted', 'DNA filters and top picks wiped from Firebase and local state.', 'bg-red-500');
          toast.dismiss(loadingToast);
          toast.success('Curation data deleted from all sources.');
        } catch {
          toast.dismiss(loadingToast);
          toast.error('Failed to delete curation data.');
        }
      }, icon: AlertCircle
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn relative">
      <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/20 blur-[60px] rounded-full pointer-events-none" />
        <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Privacy &amp; Security</h4>
        <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Review active connections, secure your account details, and manage local logs.</p>
      </div>

      {/* Active Sessions */}
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
            <div key={session.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-[20px] flex items-center justify-between hover:bg-white/5 hover:border-white/10 transition-all duration-300 group shadow-inner">
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
                        await revokeSession(user.uid, session.id);
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

      {/* Data Controls */}
      <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-[inset_0_0_30px_rgba(249,115,22,0.05)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="w-12 h-12 rounded-[20px] bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
            <Database className="w-6 h-6 drop-shadow-md" />
          </div>
          <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">Data Controls</h5>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
          {dataActions.map((item, idx) => {
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
                  isLocked ? 'text-white/30'
                    : item.label.includes('Delete') || item.label.includes('Clear') ? 'text-white/60 group-hover:text-red-400'
                    : 'text-white/60 group-hover:text-brand'
                }`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Account Management */}
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
  );
}
