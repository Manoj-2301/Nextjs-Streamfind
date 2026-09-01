'use client';

/*
 * ============================================================
 * PreferencesTab
 *
 * Handles curation preferences: language/region selection,
 * content format, DNA Filter (moods, runtime), and streaming
 * platform subscriptions. Gated behind Premium plan.
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import { Globe, MonitorPlay, Fingerprint, Lock } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ProfileSettings } from '@/types';

const STREAMING_PLATFORMS = [
  { id: 'netflix', name: 'Netflix', logo: 'N', color: 'bg-red-600', glow: 'shadow-red-500/30' },
  { id: 'prime', name: 'Amazon Prime', logo: 'P', color: 'bg-blue-500', glow: 'shadow-blue-400/30' },
  { id: 'hotstar', name: 'Disney+ Hotstar', logo: 'H', color: 'bg-blue-700', glow: 'shadow-blue-600/30' },
  { id: 'jiocinema', name: 'JioCinema', logo: 'J', color: 'bg-pink-600', glow: 'shadow-pink-500/30' },
  { id: 'sonyliv', name: 'SonyLIV', logo: 'S', color: 'bg-yellow-500', glow: 'shadow-yellow-400/30' },
  { id: 'aha', name: 'Aha', logo: 'A', color: 'bg-orange-500', glow: 'shadow-orange-400/30' },
  { id: 'zee5', name: 'Zee5', logo: 'Z', color: 'bg-indigo-500', glow: 'shadow-indigo-400/30' },
  { id: 'apple', name: 'Apple TV+', logo: '🍎', color: 'bg-slate-700', glow: 'shadow-slate-500/30' },
  { id: 'hulu', name: 'Hulu', logo: 'H', color: 'bg-green-500', glow: 'shadow-green-400/30' },
  { id: 'max', name: 'Max', logo: 'M', color: 'bg-blue-800', glow: 'shadow-blue-700/30' },
];

interface PreferencesTabProps {
  profile: ProfileSettings & { plan?: string; subscriptions?: string[]; dnaMoods?: string[]; dnaRuntime?: string; autoFilter?: boolean; prefLanguage?: string; watchRegion?: string; prefContentType?: string };
  setActiveSettingTab: (tab: any) => void;
  handleLocalToggle: (field: keyof ProfileSettings) => Promise<void>;
  handleLocalSelect: (field: keyof ProfileSettings, value: any) => Promise<void>;
  handleToggleDnaMood: (mood: string) => Promise<void>;
  handleToggleSub: (platformName: string) => Promise<void>;
  handleRegionChange: (region: string) => Promise<void>;
}

export default function PreferencesTab({
  profile,
  setActiveSettingTab,
  handleLocalToggle,
  handleLocalSelect,
  handleToggleDnaMood,
  handleToggleSub,
  handleRegionChange,
}: PreferencesTabProps) {
  const [tmdbLanguages, setTmdbLanguages] = useState<{ value: string; label: string }[]>([]);
  const [tmdbRegions, setTmdbRegions] = useState<{ value: string; label: string }[]>([]);

  /*
   * ============================================================
   * LAZY TAB DATA: TMDB CONFIGURATION
   * ============================================================
   * TMDB languages and countries/regions are loaded ONLY when
   * the PreferencesTab component is mounted.
   * ============================================================
   */
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
  return (
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
        {/* Global Settings */}
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

        {/* Content Format */}
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
                  className={`flex-1 py-5 px-4 rounded-[24px] border text-xs font-black uppercase tracking-widest transition-all duration-300 hover:-translate-y-1 ${isActive ? 'bg-gradient-to-br from-brand/20 to-transparent border-brand/50 text-white shadow-[0_10px_20px_rgba(240,171,252,0.2)] scale-[1.02]' : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10 shadow-inner'}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* DNA Filter */}
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
                      className={`px-6 py-3 rounded-[20px] border text-[11px] font-black uppercase tracking-widest transition-all duration-300 hover:-translate-y-1 ${isActive ? 'bg-gradient-to-r from-brand/30 to-purple-500/30 border-brand/50 text-white shadow-[0_10px_20px_rgba(240,171,252,0.3)] scale-105' : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/30 shadow-inner'}`}
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
                      className={`flex-1 py-4 px-4 rounded-[20px] border text-[11px] font-black uppercase tracking-widest transition-all duration-300 hover:-translate-y-1 ${isActive ? 'bg-gradient-to-r from-brand/30 to-purple-500/30 border-brand/50 text-white shadow-[0_10px_20px_rgba(240,171,252,0.3)] scale-[1.02]' : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/30 shadow-inner'}`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Streaming Platforms */}
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
                      className={`relative group flex flex-col items-center gap-4 p-5 rounded-[24px] border transition-all duration-300 hover:-translate-y-1 ${isActive ? `bg-gradient-to-br from-white/10 to-white/5 border-white/30 shadow-[0_10px_30px_rgba(255,255,255,0.1)] ${platform.glow} scale-[1.02]` : 'bg-[#0a0a0a]/50 border-white/10 hover:border-white/30 hover:bg-white/5 shadow-inner'}`}
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
  );
}
