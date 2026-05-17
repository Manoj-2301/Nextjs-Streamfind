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
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative p-6 rounded-2xl glass border-white/5 flex flex-col items-center gap-4 transition-all hover:border-brand/40 group overflow-hidden ${
        platform.isSponsored ? 'shadow-[0_0_30px_rgba(229,9,20,0.15)] bg-brand/5 border-brand/20' : ''
      }`}
    >
      {/* Sponsor Badge */}
      {platform.isSponsored && (
        <div className="absolute top-0 right-0 bg-brand text-white text-[10px] font-black px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-lg">
          <ShieldCheck className="w-3 h-3" /> FEATURED PARTNER
        </div>
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
          platform.isSponsored 
          ? 'bg-brand text-white hover:bg-red-700 shadow-[0_0_15px_rgba(229,9,20,0.3)]' 
          : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
        }`}
      >
        Watch Now <ExternalLink className="w-4 h-4" />
      </a>
    </motion.div>
  );
}
