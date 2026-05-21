'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getFirestore, doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

const STORAGE_KEY = 'sf_newsletter_popup_date';

export default function NewsletterPopup() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Only show on home page
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== '/') return;
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem(STORAGE_KEY);
    if (lastShown === today) return; // already shown today

    // Delay popup by 3 seconds for better UX
    const timer = setTimeout(() => {
      setIsOpen(true);
      localStorage.setItem(STORAGE_KEY, today);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleSubscribe = async () => {
    const emailToUse = user?.email || email.trim();
    if (!emailToUse || !/\S+@\S+\.\S+/.test(emailToUse)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const db = getFirestore(app);

      if (user) {
        // Logged-in user: update their profile
        await updateDoc(doc(db, 'users', user.uid), {
          newsletterOptIn: true,
        });
      } else {
        // Guest: save to newsletter_subscribers collection
        await addDoc(collection(db, 'newsletter_subscribers'), {
          email: emailToUse,
          subscribedAt: new Date(),
          source: 'popup',
        });
      }

      // Fetch current curations and send welcome email
      try {
        const { getDocs } = await import('firebase/firestore');
        const curationsSnap = await getDocs(collection(db, 'featured_curations'));
        const curations = curationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => parseInt(a.slotNo) - parseInt(b.slotNo));
        if (curations.length > 0) {
          fetch('/api/notify/curations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ curations, emails: [emailToUse] })
          }).catch(e => console.error('Silent error sending welcome email:', e));
        }
      } catch (err) {
        console.error('Failed to send welcome email', err);
      }

      setIsSuccess(true);
      setTimeout(() => setIsOpen(false), 2500);
    } catch (err: any) {
      toast.error('Could not subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => setIsOpen(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-6"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #0e0e0e 0%, #160508 100%)', border: '1px solid rgba(255,40,78,0.15)' }}
          >
            {/* Glow blobs */}
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #ff284e 0%, transparent 70%)' }} />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #ff284e 0%, transparent 70%)' }} />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-8 sm:p-10">
              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-brand" />
                    </div>
                    <h3 className="text-xl font-black uppercase italic tracking-tight text-white mb-2 font-display">
                      You&apos;re In! 🎬
                    </h3>
                    <p className="text-white/50 text-sm">Get ready for curated picks in your inbox.</p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/30">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">StreamFind Newsletter</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tight text-white leading-none mb-3 font-display">
                      Never Miss a <span className="text-brand">Great Pick</span>
                    </h2>
                    <p className="text-white/50 text-sm leading-relaxed mb-8">
                      Get our editors&apos; hand-picked movies & shows delivered straight to your inbox. No spam, just cinema.
                    </p>

                    {/* Perks */}
                    <div className="flex flex-wrap gap-2 mb-8">
                      {['Staff Picks', 'New Arrivals', 'Hidden Gems', 'Weekly Trending'].map(perk => (
                        <span key={perk} className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/40 bg-white/5">
                          {perk}
                        </span>
                      ))}
                    </div>

                    {/* Input */}
                    {user ? (
                      <div className="p-4 rounded-2xl border border-brand/20 bg-brand/5 flex items-center gap-3 mb-4">
                        <Mail className="w-4 h-4 text-brand shrink-0" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand/60">Subscribing as</p>
                          <p className="text-sm font-bold text-white truncate">{user.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative mb-4">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
                          placeholder="your@email.com"
                          className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-brand/50 placeholder:text-white/20 font-medium"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleSubscribe}
                      disabled={isSubmitting}
                      className="w-full py-4 bg-brand text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:shadow-[0_0_30px_rgba(255,40,78,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Subscribe — It&apos;s Free
                        </>
                      )}
                    </button>
                    <p className="text-center text-[10px] text-white/20 mt-4 font-medium">
                      Unsubscribe anytime from your profile settings.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
