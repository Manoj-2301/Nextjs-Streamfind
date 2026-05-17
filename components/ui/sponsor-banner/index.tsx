'use client';

import { Sparkles } from "lucide-react";
import { motion } from "motion/react";

export default function SponsorBanner() {
  return (
    <div className="px-6 lg:px-12 py-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative overflow-hidden group rounded-2xl md:rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]"
      >
        {/* Animated Background Gradient */}
        <div className="absolute -inset-1 bg-gradient-to-r from-brand/20 via-white/5 to-brand/20 blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-1000"></div>
        
        <div className="relative bg-[#020202]/90 backdrop-blur-3xl border border-white/[0.05] py-10 px-8 md:px-16 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <div className="flex items-center gap-3 px-6 py-2.5 bg-white/[0.02] border border-white/10 rounded-full shadow-inner shadow-black shrink-0">
              <Sparkles className="w-4 h-4 text-brand animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.5em] font-black text-white/80">
                Featured Partner
              </span>
            </div>
            
            <div className="text-center lg:text-left">
              <h4 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-[0.85] mb-3">
                Stream <span className="text-brand italic">"INTERSTELLAR"</span><br className="hidden md:block" /> now on Disney+
              </h4>
              <p className="text-[10px] md:text-[11px] text-white/40 font-black tracking-[0.3em] uppercase flex items-center justify-center lg:justify-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_10px_rgba(var(--color-brand),1)]"></span>
                Special 3 Months Free Trial Offer
              </p>
            </div>
          </div>
          
          <motion.a 
            href="#" 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-4 bg-white text-black px-9 py-3.5 rounded-xl text-[11px] font-black tracking-[0.4em] uppercase hover:bg-brand transition-all whitespace-nowrap shadow-[0_20px_40px_rgba(255,255,255,0.05)] group/btn"
          >
            CLAIM OFFER
            <span className="text-base group-hover:translate-x-2 transition-transform">→</span>
          </motion.a>
        </div>
      </motion.div>
    </div>
  );
}
