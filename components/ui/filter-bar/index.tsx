'use client';

import { Filter, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect } from 'react';

interface FilterBarProps {
  onGenreChange: (genre: string) => void;
  onRatingChange: (rating: number | null) => void;
  onYearChange: (range: [number, number] | null) => void;
  onPlatformChange: (platforms: string[]) => void;
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
  activeGenre: string;
  activeRating: number | null;
  activeYearRange: [number, number] | null;
  selectedPlatforms: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  totalResults: number;
}

export default function FilterBar({
  onGenreChange,
  onRatingChange,
  onYearChange,
  onPlatformChange,
  onSortChange,
  activeGenre,
  activeRating,
  activeYearRange,
  selectedPlatforms,
  sortBy,
  sortOrder,
  totalResults
}: FilterBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const genres = ["All", "Action", "Sci-Fi", "Drama", "Adventure", "Animation", "Crime", "Biography"];
  const ratings = [7, 8, 9];
  const sortOptions = [
    { label: "Rating", value: "rating" },
    { label: "Release Date", value: "year" },
    { label: "Popularity", value: "popularity" },
  ];
  const years = [
    { label: "All Years", value: null },
    { label: "2020 - Present", value: [2020, 2025] },
    { label: "2010 - 2019", value: [2010, 2019] },
    { label: "2000 - 2009", value: [2000, 2009] },
    { label: "Pre-2000", value: [1950, 1999] },
  ];
  const platforms = ["Netflix", "Amazon Prime", "Disney+", "Apple TV", "HBO Max", "Hotstar", "Peacock"];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside as EventListener);
    document.addEventListener('touchstart', handleClickOutside as EventListener);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside as EventListener);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, []);

  const togglePlatform = (p: string) => {
    const newPlatforms = selectedPlatforms.includes(p)
      ? selectedPlatforms.filter(x => x !== p)
      : [...selectedPlatforms, p];
    onPlatformChange(newPlatforms);
  };

  return (
    <div className="flex flex-wrap gap-2 md:gap-4 items-center relative" ref={containerRef}>
      <div className="p-2 md:p-3 bg-brand/10 border border-brand/20 rounded-lg md:rounded-xl text-brand">
        <Filter className="w-4 h-4 md:w-5 md:h-5" />
      </div>

      {/* Genre Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setActiveDropdown(activeDropdown === 'genre' ? null : 'genre')}
          className={`px-3.5 py-2.5 md:px-5 md:py-3 rounded-lg md:rounded-xl glass border-white/5 text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-3 transition-all ${activeGenre !== 'All' ? 'text-brand border-brand/40' : 'text-white/60 hover:text-white'}`}
        >
          {activeGenre === 'All' ? 'Genre' : activeGenre} <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
        </button>
        <AnimatePresence>
          {activeDropdown === 'genre' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 mt-2 w-48 glass-dark border border-white/10 rounded-xl max-h-60 overflow-y-auto p-2 z-[9999] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              data-lenis-prevent
            >
              {genres.map(g => (
                <button
                  key={g}
                  onClick={() => { onGenreChange(g); setActiveDropdown(null); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${activeGenre === g ? 'bg-brand/20 text-brand' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                >
                  {g} {activeGenre === g && <Check className="w-3 h-3" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rating Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setActiveDropdown(activeDropdown === 'rating' ? null : 'rating')}
          className={`px-3.5 py-2.5 md:px-5 md:py-3 rounded-lg md:rounded-xl glass border-white/5 text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-3 transition-all ${activeRating ? 'text-brand border-brand/40' : 'text-white/60 hover:text-white'}`}
        >
          {activeRating ? `${activeRating}+` : 'Rating'} <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
        </button>
        <AnimatePresence>
          {activeDropdown === 'rating' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 mt-2 w-48 glass-dark border border-white/10 rounded-xl p-2 z-[9999]"
            >
              <button
                onClick={() => { onRatingChange(null); setActiveDropdown(null); }}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors mb-1 ${!activeRating ? 'bg-brand/20 text-brand' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
              >
                All Ratings
              </button>
              {ratings.map(r => (
                <button
                  key={r}
                  onClick={() => { onRatingChange(r); setActiveDropdown(null); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${activeRating === r ? 'bg-brand/20 text-brand' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                >
                  {r}+ IMDb {activeRating === r && <Check className="w-3 h-3" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Year Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setActiveDropdown(activeDropdown === 'year' ? null : 'year')}
          className={`px-3.5 py-2.5 md:px-5 md:py-3 rounded-lg md:rounded-xl glass border-white/5 text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-3 transition-all ${activeYearRange ? 'text-brand border-brand/40' : 'text-white/60 hover:text-white'}`}
        >
          {activeYearRange ? `${activeYearRange[0]}-${activeYearRange[1]}` : 'Year'} <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
        </button>
        <AnimatePresence>
          {activeDropdown === 'year' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 mt-2 w-56 glass-dark border border-white/10 rounded-xl p-2 z-[9999]"
            >
              {years.map(y => (
                <button
                  key={y.label}
                  onClick={() => { onYearChange(y.value as [number, number] | null); setActiveDropdown(null); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${JSON.stringify(activeYearRange) === JSON.stringify(y.value) ? 'bg-brand/20 text-brand' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                >
                  {y.label} {JSON.stringify(activeYearRange) === JSON.stringify(y.value) && <Check className="w-3 h-3" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Platform Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setActiveDropdown(activeDropdown === 'platform' ? null : 'platform')}
          className={`px-3.5 py-2.5 md:px-5 md:py-3 rounded-lg md:rounded-xl glass border-white/5 text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-3 transition-all ${selectedPlatforms.length > 0 ? 'text-brand border-brand/40' : 'text-white/60 hover:text-white'}`}
        >
          {selectedPlatforms.length > 0 ? `${selectedPlatforms.length} Sel.` : 'Platform'} <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
        </button>
        <AnimatePresence>
          {activeDropdown === 'platform' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 mt-2 w-56 glass-dark border border-white/10 rounded-xl p-2 z-[9999]"
            >
              <div className="px-4 py-2 border-b border-white/5 mb-2">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Select Platforms</span>
              </div>
              <div className="max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" data-lenis-prevent>
                {platforms.map(p => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${selectedPlatforms.includes(p) ? 'text-brand bg-brand/5' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                  >
                    {p}
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedPlatforms.includes(p) ? 'bg-brand border-brand' : 'border-white/20'}`}>
                      {selectedPlatforms.includes(p) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
              {selectedPlatforms.length > 0 && (
                <button 
                  onClick={() => onPlatformChange([])}
                  className="w-full text-center py-2 text-[10px] font-black text-white/40 hover:text-brand transition-colors mt-2 uppercase tracking-widest"
                >
                  Clear Selection
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sort Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
          className="px-3.5 py-2.5 md:px-5 md:py-3 rounded-lg md:rounded-xl glass border-white/5 text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-3 transition-all text-white/60 hover:text-white"
        >
          <span className="hidden sm:inline">Sort By: {sortOptions.find(o => o.value === sortBy)?.label} ({sortOrder === 'desc' ? 'Desc' : 'Asc'})</span>
          <span className="sm:hidden">Sort</span>
          <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
        </button>
        <AnimatePresence>
          {activeDropdown === 'sort' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 mt-2 w-48 glass-dark border border-white/10 rounded-xl p-2 z-[9999]"
            >
              {sortOptions.map(option => (
                <div key={option.value} className="flex flex-col mb-2 last:mb-0">
                  <div className="px-4 py-1 text-[10px] font-black text-white/20 uppercase tracking-widest">{option.label}</div>
                  <button
                    onClick={() => { onSortChange(option.value, 'desc'); setActiveDropdown(null); }}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${sortBy === option.value && sortOrder === 'desc' ? 'bg-brand/20 text-brand' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                  >
                    Descending {sortBy === option.value && sortOrder === 'desc' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => { onSortChange(option.value, 'asc'); setActiveDropdown(null); }}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${sortBy === option.value && sortOrder === 'asc' ? 'bg-brand/20 text-brand' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                  >
                    Ascending {sortBy === option.value && sortOrder === 'asc' && <Check className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="ml-auto text-[10px] md:text-xs text-white/40 uppercase tracking-widest font-bold">
        {totalResults} results
      </div>
    </div>
  );
}
