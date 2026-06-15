import React from 'react';
import { Sparkles, MonitorPlay, Crown } from 'lucide-react';

// 4K Badge Component
export const Badge4K = () => {
  return (
    <div
      className="relative group inline-flex items-center justify-center px-2 py-0.5 rounded border border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-yellow-600/20 overflow-hidden shadow-[0_0_10px_rgba(234,179,8,0.15)]"
      title="4K Ultra HD Enabled"
    >
      {/* Subtle shine effect that sweeps across on hover */}
      <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-yellow-200/30 to-transparent skew-x-[-20deg]" />
      
      <span className="relative z-10 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 tracking-wider drop-shadow-sm">
        <MonitorPlay className="w-3 h-3 text-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.8)]" />
        4K
      </span>
    </div>
  );
};

// HDR Badge Component
export const BadgeHDR = () => {
  return (
    <div
      className="relative group inline-flex items-center justify-center px-2 py-0.5 rounded border border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-purple-600/20 overflow-hidden shadow-[0_0_10px_rgba(168,85,247,0.15)]"
      title="High Dynamic Range Enabled"
    >
      {/* Subtle shine effect */}
      <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-purple-200/30 to-transparent skew-x-[-20deg]" />
      
      <span className="relative z-10 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-transparent bg-clip-text bg-gradient-to-b from-purple-200 to-purple-500 tracking-wider drop-shadow-sm">
        <Sparkles className="w-3 h-3 text-purple-400 drop-shadow-[0_0_2px_rgba(192,132,252,0.8)]" />
        HDR
      </span>
    </div>
  );
};

// Ultra Member Badge
export const BadgeUltra = () => {
  return (
    <div
      className="relative group inline-flex items-center justify-center px-2.5 py-0.5 rounded border border-red-500/40 bg-gradient-to-br from-red-500/10 to-red-600/20 overflow-hidden shadow-[0_0_10px_rgba(239,68,68,0.15)]"
      title="Ultra Member"
    >
      <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-red-200/30 to-transparent skew-x-[-20deg]" />
      <span className="relative z-10 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-transparent bg-clip-text bg-gradient-to-b from-red-200 to-red-500 tracking-wider uppercase drop-shadow-sm">
        <Crown className="w-3.5 h-3.5 text-red-400 drop-shadow-[0_0_2px_rgba(248,113,113,0.8)]" />
        Ultra
      </span>
    </div>
  );
};

export const PremiumBadges = () => {
  return (
    <div className="flex items-center gap-2">
      <BadgeUltra />
      <Badge4K />
      <BadgeHDR />
    </div>
  );
};
