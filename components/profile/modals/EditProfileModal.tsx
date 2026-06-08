import React from 'react';
import { motion } from 'motion/react';
import { X, Check, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalError: string;
  modalSuccess: string;
  editDisplayName: string | undefined;
  setEditDisplayName: (val: string) => void;
  newEmail: string | undefined;
  setNewEmail: (val: string) => void;
  bioInput: string | undefined;
  setBioInput: (val: string) => void;
  editFrameId: string | undefined;
  setEditFrameId: (val: any) => void;
  frames: any[];
  isSaving: boolean;
  handleSaveProfile: () => void;
  profile: any;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  modalError,
  modalSuccess,
  editDisplayName,
  setEditDisplayName,
  newEmail,
  setNewEmail,
  bioInput,
  setBioInput,
  editFrameId,
  setEditFrameId,
  frames,
  isSaving,
  handleSaveProfile,
  profile
}: EditProfileModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 md:p-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#050505] border border-white/10 rounded-[2rem] sm:rounded-[40px] w-full max-w-2xl max-h-full relative z-10 overflow-y-auto no-scrollbar shadow-2xl"
      >
        <div className="p-6 sm:p-8 md:p-12 space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black uppercase italic tracking-tight">Edit <span className="text-brand">Identity</span></h2>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          {modalError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <X className="w-4 h-4 shrink-0 text-red-500" />
              <p>{modalError}</p>
            </div>
          )}

          {modalSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-green-500" />
              <p>{modalSuccess}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/40 px-2 tracking-widest">Display Name</label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:border-brand outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/40 px-2 tracking-widest">Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:border-brand outline-none transition-all"
              />
              <p className="text-[10px] text-white/30 px-2 mt-1">Changing this requires a verification email.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/40 px-2 tracking-widest">Cinematic Bio</label>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white/80 h-32 outline-none focus:border-brand resize-none font-medium"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-white/40 px-2 tracking-widest">Avatar Frame</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {frames.map((f) => {
                  const isPremiumFrame = f.id !== 'none';
                  const isLocked = isPremiumFrame && profile.plan !== 'premium';
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        if (isLocked) {
                          toast.error("Upgrade to Premium to unlock!"); router.push('/profile?tab=payment');
                          return;
                        }
                        setEditFrameId(f.id);
                      }}
                      className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-tight transition-all relative ${
                        editFrameId === f.id 
                          ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20' 
                          : 'bg-black/20 border-white/5 text-white/40 hover:border-white/20'
                      } ${isLocked ? 'opacity-60 cursor-not-allowed grayscale' : ''}`}
                    >
                      {f.name}
                      {isLocked && (
                        <Lock className="w-3 h-3 absolute top-2 right-2 text-white/40" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex-1 bg-white text-black py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand hover:text-white transition-all disabled:opacity-50"
            >
              {isSaving ? 'Synchronizing...' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="px-8 bg-white/5 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
