import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { History, CheckCircle2, Award, Clock, Trophy, Zap, Activity, X } from 'lucide-react';
import { clearUserActivities, getUserActivities } from '@/lib/genreTracker';
import { notify as toast } from '@/lib/notify';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ActivityTabProps {
  isOwner: boolean;
  watchlist: any[];
  userReviews: any[];
  systemAchievements?: { id: string; label: string; val: string; icon: string }[];
}

const EMPTY_ACTIVITIES: any[] = [];

export default function ActivityTab({
  isOwner,
  watchlist,
  userReviews,
  systemAchievements = [],
}: ActivityTabProps) {
  const [clearedTimelineIds, setClearedTimelineIds] = useState<string[]>([]);
  const [showActivityPopup, setShowActivityPopup] = useState(false);

  useEffect(() => {
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

  const watchHistory = useMemo(() => {
    // Only map the first 20 elements to avoid O(N) full-array mapping
    const recentWatchlist = watchlist.slice(0, 20).map(m => ({
      id: `watchlist-${m.id}`,
      title: m.title,
      action: "Added to Watchlist",
      time: "Watchlist Item",
      type: "watch"
    }));

    const recentReviews = userReviews.slice(0, 20).map(r => ({
      id: `review-${r.movieId}`,
      title: r.movieTitle,
      action: `Rated ${r.rating}/5`,
      time: "Recent Critique",
      type: "rate"
    }));

    const events = [...recentWatchlist, ...recentReviews];
    return events.filter(e => !clearedTimelineIds.includes(e.id)).slice(0, 4);
  }, [watchlist, userReviews, clearedTimelineIds]);

  const ratingCount = userReviews.length;
  const watchCount = watchlist.length;
  const totalScore = ratingCount * 3 + watchCount;

  let level = 1;
  if (totalScore >= 30) level = 15;
  else if (totalScore >= 15) level = 10;
  else if (totalScore >= 5) level = 5;
  else if (totalScore >= 1) level = 2;

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

  const { data: recentActivities = EMPTY_ACTIVITIES } = useQuery({
    queryKey: ['recentActivities'],
    queryFn: async () => {
      if (typeof window !== 'undefined') {
        return getUserActivities();
      }
      return [];
    }
  });

  const recentActivitiesParentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: recentActivities.length,
    getScrollElement: () => recentActivitiesParentRef.current,
    estimateSize: () => 76,
    overscan: 5,
  });

  return (
    <>
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
                          <Image width={24} height={24} src={badge.icon as string} alt={badge.title} className="w-6 h-6 object-contain relative z-10 drop-shadow-md" unoptimized={true} />
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
              <div 
                ref={recentActivitiesParentRef}
                className="p-6 max-h-[350px] overflow-y-auto overscroll-contain pr-2 custom-scrollbar relative" 
                data-lenis-prevent="true" 
                onWheel={(e) => e.stopPropagation()} 
                onTouchMove={(e) => e.stopPropagation()}
              >
                {recentActivities.length === 0 ? (
                  <div className="py-12 text-center">
                    <Activity className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <p className="text-xs text-white/40 uppercase font-black tracking-widest">No activities logged yet</p>
                    <p className="text-[10px] text-white/20 uppercase font-bold mt-1">Try searching, filtering, adding to watchlist, or rating movies!</p>
                  </div>
                ) : (
                  <div 
                    className="relative w-full"
                    style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                      const act = recentActivities[virtualItem.index];
                      const timeStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const dateStr = new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
                      return (
                        <div 
                          key={act.id} 
                          className="absolute top-0 left-0 w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex items-start justify-between gap-4 hover:border-brand/30 transition-colors"
                          style={{
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
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
    </>
  );
}
