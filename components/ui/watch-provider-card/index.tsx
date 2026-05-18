'use client';

import { motion } from 'motion/react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Platform } from '@/types';
import React from 'react';

interface WatchProviderCardProps {
  platform: Platform;
  key?: React.Key;
}

export default function WatchProviderCard({ platform }: WatchProviderCardProps) {
  const isPartner = platform.isSponsored || (platform as any).isPartner;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative p-6 rounded-2xl flex flex-col items-center gap-4 transition-all group overflow-hidden ${
        isPartner 
          ? 'bg-brand/10 border border-brand/30 shadow-[0_0_25px_rgba(229,9,20,0.15)] hover:border-brand/60' 
          : 'glass border-white/5 hover:border-brand/40'
      }`}
    >
      {isPartner && (
        <span className="absolute top-3 right-3 bg-brand text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-brand/20 animate-pulse">
          <ShieldCheck className="w-2.5 h-2.5" /> Partner
        </span>
      )}

      <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-110 transition-transform p-4">
        <img 
          src={platform.logo} 
          alt={platform.name} 
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      
      <div className="text-center">
        <h4 className="text-white font-bold text-lg">{platform.name}</h4>
        <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] mt-1">Available in HD/4K</p>
      </div>

      <a 
        href={platform.watchUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`w-full py-2.5 rounded-lg font-black text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all uppercase ${
          isPartner
            ? 'bg-brand text-white hover:bg-red-700 shadow-[0_0_15px_rgba(229,9,20,0.3)]'
            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
        }`}
      >
        Watch Now <ExternalLink className="w-4 h-4" />
      </a>
    </motion.div>
  );
}
