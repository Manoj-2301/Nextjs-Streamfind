/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Settings, Trash2, AlertCircle } from 'lucide-react';
import { AdminUser, AdminRating } from './types';


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function UsersView({
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

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
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


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
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
