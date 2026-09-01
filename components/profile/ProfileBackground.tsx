import React from 'react';
import Image from 'next/image';

interface ProfileBackgroundProps {
  heroBackdrop: string | null;
  primaryFavGenre: string;
}

export default function ProfileBackground({ heroBackdrop, primaryFavGenre }: ProfileBackgroundProps) {
  const getAuraColor = (genre: string) => {
    switch (genre) {
      case 'Sci-Fi': return 'from-purple-900/40 to-background';
      case 'Action': return 'from-red-900/40 to-background';
      case 'Drama': return 'from-orange-900/40 to-background';
      case 'Thriller': return 'from-violet-900/40 to-background';
      case 'Comedy': return 'from-amber-900/40 to-background';
      default: return 'from-brand/20 to-background';
    }
  };

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Ambient blur */}
      <div className="absolute inset-0 bg-[#050505]" />
      
      {heroBackdrop ? (
        <>
          <Image
            src={heroBackdrop}
            alt="Profile Cinematic Background"
            fill
            unoptimized={true}
            className="object-cover opacity-30 mix-blend-screen blur-[40px] md:blur-[80px]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-[#050505]/80 to-[#050505]" />
        </>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-b ${getAuraColor(primaryFavGenre)} opacity-50 blur-[100px] mix-blend-screen`} />
      )}

      {/* Static Spatial Glow Orbs (Zero Main-Thread JS Overhead) */}
      <div className="w-[100vw] h-[100vw] max-w-[800px] max-h-[800px] opacity-10 blur-[100px] bg-brand absolute -top-[20%] -left-[10%] rounded-full mix-blend-screen pointer-events-none" />
      <div className="w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] opacity-10 blur-[90px] bg-blue-500 absolute top-[20%] right-[10%] rounded-full mix-blend-screen pointer-events-none" />

      {/* Noise overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.25] mix-blend-overlay" />
    </div>
  );
}
