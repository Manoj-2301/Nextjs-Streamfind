'use client';

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { AlertTriangle, Hammer, Cog } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const db = getFirestore(app);
    const unsubscribe = onSnapshot(doc(db, 'system', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsMaintenance(!!data.maintenanceMode);
      } else {
        setIsMaintenance(false);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Failed to fetch system config:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Allow admin to bypass maintenance mode
  const isAdmin = user?.email === 'mt398401@gmail.com';
  const isAdminRoute = pathname?.startsWith('/admin');
  const isAuthRoute = pathname?.startsWith('/auth');

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isMaintenance && !isAdmin && !isAuthRoute) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center relative overflow-hidden">
        {/* Cinematic Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/5 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex flex-col items-center text-center max-w-2xl px-6"
        >
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-brand/10 rounded-full flex items-center justify-center border border-brand/20 shadow-[0_0_40px_rgba(255,40,78,0.2)]">
              <Cog className="w-12 h-12 text-brand animate-[spin_4s_linear_infinite]" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#080808] rounded-full flex items-center justify-center border border-white/10">
              <Hammer className="w-5 h-5 text-white/50" />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 font-display italic">
            Under <span className="text-brand">Maintenance</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/60 font-medium mb-12 max-w-lg leading-relaxed">
            We are currently upgrading the platform to bring you an even better cinematic experience. Please check back shortly!
          </p>

          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/40 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            System Upgrade in Progress
          </div>

          {isAdminRoute && (
            <div className="mt-12 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 max-w-md">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <strong>Admin Notice</strong>
              </div>
              <p>You must log in to the admin account to bypass this maintenance screen.</p>
            </div>
          )}

          <a href="/auth" className="mt-16 text-[10px] uppercase tracking-widest text-white/20 hover:text-brand transition-colors font-bold">
            Admin Login
          </a>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
