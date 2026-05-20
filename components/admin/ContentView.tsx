import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Trash2, Plus, MoreVertical } from 'lucide-react';
import { AdminUser, AdminRating } from './types';
import Pagination from '@/components/ui/pagination';

export default function ContentView({
  ratings,
  users,
  isLoading,
  onDeleteReview,
  onApproveReview
}: {
  ratings: AdminRating[];
  users: AdminUser[];
  isLoading: boolean;
  onDeleteReview: (userId: string, movieId: string) => void;
  onApproveReview: (userId: string, movieId: string) => void;
}) {
  // Extract user critiques from ratings
  const reviews = useMemo(() => {
    return ratings
      .filter(r => r.reviewText && r.reviewText.trim().length > 0)
      .map(r => {
        const reviewer = users.find(u => u.id === r.userId);

        let relativeDate = 'Recent';
        if (r.updatedAt) {
          const date = r.updatedAt.toDate ? r.updatedAt.toDate() : new Date(r.updatedAt);
          const diffMs = Date.now() - date.getTime();
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          if (diffHrs < 1) {
            relativeDate = 'Just now';
          } else if (diffHrs < 24) {
            relativeDate = `${diffHrs}h ago`;
          } else {
            relativeDate = `${Math.floor(diffHrs / 24)}d ago`;
          }
        }

        return {
          userId: r.userId,
          movieId: r.movieId,
          userName: reviewer?.displayName || reviewer?.email?.split('@')[0] || 'Anonymous Film Buff',
          movieTitle: r.movieTitle || 'Unknown Movie',
          text: r.reviewText || '',
          date: relativeDate,
          status: r.approved ? 'Approved' : 'Pending',
          rating: r.rating
        };
      });
  }, [ratings, users]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;
  const totalPages = Math.ceil(reviews.length / itemsPerPage);
  const paginatedReviews = reviews.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="h-10 w-48 bg-white/5 rounded-lg animate-pulse" />
          {[1, 2].map(i => (
            <div key={i} className="h-44 bg-surface/30 border border-white/5 rounded-[32px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="grid grid-cols-1 gap-8">
          <div className="flex flex-col">
            {/* Moderation Hub */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter font-display">Moderation <span className="text-brand">Wall</span></h3>
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{reviews.length} total critiques</span>
              </div>

              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-white/10 rounded-[32px] text-white/30 font-bold uppercase text-xs tracking-widest">
                    No community reviews submitted yet.
                  </div>
                ) : (
                  paginatedReviews.map((review, i) => (
                    <div key={i} className="p-6 sm:p-8 bg-surface/30 border border-white/5 rounded-[32px] group">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-[10px] font-black text-brand italic">
                            {review.rating}★
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-white/80">{review.userName} <span className="text-brand/50 px-2 italic">on</span> {review.movieTitle}</p>
                            <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest mt-0.5">{review.date}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${review.status === 'Approved' ? 'bg-green-500/10 text-green-500' : 'bg-brand/10 text-brand'}`}>{review.status}</div>
                      </div>
                      <p className="text-sm font-medium text-white/60 leading-relaxed italic">&quot;{review.text}&quot;</p>

                      <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-4">
                        {review.status !== 'Approved' && (
                          <button
                            onClick={() => onApproveReview(review.userId, review.movieId.toString())}
                            className="flex-1 bg-brand text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Approve
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteReview(review.userId, review.movieId.toString())}
                          className="flex-1 bg-white/5 text-white/40 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

        {/* Featured Collections Editor */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter font-display">Featured <span className="text-brand">Curations</span></h3>
            <button className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand/20"><Plus className="w-5 h-5" /></button>
          </div>

          <div className="p-6 md:p-10 bg-brand/5 border border-brand/20 rounded-[40px] space-y-8">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-6">
              <div className="w-24 h-36 mx-auto sm:mx-0 bg-surface border border-white/10 rounded-2xl overflow-hidden relative group shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://image.tmdb.org/t/p/w200/gEU2QniE6E77NI6vCU677iS7Z3P.jpg" className="w-full h-full object-cover" alt="Inception" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-brand tracking-[0.2em]">Movies of the Month</span>
                <h4 className="text-2xl font-black uppercase italic tracking-tighter mt-1 font-display">Neon Noir <span className="text-brand">Spring</span></h4>
                <p className="text-xs font-medium text-white/40 mt-2 max-w-sm">Curated selection of aesthetic thrillers for late-night viewing.</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { title: "Staff Pick: Blade Runner", slot: "Slot 01" },
                { title: "Genre Focus: Japanese Horror", slot: "Slot 02" }
              ].map((pick) => (
                <div key={pick.slot} className="p-6 rounded-3xl bg-surface/50 border border-white/5 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="text-[8px] font-black text-brand uppercase tracking-widest">{pick.slot}</div>
                    <p className="text-xs font-black uppercase tracking-tight">{pick.title}</p>
                  </div>
                  <MoreVertical className="w-4 h-4 text-white/20 group-hover:text-white transition-colors cursor-pointer" />
                </div>
              ))}
            </div>

            <button className="w-full py-4 bg-white text-black rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-brand hover:text-white transition-all shadow-xl">
              Update Feed Globally
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
