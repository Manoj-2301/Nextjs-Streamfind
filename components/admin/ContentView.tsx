import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Plus, Edit2, Play, Save, X, ExternalLink, Calendar, Star, TrendingUp, Tag, Globe, Settings, AlertTriangle, MoreVertical, Search, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { AdminUser, AdminRating, FeaturedCuration } from './types';
import Pagination from '@/components/ui/pagination';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

export default function ContentView({
  ratings,
  users,
  curations,
  isLoading,
  onDeleteReview,
  onApproveReview,
  onSetCurations
}: {
  ratings: AdminRating[];
  users: AdminUser[];
  curations: FeaturedCuration[];
  isLoading: boolean;
  onDeleteReview: (userId: string, movieId: string) => void;
  onApproveReview: (userId: string, movieId: string) => void;
  onSetCurations: React.Dispatch<React.SetStateAction<FeaturedCuration[]>>;
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

  // Curation State
  const [isCurationModalOpen, setIsCurationModalOpen] = useState(false);
  const [editingCuration, setEditingCuration] = useState<Partial<FeaturedCuration> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [trendingResults, setTrendingResults] = useState<any[]>([]);
  const [trendingTab, setTrendingTab] = useState<'day' | 'week' | 'month'>('week');
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdatingFeed, setIsUpdatingFeed] = useState(false);
  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null);

  // TMDB Genre ID → Name map
  const GENRE_MAP: Record<number, string> = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
    53: 'Thriller', 10752: 'War', 37: 'Western',
    10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News',
    10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
    10767: 'Talk', 10768: 'War & Politics',
  };

  const getGenreNames = (ids: number[] = []) =>
    ids.slice(0, 2).map(id => GENRE_MAP[id]).filter(Boolean).join(' · ');

  // Helper: find the next available slot number
  const getNextSlotNo = () => {
    const existingNums = curations
      .map(c => parseInt(c.slotNo.replace(/\D/g, ''), 10))
      .filter(n => !isNaN(n));
    let next = 1;
    while (existingNums.includes(next)) next++;
    return `Slot ${String(next).padStart(2, '0')}`;
  };

  // Fetch trending based on active tab
  useEffect(() => {
    if (!isCurationModalOpen) return;
    setIsTrendingLoading(true);
    setTrendingResults([]);
    const timeWindow = trendingTab === 'month' ? 'week' : trendingTab; // TMDB has day/week only; month = top-rated
    const url = trendingTab === 'month'
      ? '/api/tmdb/movie/top_rated'
      : `/api/tmdb/trending/all/${timeWindow}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.results) setTrendingResults(data.results.slice(0, 12));
      })
      .catch(err => console.error(err))
      .finally(() => setIsTrendingLoading(false));
  }, [isCurationModalOpen, trendingTab]);

  // Handle Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(data => {
          if (data.results) {
            setSearchResults(data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv'));
          }
        })
        .finally(() => setIsSearching(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSaveCuration = async () => {
    if (!editingCuration?.movieId || !editingCuration?.slotNo || !editingCuration?.type) {
      toast.error('Please fill all required fields and select a movie/tv show.');
      return;
    }

    setIsSaving(true);
    try {
      const db = getFirestore(app);
      if (editingCuration.id) {
        // Update
        await updateDoc(doc(db, 'featured_curations', editingCuration.id), {
          ...editingCuration,
          updatedAt: new Date()
        });
        onSetCurations(prev => prev.map(c => c.id === editingCuration.id ? { ...editingCuration, updatedAt: new Date() } as FeaturedCuration : c));
        toast.success('✅ Curation updated successfully!');
      } else {
        // Add
        const docRef = await addDoc(collection(db, 'featured_curations'), {
          ...editingCuration,
          updatedAt: new Date()
        });
        onSetCurations(prev => [...prev, { ...editingCuration, id: docRef.id, updatedAt: new Date() } as FeaturedCuration].sort((a, b) => a.slotNo.localeCompare(b.slotNo)));
        toast.success('✅ Curation added successfully!');
      }
      setIsCurationModalOpen(false);
      setEditingCuration(null);
    } catch (err: any) {
      toast.error('❌ Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCuration = async (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4 min-w-[280px]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h4 className="text-white font-bold text-base mb-1">Delete Curation</h4>
            <span className="text-sm font-medium text-white/60 leading-relaxed">Delete this curation slot?</span>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white transition-all">Cancel</button>
          <button onClick={() => { toast.dismiss(t.id); executeDeleteCuration(id); }} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)] rounded-xl text-xs font-bold text-white transition-all">Yes, Delete</button>
        </div>
      </div>
    ), { duration: Infinity, style: { padding: '20px', borderRadius: '24px', background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.1)' } });
  };

  const executeDeleteCuration = async (id: string) => {
    try {
      const db = getFirestore(app);
      
      // Get the slot number of the curation being deleted
      const deletedCuration = curations.find(c => c.id === id);
      const deletedSlotNo = deletedCuration ? parseInt(deletedCuration.slotNo) : null;

      // Delete the requested document
      await deleteDoc(doc(db, 'featured_curations', id));
      
      let updatedCurations = curations.filter(c => c.id !== id);

      // Shift subsequent slot numbers down by 1
      if (deletedSlotNo !== null && !isNaN(deletedSlotNo)) {
        updatedCurations = await Promise.all(updatedCurations.map(async (c) => {
          const currentSlot = parseInt(c.slotNo);
          if (!isNaN(currentSlot) && currentSlot > deletedSlotNo) {
            const newSlotNo = (currentSlot - 1).toString();
            // Update in Firestore
            await updateDoc(doc(db, 'featured_curations', c.id), { slotNo: newSlotNo });
            return { ...c, slotNo: newSlotNo };
          }
          return c;
        }));
      }

      onSetCurations(updatedCurations.sort((a, b) => parseInt(a.slotNo) - parseInt(b.slotNo)));
      setMenuOpenForId(null);
      toast.success('Curation deleted successfully.');
    } catch (err: any) {
      toast.error('Error deleting: ' + err.message);
    }
  };

  const handleUpdateFeed = async () => {
    if (curations.length === 0) {
      toast.error('No curations to send.');
      return;
    }
    
    setIsUpdatingFeed(true);
    try {
      // 1. Get emails from registered users who opted in
      const userEmails = users
        .filter(u => u.newsletterOptIn && u.status === 'Active')
        .map(u => u.email)
        .filter(Boolean);

      // 2. Get emails from guest subscribers
      const { getDocs, collection, getFirestore } = await import('firebase/firestore');
      const { app } = await import('@/lib/firebase');
      const db = getFirestore(app);
      const subscribersSnap = await getDocs(collection(db, 'newsletter_subscribers'));
      
      const guestEmails = subscribersSnap.docs
        .map(doc => doc.data().email)
        .filter(Boolean);

      // Merge and deduplicate
      const emails = Array.from(new Set([...userEmails, ...guestEmails]));
      
      if (emails.length === 0) {
        toast.error('No users have opted in to the newsletter.');
        setIsUpdatingFeed(false);
        return;
      }
      
      const res = await fetch('/api/notify/curations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curations, emails })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update feed');
      toast.success(`Feed updated! Emailed ${data.count || 0} subscribed users.`);
    } catch (err: any) {
      toast.error('Error updating feed: ' + err.message);
    } finally {
      setIsUpdatingFeed(false);
    }
  };

  const renderMediaItem = (item: any) => (
    <div 
      key={item.id} 
      onClick={() => setEditingCuration({
        ...editingCuration,
        movieId: item.id.toString(),
        movieTitle: item.title || item.name,
        movieImage: item.backdrop_path || item.poster_path,
        movieOverview: item.overview,
        mediaType: item.media_type || (item.title ? 'movie' : 'tv')
      })}
      className={`p-3 rounded-2xl flex items-center gap-4 cursor-pointer transition-all border ${editingCuration?.movieId === item.id.toString() ? 'bg-brand/20 border-brand' : 'bg-surface/50 border-white/5 hover:border-white/20 hover:bg-white/5'}`}
    >
      <div className="w-10 h-14 bg-black rounded-lg shrink-0 overflow-hidden relative">
        {(item.poster_path || item.backdrop_path) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https://image.tmdb.org/t/p/w200${item.poster_path || item.backdrop_path}`} className="w-full h-full object-cover" alt="poster" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20"><ImageIcon className="w-5 h-5" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="text-sm font-black text-white truncate">{item.title || item.name}</h5>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-white/40">
            {(item.media_type === 'tv' || item.first_air_date) ? 'TV' : 'Movie'}
          </span>
          <span className="text-[9px] text-white/30">
            {item.release_date?.substring(0, 4) || item.first_air_date?.substring(0, 4) || 'N/A'}
          </span>
          {getGenreNames(item.genre_ids) && (
            <span className="text-[9px] text-brand/70 font-bold truncate">
              {getGenreNames(item.genre_ids)}
            </span>
          )}
        </div>
      </div>
      {editingCuration?.movieId === item.id.toString() && (
        <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );

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
            <button 
              onClick={() => {
                setEditingCuration({ slotNo: getNextSlotNo(), type: 'Staff Pick' });
                setSearchQuery('');
                setIsCurationModalOpen(true);
              }}
              className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand/20 hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 md:p-10 bg-brand/5 border border-brand/20 rounded-[40px] space-y-8 relative">
            {curations.length > 0 ? (
              <>
                <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-6">
                  <div className="w-24 h-36 mx-auto sm:mx-0 bg-surface border border-white/10 rounded-2xl overflow-hidden relative group shrink-0 shadow-2xl shadow-brand/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {curations[0].movieImage ? (
                      <img src={curations[0].movieImage.startsWith('http') ? curations[0].movieImage : `https://image.tmdb.org/t/p/w200${curations[0].movieImage}`} className="w-full h-full object-cover" alt="Cover" />
                    ) : (
                      <div className="w-full h-full bg-surface/50" />
                    )}
                    <div 
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                      onClick={() => {
                        setEditingCuration(curations[0]);
                        setIsCurationModalOpen(true);
                      }}
                    >
                      <span className="text-[10px] font-black uppercase text-white tracking-widest">Edit</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-brand tracking-[0.2em]">{curations[0].type}</span>
                    <h4 className="text-2xl font-black uppercase italic tracking-tighter mt-1 font-display line-clamp-2">{curations[0].movieTitle}</h4>
                    <p className="text-xs font-medium text-white/40 mt-2 max-w-sm line-clamp-2">{curations[0].movieOverview || "Curated selection for our users."}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {curations.slice(1).map((pick) => (
                    <div key={pick.id} className="p-6 rounded-3xl bg-surface/50 border border-white/5 flex items-center justify-between group relative">
                      <div className="flex items-center gap-4">
                        <div className="text-[8px] font-black text-brand uppercase tracking-widest shrink-0">{pick.slotNo}</div>
                        <p className="text-xs font-black uppercase tracking-tight line-clamp-1">{pick.type}: {pick.movieTitle}</p>
                      </div>
                      
                      <button 
                        onClick={() => setMenuOpenForId(menuOpenForId === pick.id ? null : pick.id)}
                        className="p-2 -mr-2"
                      >
                        <MoreVertical className="w-4 h-4 text-white/20 group-hover:text-white transition-colors cursor-pointer" />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {menuOpenForId === pick.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 top-full mt-2 w-32 bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden z-20"
                          >
                            <button
                              onClick={() => {
                                setEditingCuration(pick);
                                setIsCurationModalOpen(true);
                                setMenuOpenForId(null);
                              }}
                              className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-white/5 hover:text-white"
                            >
                              Edit Slot
                            </button>
                            <button
                              onClick={() => handleDeleteCuration(pick.id)}
                              className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500/70 hover:bg-red-500/10 hover:text-red-500"
                            >
                              Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-white/30 text-xs font-black uppercase tracking-widest">
                No featured curations yet.
              </div>
            )}

            <button 
              onClick={handleUpdateFeed}
              disabled={isUpdatingFeed || curations.length === 0}
              className="w-full py-4 bg-white text-black rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-brand hover:text-white transition-all shadow-xl disabled:opacity-50 flex items-center justify-center"
            >
              {isUpdatingFeed ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                'Update Feed Globally'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Curation Modal */}
      <AnimatePresence>
        {isCurationModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-surface border border-white/10 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
                    {editingCuration?.id ? 'Edit' : 'Add'} <span className="text-brand">Curation</span>
                  </h3>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Configure slot details and pick title</p>
                </div>
                <button
                  onClick={() => setIsCurationModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar" data-lenis-prevent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Slot No.</label>
                    <input 
                      type="text" 
                      value={editingCuration?.slotNo || ''}
                      onChange={e => setEditingCuration({ ...editingCuration, slotNo: e.target.value })}
                      placeholder="e.g. Slot 01"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50 font-medium placeholder:text-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Type of Pick</label>
                    <input 
                      type="text" 
                      value={editingCuration?.type || ''}
                      onChange={e => setEditingCuration({ ...editingCuration, type: e.target.value })}
                      placeholder="e.g. Staff Pick"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50 font-medium placeholder:text-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Selected Movie / TV Show</label>
                    {editingCuration?.movieTitle && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand px-2 py-1 bg-brand/10 rounded">Selected</span>
                    )}
                  </div>
                  
                  {editingCuration?.movieTitle ? (
                    <div className="p-4 bg-brand/5 border border-brand/20 rounded-2xl flex items-center gap-4">
                      <div className="w-12 h-16 bg-black rounded-lg shrink-0 overflow-hidden relative">
                        {editingCuration.movieImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={editingCuration.movieImage.startsWith('http') ? editingCuration.movieImage : `https://image.tmdb.org/t/p/w200${editingCuration.movieImage}`} className="w-full h-full object-cover" alt="poster" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-brand/20"><ImageIcon className="w-6 h-6" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-black text-white truncate">{editingCuration.movieTitle}</h5>
                        <p className="text-[10px] text-brand/60 uppercase tracking-widest mt-1">ID: {editingCuration.movieId}</p>
                      </div>
                      <button 
                        onClick={() => setEditingCuration({ ...editingCuration, movieId: undefined, movieTitle: undefined, movieImage: undefined, movieOverview: undefined })}
                        className="p-2 text-white/40 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input 
                          type="text" 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search for a movie or TV show..."
                          className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand/50 font-medium placeholder:text-white/20"
                        />
                      </div>

                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar" data-lenis-prevent>
                        {isSearching ? (
                          <div className="py-8 text-center text-white/40 text-xs font-black uppercase tracking-widest animate-pulse">Searching...</div>
                        ) : searchQuery.trim() !== '' ? (
                          searchResults.length > 0 ? (
                            searchResults.map(renderMediaItem)
                          ) : (
                            <div className="py-8 text-center text-white/40 text-xs font-black uppercase tracking-widest">No results found</div>
                          )
                        ) : (
                          <div>
                            {/* Trending Tabs */}
                            <div className="flex items-center gap-1 mb-4 p-1 bg-black/30 rounded-xl">
                              {(['day', 'week', 'month'] as const).map(tab => (
                                <button
                                  key={tab}
                                  onClick={() => setTrendingTab(tab)}
                                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                    trendingTab === tab
                                      ? 'bg-brand text-white shadow-lg shadow-brand/30'
                                      : 'text-white/30 hover:text-white/60'
                                  }`}
                                >
                                  {tab === 'day' ? 'Today' : tab === 'week' ? 'This Week' : 'Top Rated'}
                                </button>
                              ))}
                            </div>
                            {/* Results */}
                            {isTrendingLoading ? (
                              <div className="space-y-2">
                                {[1,2,3,4].map(i => (
                                  <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {trendingResults.map(renderMediaItem)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 md:p-8 border-t border-white/5 bg-surface shrink-0 flex items-center justify-end gap-4">
                <button
                  onClick={() => setIsCurationModalOpen(false)}
                  className="px-6 py-3 rounded-xl bg-white/5 text-white/60 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCuration}
                  disabled={isSaving}
                  className="px-8 py-3 rounded-xl bg-brand text-white font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,40,78,0.4)] transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Save Curation
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
