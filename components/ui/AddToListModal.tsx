'use client';

import React from 'react';
import Image from 'next/image';
import { useWatchlist } from '@/context/WatchlistContext';
import { X, CheckCircle2, List as ListIcon, Plus } from 'lucide-react';
import { notify as toast } from '@/lib/notify';

export default function AddToListModal() {
  const { 
    isModalOpen, 
    closeModal, 
    movieToAdd, 
    customWatchlists, 
    addToWatchlist, 
    addToCustomWatchlist,
    isInWatchlist
  } = useWatchlist();

  if (!isModalOpen || !movieToAdd) return null;

  const handleDefaultWatchlist = async () => {
    try {
      await addToWatchlist(movieToAdd);
      toast.success('Added to Default Watchlist!');
      closeModal();
    } catch (e) {
      console.error(e);
      toast.error('Failed to add to watchlist');
    }
  };

  const handleCustomList = async (listId: string) => {
    try {
      await addToCustomWatchlist(listId, movieToAdd);
      toast.success('Added to custom list!');
      closeModal();
    } catch (e) {
      console.error(e);
      toast.error('Failed to add to list');
    }
  };

  const alreadyInDefault = isInWatchlist(movieToAdd.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#111111]">
          <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand" />
            Add to List
          </h3>
          <button 
            onClick={closeModal}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Movie Info */}
        <div className="p-5 flex items-center gap-4 bg-white/[0.02]">
          <Image 
            src={movieToAdd.posterUrl} 
            alt={movieToAdd.title} 
            width={48}
            height={64}
            className="w-12 h-16 object-cover rounded-md border border-white/10"
            unoptimized // Since TMDB images are external
          />
          <div className="flex-1">
            <h4 className="text-white font-bold line-clamp-1">{movieToAdd.title}</h4>
            <p className="text-white/40 text-xs">{movieToAdd.year}</p>
          </div>
        </div>

        {/* Lists Selection */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Select a List</p>
          
          {/* Default Watchlist */}
          <button
            onClick={handleDefaultWatchlist}
            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand/30 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-brand" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Default Watchlist</p>
                <p className="text-[10px] text-white/40">Your main collection</p>
              </div>
            </div>
            {alreadyInDefault && (
              <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-1 rounded-md uppercase tracking-wider">
                Added
              </span>
            )}
          </button>

          {/* Custom Lists */}
          {customWatchlists.map(list => (
            <button
              key={list.id}
              onClick={() => handleCustomList(list.id)}
              className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <ListIcon className="w-4 h-4 text-white/60" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">{list.name}</p>
                </div>
              </div>
            </button>
          ))}
          
          {customWatchlists.length === 0 && (
            <div className="text-center p-4">
              <p className="text-xs text-white/40">You don't have any custom lists yet.</p>
              <p className="text-[10px] text-white/30 mt-1">Create one in your Profile Settings.</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
