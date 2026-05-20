import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Cpu, Trophy, Zap, Award, Globe, History } from 'lucide-react';

export default function SystemView() {
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
