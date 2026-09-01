'use client';

import Link from 'next/link';

import { Person } from '@/types';
import { OptimizedImage } from '../optimized-media';

interface PersonCardProps {
  person: Person;
  index?: number;
}

export default function PersonCard({ person, index = 0 }: PersonCardProps) {

  return (
    <Link href={`/cast/${person.id}-${person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
      <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-[#0f0f0f] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-all hover:scale-[1.03] duration-300 flex-shrink-0 group">
        
        {/* Background Image */}
        <OptimizedImage
          src={person.profileUrl}
          alt={person.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover"
        />

        {/* Dark Gradient bottom 60% */}
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent pointer-events-none" />

        {/* Top-Right: Department Chip */}
        {person.knownForDepartment && (
          <div className="absolute top-2.5 right-2.5 z-10 bg-[#0a0a0a]/90 border border-white/10 px-2 py-1 rounded-md shadow-md flex items-center justify-center">
            <span className="font-sans text-[9px] font-black uppercase tracking-wider text-white/95 leading-none">
              {person.knownForDepartment}
            </span>
          </div>
        )}

        {/* Bottom Content */}
        <div className="absolute bottom-0 inset-x-0 p-3 z-10 flex flex-col">
          <div className="font-mono text-[9px] uppercase tracking-widest mb-1 truncate text-[#999]">
            {person.popularity ? `Popularity: ${Math.round(person.popularity)}` : 'Trending'}
          </div>
          
          <h3 className="font-serif text-[13px] text-white font-bold leading-tight mb-1.5 line-clamp-2">
            {person.name}
          </h3>

          <div className="flex items-center justify-between mt-auto">
            <span className="font-mono text-[9px] text-[#999] truncate pr-2">
              {person.knownFor.slice(0, 2).map(kf => kf.title).join(', ')}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
