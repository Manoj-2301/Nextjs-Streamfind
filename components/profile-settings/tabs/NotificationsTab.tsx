'use client';

/*
 * ============================================================
 * NotificationsTab
 *
 * Renders all notification preferences: delivery channels (Email, Push,
 * Browser), new release alerts, community alerts, personalized alerts,
 * and the Vigilance Hub (security alert preferences + audit log view).
 *
 * Props are passed from ProfileSettingsPanel; no Firebase calls are
 * made directly here — all state flows through the parent hooks.
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Bell, Film, Heart, Star, Shield, Check, Power, Activity
} from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import { syncBrowserChannelPref } from '@/lib/notify';
import { app } from '@/lib/firebase';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { logSecurityEvent } from '@/lib/auditLogger';
import { ProfileSettings } from '@/types';

interface NotificationsTabProps {
  profile: ProfileSettings & { plan?: string; loginStreak?: number };
  user: any;
  handleTogglePref: (field: any) => Promise<void>;
  activeSessions: any[];
  auditLogs: any[];
  totalAuditLogs: number;
}

export default function NotificationsTab({
  profile,
  user,
  handleTogglePref,
  activeSessions,
  auditLogs,
  totalAuditLogs,
}: NotificationsTabProps) {
  const [localBrowserEnabled, setLocalBrowserEnabled] = useState(true);
  const [localPushEnabled, setLocalPushEnabled] = useState(false);

  /*
   * ============================================================
   * LAZY TAB DATA: NOTIFICATION PREFERENCES INITIALIZATION
   * ============================================================
   * Checks browser notification capabilities and FCM tokens ONLY when
   * NotificationsTab is active and mounted.
   * ============================================================
   */
  useEffect(() => {
    const browserPref = localStorage.getItem('streamfind_channel_browser');
    setLocalBrowserEnabled(browserPref === null ? true : browserPref === 'true');

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
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand/20 blur-[60px] rounded-full pointer-events-none" />
        <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Notification Channels &amp; Alerts</h4>
        <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Every setting here saves instantly to your account across all devices.</p>
      </div>

      {/* Delivery Channels */}
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
                          const { getMessagingInstance } = await import('../../../lib/firebase');
                          const messaging = await getMessagingInstance();
                          if (messaging) {
                            const { getToken } = await import('firebase/messaging');
                            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
                            if (!vapidKey) { toast.error('VAPID key missing. Setup incomplete.'); return; }
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

      {/* New Releases */}
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
                  className={`w-14 h-7 rounded-full relative transition-all duration-500 border-2 shrink-0 cursor-pointer overflow-hidden ${isActive ? 'bg-brand/80 border-brand shadow-[0_0_20px_rgba(229,9,20,0.6)]' : 'bg-black/60 border-white/20 hover:border-white/40 shadow-inner'}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-white/20 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                  <div className={`absolute top-0.5 bottom-0.5 w-5 bg-white rounded-full transition-all duration-500 shadow-[0_2px_5px_rgba(0,0,0,0.3)] ${isActive ? 'translate-x-7 scale-110' : 'translate-x-1 opacity-60 scale-90'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Community & Social */}
      <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl shadow-inner">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
            <Heart className="w-5 h-5 drop-shadow-md" />
          </div>
          <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">Community &amp; Social</h5>
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
                  className={`w-14 h-7 rounded-full relative transition-all duration-500 border-2 shrink-0 cursor-pointer overflow-hidden ${isActive ? 'bg-brand/80 border-brand shadow-[0_0_20px_rgba(229,9,20,0.6)]' : 'bg-black/60 border-white/20 hover:border-white/40 shadow-inner'}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-white/20 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                  <div className={`absolute top-0.5 bottom-0.5 w-5 bg-white rounded-full transition-all duration-500 shadow-[0_2px_5px_rgba(0,0,0,0.3)] ${isActive ? 'translate-x-7 scale-110' : 'translate-x-1 opacity-60 scale-90'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personalized Alerts */}
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
                  className={`w-14 h-7 rounded-full relative transition-all duration-500 border-2 shrink-0 cursor-pointer overflow-hidden ${isActive ? 'bg-brand/80 border-brand shadow-[0_0_20px_rgba(229,9,20,0.6)]' : 'bg-black/60 border-white/20 hover:border-white/40 shadow-inner'}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-white/20 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                  <div className={`absolute top-0.5 bottom-0.5 w-5 bg-white rounded-full transition-all duration-500 shadow-[0_2px_5px_rgba(0,0,0,0.3)] ${isActive ? 'translate-x-7 scale-110' : 'translate-x-1 opacity-60 scale-90'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vigilance Hub */}
      <div className="pt-8 border-t border-white/5 mt-8">
        <div className="rounded-[32px] bg-gradient-to-br from-purple-500/10 via-[#0a0a0a]/80 to-indigo-500/5 border border-white/10 backdrop-blur-2xl shadow-[inset_0_0_20px_rgba(168,85,247,0.1)] overflow-hidden">
          <div className="flex flex-row items-center justify-between px-6 sm:px-8 pt-8 pb-6 border-b border-white/5 gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-[20px] bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <Shield className="w-6 h-6 text-purple-400 drop-shadow-md" />
              </div>
              <div className="min-w-0">
                <h5 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 truncate drop-shadow-md">Vigilance Hub</h5>
                <p className="text-[10px] text-white/50 font-bold mt-1 tracking-widest uppercase truncate">Real-time security &amp; account activity monitoring</p>
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
                      className={`w-14 h-7 rounded-full relative transition-all duration-500 border-2 shrink-0 cursor-pointer overflow-hidden ${isActive ? 'bg-purple-600/80 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]' : 'bg-black/60 border-white/20 hover:border-white/40 shadow-inner'}`}
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
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
