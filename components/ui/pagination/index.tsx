'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show 3 pages on small screens, 5 on larger
  const getMaxVisible = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) return 3;
    return 5;
  };

  const maxVisible = getMaxVisible();
  const half = Math.floor(maxVisible / 2);

  return (
    <div className="mt-10 md:mt-20 flex flex-col items-center gap-4 md:gap-6 py-6 md:py-8 border-t border-white/5">
      <div className="text-[10px] md:text-sm font-bold text-white/40 uppercase tracking-widest">
        Page {currentPage} of {totalPages}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
          className="w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl glass flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all border border-white/5"
        >
          <ChevronLeft className="w-4 h-4 md:w-6 md:h-6 text-white" />
        </button>

        <div className="flex items-center gap-1.5 md:gap-2">
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
                className={`w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition-all ${currentPage === pageNum ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
          className="w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl glass flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all border border-white/5"
        >
          <ChevronRight className="w-4 h-4 md:w-6 md:h-6 text-white" />
        </button>
      </div>
    </div>
  );
}
