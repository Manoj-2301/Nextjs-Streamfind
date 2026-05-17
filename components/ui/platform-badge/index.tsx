'use client';

interface PlatformBadgeProps {
  name: string;
  logo: string;
  className?: string;
}

export default function PlatformBadge({ name, logo, className = "" }: PlatformBadgeProps) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 ${className}`} title={name}>
      <span className="text-sm">{logo}</span>
      <span className="text-[10px] font-bold text-white/60 uppercase tracking-tighter hidden md:inline">{name}</span>
    </div>
  );
}
