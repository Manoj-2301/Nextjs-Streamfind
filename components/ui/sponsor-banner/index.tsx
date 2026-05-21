'use client';

import { Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface SponsorBannerProps {
  movieName: string;
  providerName: string;
  offerText?: string;
  affiliateUrl: string;
}

export default function SponsorBanner({ movieName, providerName, offerText, affiliateUrl }: SponsorBannerProps) {
  if (!movieName || !providerName || !affiliateUrl) return null;

  return (
    <div className="px-6 lg:px-12 py-6 relative max-w-[1400px] mx-auto">
      {/* Decorative background glow for the whole section */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-2/3 bg-brand/10 blur-[80px] pointer-events-none rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-visible group rounded-[2rem] shadow-xl"
      >
        {/* Animated Gradient Border Layer */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand/40 via-white/20 to-brand/40 rounded-[2rem] opacity-70 group-hover:opacity-100 blur-[2px] transition-opacity duration-700" />
        
        {/* Deep Glassmorphic Container */}
        <div className="relative bg-[#050505]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 md:p-8 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 overflow-hidden">
          
          {/* Subtle internal shine effects */}
          <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
          <div className="absolute bottom-0 right-1/4 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute -left-20 -top-20 w-48 h-48 bg-brand/10 blur-[60px] rounded-full group-hover:bg-brand/20 transition-colors duration-1000" />
          
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10 relative z-10 w-full lg:w-auto text-center lg:text-left">
            {/* Badge */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-white/10 to-transparent border border-white/20 rounded-full shadow-[inset_0_4px_20px_rgba(255,255,255,0.05)] shrink-0 relative"
            >
              <div className="absolute inset-0 bg-brand/10 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }} />
              <Sparkles className="w-5 h-5 text-brand mb-1.5" />
              <span className="text-[8px] uppercase tracking-[0.2em] font-black text-white text-center leading-tight">
                Featured<br/>Partner
              </span>
            </motion.div>
            
            {/* Typography */}
            <div className="max-w-lg">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-[0.9] mb-4 font-display">
                <span className="text-white/40 block text-xs md:text-sm mb-1.5 tracking-[0.2em] font-sans">Now Streaming</span>
                <span className="bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
                  {movieName}
                </span>
                <br />
                <span className="text-brand italic pr-2">on {providerName}</span>
              </h2>
              
              {offerText && (
                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse shadow-[0_0_10px_rgba(var(--color-brand),1)]"></span>
                  <p className="text-[9px] md:text-[10px] text-brand font-black tracking-[0.2em] uppercase">
                    {offerText}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* CTA Button */}
          <motion.a 
            href={affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="relative group/btn z-10 shrink-0 w-full lg:w-auto"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-brand to-white/50 rounded-xl blur opacity-30 group-hover/btn:opacity-60 transition-opacity duration-500" />
            <div className="relative flex items-center justify-center gap-3 bg-white text-black px-6 py-3 rounded-xl overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-150%] group-hover/btn:translate-x-[150%] transition-transform duration-700 ease-out" />
              <span className="text-[10px] md:text-xs font-black tracking-[0.2em] uppercase relative z-10">
                Claim Offer
              </span>
              <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center group-hover/btn:bg-brand transition-colors relative z-10">
                <span className="text-white text-[10px] group-hover/btn:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
          </motion.a>
        </div>
      </motion.div>
    </div>
  );
}
