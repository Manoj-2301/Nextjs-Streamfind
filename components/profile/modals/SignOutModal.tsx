import React from 'react';
import { motion } from 'motion/react';
import { X, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  logout: () => Promise<void>;
}

export default function SignOutModal({ isOpen, onClose, logout }: SignOutModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideHeader
      className="p-6 sm:rounded-[32px] max-w-sm"
    >
      <div className="absolute top-0 right-0 p-6 z-10">
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
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1 py-4 text-[10px]"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                onClose();
                await logout();
                router.push('/');
              }}
              className="flex-1 py-4 text-[10px]"
            >
              Yes, Leave
            </Button>
          </div>
        </div>
    </Modal>
  );
}
