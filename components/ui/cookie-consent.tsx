'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if the user has already consented
    const consent = localStorage.getItem('streamfind_cookie_consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('streamfind_cookie_consent', 'accepted');
    setShow(false);
  };

  const handleReject = () => {
    localStorage.setItem('streamfind_cookie_consent', 'rejected');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[400px] bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 z-[99999] shadow-2xl"
        >
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-white font-black uppercase tracking-tight mb-2">Cookie Preferences</h3>
              <p className="text-white/60 text-xs leading-relaxed font-medium">
                We use cookies to personalize content, tailor recommendations, and analyze our traffic. By clicking &quot;Accept All&quot;, you consent to our use of cookies.
                Read our <Link href="/privacy" className="text-brand hover:underline">Privacy Policy</Link> to learn more.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReject}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-colors border border-white/5"
              >
                Reject All
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-[10px] font-black uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(255,40,78,0.3)]"
              >
                Accept All
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
