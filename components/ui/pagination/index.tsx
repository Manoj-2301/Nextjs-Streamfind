'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disableScroll?: boolean;
  size?: 'sm' | 'md';
}

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  disableScroll = false,
  size = 'md'
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    onPageChange(page);
    if (!disableScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Show fewer pages for sm size or mobile
  const getMaxVisible = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) return 3;
    return size === 'sm' ? 3 : 5;
  };

  const maxVisible = getMaxVisible();
  const half = Math.floor(maxVisible / 2);

  const containerClass = size === 'sm'
    ? "mt-6 flex flex-col items-center gap-2 py-4 border-t border-white/5"
    : "mt-10 md:mt-20 flex flex-col items-center gap-4 md:gap-6 py-6 md:py-8 border-t border-white/5";

  const textClass = size === 'sm'
    ? "text-[9px] font-bold text-white/30 uppercase tracking-widest"
    : "text-[10px] md:text-sm font-bold text-white/40 uppercase tracking-widest";

  const buttonSizeClass = size === 'sm'
    ? "w-8 h-8 rounded-lg text-xs"
    : "w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl text-xs md:text-sm";

  const iconSizeClass = size === 'sm'
    ? "w-3.5 h-3.5"
    : "w-4 h-4 md:w-6 md:h-6";

  const gapClass = size === 'sm' ? "gap-1" : "gap-1.5 md:gap-2";

  return (
    <div className={containerClass}>
      <div className={textClass}>
        Page {currentPage} of {totalPages}
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
          className={`${buttonSizeClass} glass flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all border border-white/5`}
        >
          <ChevronLeft className={`${iconSizeClass} text-white`} />
        </button>

        <div className={`flex items-center ${gapClass}`}>
          {Array.from({ length: Math.min(maxVisible, totalPages) }, (_, i) => {
            let pageNum: number;
            if (currentPage <= half + 1) pageNum = i + 1;
            else if (currentPage >= totalPages - half) pageNum = totalPages - maxVisible + 1 + i;
            else pageNum = currentPage - half + i;

            if (pageNum < 1 || pageNum > totalPages) return null;

            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`${buttonSizeClass} font-bold transition-all ${currentPage === pageNum ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
          className={`${buttonSizeClass} glass flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all border border-white/5`}
        >
          <ChevronRight className={`${iconSizeClass} text-white`} />
        </button>
      </div>
    </div>
  );
}
