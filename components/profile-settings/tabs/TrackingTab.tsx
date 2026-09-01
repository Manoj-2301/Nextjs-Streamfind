'use client';

/*
 * ============================================================
 * TrackingTab
 *
 * Watchlist overview, custom watchlist management (create/delete),
 * and a release calendar powered by TMDB upcoming movies with
 * per-movie tracking toggles.
 * ============================================================
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Calendar, Trash2 } from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import { useQuery } from '@tanstack/react-query';

interface TrackingTabProps {
  watchlist: any[];
  trackedReleases: number[];
  handleToggleTrackedRelease: (movieId: number, movieTitle: string) => Promise<void>;
  setActiveSettingTab: (tab: any) => void;
  customWatchlists: any[];
  createCustomWatchlist: (name: string) => Promise<void>;
  deleteCustomWatchlist: (id: string) => Promise<void>;
}

export default function TrackingTab({
  watchlist,
  trackedReleases,
  handleToggleTrackedRelease,
  setActiveSettingTab,
  customWatchlists,
  createCustomWatchlist,
  deleteCustomWatchlist,
}: TrackingTabProps) {
  const [newWatchlistName, setNewWatchlistName] = useState('');

  /*
   * ============================================================
   * LAZY TAB DATA: RELEASE CALENDAR
   * ============================================================
   * This query is executed ONLY when TrackingTab is mounted.
   * It prevents TMDB API network requests during initial profile load.
   * ============================================================
   */
  const { data: upcomingMovies = [], isLoading: isLoadingCalendar } = useQuery({
    queryKey: ['upcomingMovies'],
    queryFn: async () => {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      if (!apiKey) return [];
      const res = await fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=en-US&page=1`);
      if (!res.ok) return [];
      const data = await res.json();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return (data.results || [])
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
    },
    staleTime: 1000 * 60 * 60 * 4, // Cache for 4 hours
  });

  return (
    <div className="space-y-8 animate-fadeIn relative">
      <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/20 blur-[60px] rounded-full pointer-events-none" />
        <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Watchlists &amp; Tracking</h4>
        <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Organize your movies, monitor watch history, and track releases.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* My Watchlists */}
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

          {/* Custom Lists */}
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

        {/* Release Calendar */}
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
                  upcomingMovies.map((movie: any) => {
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
                                unoptimized={true}
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
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 transition-all" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill={isTracked ? 'currentColor' : 'none'}>
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
  );
}
