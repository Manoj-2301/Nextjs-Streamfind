import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMovieAdditionalDetails } from '../../services/tmdbService';

export default function DirectorNote({ movieId }: { movieId: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: details, isLoading } = useQuery({
    queryKey: ['movieAdditionalDetails', movieId],
    queryFn: () => getMovieAdditionalDetails(movieId),
    enabled: isExpanded,
    staleTime: 1000 * 60 * 60 * 24 // Cache for 24h
  });

  if (!isExpanded) {
    return (
      <button 
        onClick={() => setIsExpanded(true)}
        className="w-full mt-4 py-2 border border-brand/20 bg-brand/5 text-brand text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand/10 hover:scale-[1.02] transition-all"
      >
        Load Director's Note & Insights
      </button>
    );
  }

  return (
    <div className="space-y-4 border-t border-white/10 pt-6 relative z-10 mt-4">
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <div className="w-5 h-5 border-2 border-brand/40 border-t-brand rounded-full animate-spin" />
        </div>
      ) : details ? (
        <>
          {details.director && (
            <div className="p-4 rounded-[20px] bg-brand/5 border border-brand/20 shadow-inner">
              <p className="text-[10px] font-black uppercase text-brand tracking-widest mb-2 drop-shadow-sm">Director's Note</p>
              <p className="text-white/70 text-[11px] italic font-bold leading-relaxed">
                Directed by <span className="text-white font-black">{details.director}</span>. Behind-the-scenes trivia: This masterpiece was meticulously crafted to deliver a raw, visual-first cinematic experience.
              </p>
            </div>
          )}
          {details.topCriticReview && (
            <div className="p-4 rounded-[20px] bg-white/5 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase text-white/50 tracking-widest">Top Critic Insight</p>
                <span className="text-[9px] font-black text-white/80 bg-white/10 px-2 py-1 rounded-lg uppercase tracking-widest truncate max-w-[120px]">By {details.topCriticReview.author}</span>
              </div>
              <p className="text-white/60 text-[11px] italic leading-relaxed line-clamp-2 font-medium">
                "{details.topCriticReview.content}"
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
