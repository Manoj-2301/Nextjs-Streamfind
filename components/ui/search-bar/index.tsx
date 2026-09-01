/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import { Search, X } from 'lucide-react';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */
interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function SearchBar({ value, onChange, className = "", placeholder = "Search for movies, actors, genres..." }: SearchBarProps) {

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 text-white/40">
        <Search className="w-4 h-4 md:w-5 md:h-5" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 pl-10 md:pl-14 pr-10 md:pr-12 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all text-sm"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
        >
          <X className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      )}
    </div>
  );
}
