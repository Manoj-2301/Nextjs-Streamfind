/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { notify as toast } from '../../lib/notify';

/*
 * ============================================================
 * DYNAMIC TAB CODE SPLITTING
 * ============================================================
 * Tabs are lazy-loaded via next/dynamic. JavaScript for inactive
 * tabs is deferred and downloaded only when activated by the user.
 * ============================================================
 */
const TabLoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse p-4">
    <div className="h-24 bg-white/5 border border-white/10 rounded-[32px]" />
    <div className="h-64 bg-white/5 border border-white/10 rounded-[32px]" />
  </div>
);

const NotificationsTab = dynamic(() => import('./tabs/NotificationsTab'), { loading: TabLoadingSkeleton });
const PreferencesTab = dynamic(() => import('./tabs/PreferencesTab'), { loading: TabLoadingSkeleton });
const PrivacyTab = dynamic(() => import('./tabs/PrivacyTab'), { ssr: false, loading: TabLoadingSkeleton });
const BillingTab = dynamic(() => import('./tabs/BillingTab'), { loading: TabLoadingSkeleton });
const HelpTab = dynamic(() => import('./tabs/HelpTab'), { loading: TabLoadingSkeleton });
const TrackingTab = dynamic(() => import('./tabs/TrackingTab'), { loading: TabLoadingSkeleton });
const ActivityTab = dynamic(() => import('./tabs/ActivityTab'), { loading: TabLoadingSkeleton });
const NotesTab = dynamic(() => import('./tabs/NotesTab'), { loading: TabLoadingSkeleton });

import {
  ShieldCheck, AlertTriangle, Check, Menu
} from 'lucide-react';
import { app } from '@/lib/firebase';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';
import { logSecurityEvent } from '@/lib/auditLogger';
import { useProfileSettings } from '@/hooks/firebase/useProfileSettings';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProfileSettings } from '@/types';
import { useWatchlist } from '@/context/WatchlistContext';

/*
 * ============================================================
 * TYPES
 * ============================================================
 */
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

/*
 * ============================================================
 * COMPONENT (LIGHTWEIGHT COORDINATOR)
 * ============================================================
 */
function ProfileSettingsPanel({
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

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab) {
      setActiveSettingTab(tab as any);
    }
  }, [searchParams]);

  /*
   * ============================================================
   * LAZY HOOK EXECUTION
   * ============================================================
   * Firebase listeners for tracking, sessions, audit logs, and billing
   * run ONLY when their respective tab is currently active.
   * ============================================================
   */
  const {
    trackedReleases,
    handleToggleTrackedRelease: _handleToggleTrackedRelease,
    handleAddTopMovie: _handleAddTopMovie,
    handleRemoveTopMovie: _handleRemoveTopMovie,
    handleMoveTopMovie: _handleMoveTopMovie,
    handleToggleDnaMood: _handleToggleDnaMood,
    handleLocalToggle: _handleLocalToggle,
    handleLocalSelect: _handleLocalSelect,
    activeSessions,
    auditLogs,
    totalAuditLogs,
    billingPlan,
    invoices,
    renewalDate,
  } = useProfileSettings({
    fetchTracking: activeSettingTab === 'tracking',
    fetchSessions: activeSettingTab === 'privacy' || activeSettingTab === 'notifications',
    fetchAuditLogs: activeSettingTab === 'privacy' || activeSettingTab === 'notifications',
    fetchBilling: activeSettingTab === 'payment',
  });

  const [isLogoutAllModalOpen, setIsLogoutAllModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [keepCurrentDevice, setKeepCurrentDevice] = useState(true);
  
  const signOutTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (signOutTimerRef.current) clearTimeout(signOutTimerRef.current);
    };
  }, []);

  // Handlers delegated to hook
  const handleToggleTrackedRelease = async (movieId: number, movieTitle: string) => {
    await _handleToggleTrackedRelease(movieId, movieTitle, profile, handleTogglePref);
  };
  const handleLocalToggle = async (field: keyof ProfileSettings) => {
    await _handleLocalToggle(field, profile, setProfile);
  };
  const handleLocalSelect = async (field: keyof ProfileSettings, value: any) => {
    await _handleLocalSelect(field, value, setProfile);
  };
  const handleToggleDnaMood = async (mood: string) => {
    await _handleToggleDnaMood(mood, profile, setProfile);
  };

  return (
    <div className="mt-8 md:mt-12 bg-[#050505]/60 border border-white/10 rounded-[2rem] md:rounded-[40px] p-4 md:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative font-sans transform-gpu">
      {/* Background Glows (Static Subtle Opacity to eliminate continuous GPU compositing) */}
      <div className="absolute inset-0 rounded-[2rem] md:rounded-[40px] backdrop-blur-2xl pointer-events-none z-0 transform-gpu" />
      <div className="absolute inset-0 overflow-hidden rounded-[2rem] md:rounded-[40px] pointer-events-none z-0 mix-blend-screen opacity-30 transform-gpu">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/15 rounded-full -mr-48 -mt-48 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/15 rounded-full -ml-48 -mb-48 blur-[120px]" />
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

        {/* Mobile Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9998] lg:hidden"
              />
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-0 m-auto w-[90vw] max-w-md h-fit max-h-[85vh] overflow-y-auto no-scrollbar bg-[#0a0a0a]/90 border border-white/20 rounded-[32px] p-6 z-[9999] lg:hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl flex flex-col gap-3"
              >
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
                    <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-transparent pointer-events-none transition-opacity duration-300" />
                  )}
                  <div className="flex items-center gap-4 relative z-10">
                    <span className={`text-xl transition-transform duration-300 group-hover:scale-110 ${isActive ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'opacity-60'}`}>{t.icon}</span>
                    <span className={`text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors ${isActive ? 'text-white drop-shadow-md' : 'text-white/60 group-hover:text-white/90'}`}>{t.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold mt-1.5 ml-9 uppercase tracking-widest relative z-10 transition-colors ${isActive ? 'text-brand/80' : 'text-white/30 group-hover:text-white/50'}`}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Pane: Only Active Tab Component Mounts */}
        <div className="flex-grow lg:w-3/4 bg-[#0a0a0a]/60 border border-white/10 rounded-[2rem] md:rounded-[40px] p-5 md:p-10 min-h-[500px] flex flex-col justify-between shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-3xl relative overflow-hidden">
          <div className="space-y-6">
            {activeSettingTab === 'notifications' && (
              <NotificationsTab
                profile={profile}
                user={user}
                handleTogglePref={handleTogglePref}
                activeSessions={activeSessions}
                auditLogs={auditLogs}
                totalAuditLogs={totalAuditLogs}
              />
            )}
            {activeSettingTab === 'preferences' && (
              <PreferencesTab
                profile={profile}
                setActiveSettingTab={setActiveSettingTab}
                handleLocalToggle={handleLocalToggle}
                handleLocalSelect={handleLocalSelect}
                handleToggleDnaMood={handleToggleDnaMood}
                handleToggleSub={handleToggleSub}
                handleRegionChange={handleRegionChange}
              />
            )}
            {activeSettingTab === 'privacy' && (
              <PrivacyTab
                user={user}
                profile={profile}
                setProfile={setProfile}
                watchlist={watchlist}
                userReviews={userReviews}
                activeSessions={activeSessions}
                setIsLogoutAllModalOpen={setIsLogoutAllModalOpen}
                onSignOut={onSignOut}
                router={router}
              />
            )}
            {activeSettingTab === 'payment' && (
              <BillingTab
                user={user}
                billingPlan={billingPlan}
                renewalDate={renewalDate}
                invoices={invoices}
              />
            )}
            {activeSettingTab === 'help' && (
              <HelpTab user={user} />
            )}
            {activeSettingTab === 'tracking' && (
              <TrackingTab
                watchlist={watchlist}
                trackedReleases={trackedReleases}
                handleToggleTrackedRelease={handleToggleTrackedRelease}
                setActiveSettingTab={setActiveSettingTab}
                customWatchlists={customWatchlists}
                createCustomWatchlist={createCustomWatchlist}
                deleteCustomWatchlist={deleteCustomWatchlist}
              />
            )}
            {activeSettingTab === 'activity' && (
              <ActivityTab
                isOwner={isOwner}
                watchlist={watchlist}
                userReviews={userReviews}
                systemAchievements={systemAchievements}
              />
            )}
            {activeSettingTab === 'notes' && (
              <NotesTab
                userReviews={userReviews}
                handleToggleLike={handleToggleLike}
                handleShareNote={handleShareNote}
              />
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

export default React.memo(ProfileSettingsPanel, (prevProps, nextProps) => {
  return (
    prevProps.profile === nextProps.profile &&
    prevProps.user === nextProps.user &&
    prevProps.isOwner === nextProps.isOwner &&
    prevProps.watchlist === nextProps.watchlist &&
    prevProps.userReviews === nextProps.userReviews &&
    prevProps.systemAchievements === nextProps.systemAchievements &&
    prevProps.additionalDetails === nextProps.additionalDetails
  );
});
