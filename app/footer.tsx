'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Mail, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getFirestore, doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

export default function Footer() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (pathname === '/profile' || pathname === '/admin' || pathname?.startsWith('/auth')) return null;

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
        await updateDoc(doc(db, 'users', user.uid), { newsletterOptIn: true });
      } else {
        await addDoc(collection(db, 'newsletter_subscribers'), {
          email: emailToUse,
          subscribedAt: new Date(),
          source: 'footer',
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
      setEmail('');
    } catch {
      toast.error('Could not subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="pt-10 pb-8 px-6 lg:px-12 bg-surface/30">
      <div className="container mx-auto max-w-7xl">

        {/* Newsletter Banner - Only visible on homepage */}
        {pathname === '/' && (
          <div className="relative mb-20 rounded-[40px] overflow-hidden p-8 sm:p-12"
            style={{ background: 'linear-gradient(135deg, #160508 0%, #0e0e0e 60%, #160508 100%)', border: '1px solid rgba(255,40,78,0.12)' }}>
            {/* Glow */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full pointer-events-none opacity-20"
              style={{ background: 'radial-gradient(ellipse, #ff284e 0%, transparent 70%)' }} />

            <div className="relative flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              {/* Text */}
              <div className="flex-1 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                  <div className="w-7 h-7 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/30">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">StreamFind Newsletter</span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tight text-white leading-none mb-3 font-display">
                  Get the Best <span className="text-brand">Picks</span> Weekly
                </h3>
                <p className="text-white/40 text-sm max-w-md mx-auto lg:mx-0">
                  Staff picks, hidden gems, trending movies and new arrivals — curated and delivered to your inbox every week.
                </p>
              </div>

              {/* Form */}
              <div className="w-full lg:w-auto lg:min-w-[380px]">
                {isSuccess ? (
                  <div className="flex items-center gap-3 p-5 rounded-2xl border border-brand/20 bg-brand/5">
                    <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
                    <div>
                      <p className="text-sm font-black text-white">You&apos;re subscribed!</p>
                      <p className="text-[11px] text-white/40 mt-0.5">Check your inbox for our first pick.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {user ? (
                      <div className="p-4 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-3">
                        <Mail className="w-4 h-4 text-brand shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Subscribing as</p>
                          <p className="text-sm font-bold text-white truncate">{user.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
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
                        <><Sparkles className="w-3.5 h-3.5" /> Subscribe Free</>
                      )}
                    </button>
                    <p className="text-center text-[10px] text-white/20">Unsubscribe anytime · No spam, ever.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
          <div className="col-span-2">
            <h3 className="text-2xl font-display font-bold text-white mb-4">StreamFind</h3>
            <p className="text-white/40 max-w-sm mb-8 leading-relaxed text-sm">
              Find where to stream your favorite movies and shows across all major platforms.
              The ultimate aggregator for cinematic experiences.
            </p>
            <div className="flex gap-3">
              {['T', 'I', 'D'].map((letter, i) => (
                <a key={i} href="#"
                  className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-xs font-black text-white/40 hover:bg-brand hover:text-white hover:border-brand transition-all">
                  {letter}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-5 text-sm uppercase tracking-widest">Explore</h4>
            <ul className="space-y-3 text-white/40 text-sm">
              <li><Link href="/browse" className="hover:text-brand transition-colors">Popular Movies</Link></li>
              <li><Link href="/browse" className="hover:text-brand transition-colors">TV Shows</Link></li>
              <li><Link href="/browse" className="hover:text-brand transition-colors">New Arrivals</Link></li>
              <li><Link href="/browse" className="hover:text-brand transition-colors">Genres</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-5 text-sm uppercase tracking-widest">Support</h4>
            <ul className="space-y-3 text-white/40 text-sm">
              <li><Link href="/about" className="hover:text-brand transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-brand transition-colors">Contact</Link></li>
              <li><Link href="/sitemap-page" className="hover:text-brand transition-colors">Sitemap</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-5 text-sm uppercase tracking-widest">Legal</h4>
            <ul className="space-y-3 text-white/40 text-sm">
              <li><Link href="/terms" className="hover:text-brand transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-brand transition-colors">Privacy Policy</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-brand transition-colors">Cookie Policy</Link></li>
              <li><Link href="/dmca" className="hover:text-brand transition-colors">DMCA Policy</Link></li>
              <li><Link href="/data-disclaimer" className="hover:text-brand transition-colors">Data Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/20 text-xs">
          <span>© 2026 StreamFind AI. All Rights Reserved.</span>
          <span className="hidden sm:block">Not affiliated with any streaming service.</span>
        </div>
      </div>
    </footer>
  );
}
