'use client';

import { Platform } from '@/types';
import Image from 'next/image';

interface PlatformBadgeProps {
  platform: Platform;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PlatformBadge({ platform, showLabel = true, size = 'sm', className = "" }: PlatformBadgeProps) {
  const name = platform?.name || 'Unknown';
  const nameLower = name.toLowerCase();

  let bgColor = '#333333';
  let letter = name.charAt(0).toUpperCase();

  if (nameLower.includes('netflix')) {
    bgColor = '#E50914';
    letter = 'N';
  } else if (nameLower.includes('prime') || nameLower.includes('amazon')) {
    bgColor = '#00A8E1';
    letter = 'P';
  } else if (nameLower.includes('hotstar') || nameLower.includes('disney')) {
    bgColor = '#1F80E0';
    letter = 'H';
  } else if (nameLower.includes('sonyliv') || nameLower.includes('sony')) {
    bgColor = '#FF6B35';
    letter = 'S';
  } else if (nameLower.includes('zee5') || nameLower.includes('zee')) {
    bgColor = '#8B2FC9';
    letter = 'Z';
  } else if (nameLower.includes('apple')) {
    bgColor = '#FFFFFF';
    letter = 'A';
  }

  const sizeClasses = {
    sm: 'w-5 h-5 text-[8px]',
    md: 'w-6 h-6 text-[10px]',
    lg: 'w-8 h-8 text-[12px]',
  };

  const isApple = nameLower.includes('apple');
  const textColor = isApple ? 'text-black' : 'text-white';

  return (
    <div className={`flex items-center gap-2 ${className}`} title={name}>
      <div 
        className={`${sizeClasses[size]} rounded-[4px] flex items-center justify-center font-mono font-bold ${textColor} overflow-hidden flex-shrink-0`}
        style={{ backgroundColor: bgColor }}
      >
        {platform.logoUrl || (platform as any).logo ? (
          <Image src={platform.logoUrl || (platform as any).logo} alt={name} width={32} height={32} className="w-full h-full object-cover" unoptimized={true} />
        ) : (
          <span>{letter}</span>
        )}
      </div>
      {showLabel && (
        <span className="text-[#aaa] text-[12px] font-mono whitespace-nowrap">
          {name}
        </span>
      )}
    </div>
  );
}

