import React from 'react';
import { motion } from 'motion/react';
import { X, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  logout: () => Promise<void>;
}

export default function SignOutModal({ isOpen, onClose, logout }: SignOutModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm bg-surface/90 border border-white/10 rounded-[32px] p-6 shadow-2xl overflow-hidden bg-black/90"
      >
        <div className="absolute top-0 right-0 p-6">
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center gap-4 pt-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <LogOut className="w-8 h-8 text-red-500" />
          </div>
          
          <div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Sign Out</h3>
            <p className="text-sm text-white/50 font-medium mt-2">Are you sure you want to end your current session?</p>
          </div>

          <div className="w-full flex gap-3 mt-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                onClose();
                await logout();
                router.push('/');
              }}
              className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-red-500/20"
            >
              Yes, Leave
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
