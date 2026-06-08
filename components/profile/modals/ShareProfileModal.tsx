import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function ShareProfileModal({ isOpen, onClose, user }: ShareProfileModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const copyPublicLink = () => {
    if (typeof window === 'undefined') return;
    const link = `${window.location.origin}/profile?uid=${user?.uid}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

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
        className="bg-[#050505] border border-white/10 rounded-[2rem] sm:rounded-[40px] w-full max-w-md max-h-full relative z-10 overflow-y-auto no-scrollbar shadow-2xl"
      >
        <div className="p-6 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Share <span className="text-brand">Profile</span></h2>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-white/60 font-medium">
            Showcase your curated masterpieces, genre analytics, and cinematic level to the world!
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Facebook */}
            <button
              onClick={() => {
                if (typeof window === 'undefined' || !user) return;
                const shareUrl = `${window.location.origin}/profile?uid=${user.uid}`;
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
              }}
              className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10 group transition-all"
            >
              <div className="w-12 h-12 bg-[#1877F2]/10 rounded-2xl flex items-center justify-center text-[#1877F2] group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">Facebook</span>
            </button>

            {/* Twitter / X */}
            <button
              onClick={() => {
                if (typeof window === 'undefined' || !user) return;
                const shareUrl = `${window.location.origin}/profile?uid=${user.uid}`;
                window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check out my cinema profile on StreamFind!")}`, '_blank');
              }}
              className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-white/40 hover:bg-white/5 group transition-all"
            >
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">Twitter / X</span>
            </button>

            {/* WhatsApp */}
            <button
              onClick={() => {
                if (typeof window === 'undefined' || !user) return;
                const shareUrl = `${window.location.origin}/profile?uid=${user.uid}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent("Check out my cinema profile on StreamFind! " + shareUrl)}`, '_blank');
              }}
              className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-[#25D366]/40 hover:bg-[#25D366]/10 group transition-all"
            >
              <div className="w-12 h-12 bg-[#25D366]/10 rounded-2xl flex items-center justify-center text-[#25D366] group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 fill-[#25D366]" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.62.962 3.21 1.6 5.358 1.601 5.48-.001 9.938-4.46 9.94-9.94.002-2.656-1.03-5.153-2.903-7.027-1.874-1.874-4.37-2.905-7.029-2.907-5.485 0-9.944 4.46-9.946 9.942-.001 2.152.562 4.253 1.633 6.079L1.87 20.3l4.777-1.146zm11.302-5.4c-.29-.145-1.711-.844-1.976-.94-.265-.096-.458-.145-.65.145-.192.291-.745.94-.913 1.132-.168.192-.337.218-.627.072-.29-.145-1.223-.45-2.33-1.439-.861-.767-1.443-1.716-1.611-2.007-.168-.29-.018-.447.127-.591.13-.13.29-.34.435-.509.145-.168.193-.29.29-.484.096-.193.048-.363-.024-.509-.072-.145-.65-1.564-.89-2.146-.233-.56-.47-.484-.65-.494-.168-.008-.362-.01-.555-.01-.193 0-.506.072-.77.362-.265.291-1.012.99-1.012 2.416 0 1.426 1.037 2.802 1.18 2.995.145.193 2.041 3.116 4.945 4.373.69.299 1.23.478 1.65.612.693.22 1.325.19 1.825.115.557-.083 1.711-.699 1.953-1.376.24-.678.24-1.26.168-1.376-.073-.116-.265-.193-.555-.337z" />
                </svg>
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">WhatsApp</span>
            </button>

            {/* Instagram */}
            <button
              onClick={() => {
                copyPublicLink();
                toast.success("📸 Link Copied!\n\nInstagram doesn't support sharing links directly. We've copied your profile link to your clipboard so you can paste it in your bio or stories!", { duration: 6000 });
              }}
              className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-[#ee2a7b]/40 hover:bg-gradient-to-tr hover:from-[#f9ce34]/10 hover:via-[#ee2a7b]/10 hover:to-[#6228d7]/10 group transition-all"
            >
              <div className="w-12 h-12 bg-gradient-to-tr from-[#f9ce34]/20 via-[#ee2a7b]/20 to-[#6228d7]/20 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-[#ee2a7b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                </svg>
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">Instagram</span>
            </button>
          </div>

          {/* Direct Link Copier */}
          <div className="space-y-2 pt-4 border-t border-white/5">
            <label className="text-[10px] font-black uppercase text-white/40 px-2 tracking-widest">Shareable Profile Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' && user ? `${window.location.origin}/profile?uid=${user.uid}` : ''}
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/60 font-semibold focus:outline-none"
              />
              <button
                onClick={copyPublicLink}
                className="px-6 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all shrink-0 flex items-center gap-2"
              >
                {copiedLink ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                  </svg>
                )}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
