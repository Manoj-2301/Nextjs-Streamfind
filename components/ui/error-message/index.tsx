/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import { motion } from 'motion/react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */
interface ErrorMessageProps {
  message?: string;
  onRetry?: () => void;
}


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function ErrorMessage({ 
  message = "Something went wrong while loading the data. Our team has been notified.", 
  onRetry 
}: ErrorMessageProps) {

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-8"
      >
        <AlertCircle className="w-10 h-10 text-red-500" />
      </motion.div>
      
      <h2 className="text-2xl md:text-4xl font-black text-white mb-4 uppercase tracking-tighter">Connection Lost</h2>
      <p className="text-white/60 max-w-md mx-auto mb-10 leading-relaxed font-light">
        {message}
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-brand px-6 py-2.5 rounded-md font-bold text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-brand/90 transition-all duration-300 hover:scale-105 active:scale-95 text-white"
          >
            <RefreshCcw className="w-4 h-4" /> RETRY LOAD
          </button>
        )}
        <Link href="/">
          <button
            className="glass px-6 py-2.5 rounded-md font-bold text-xs tracking-widest hover:bg-white/10 transition-all duration-300 hover:scale-105 text-white flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> BACK TO HOME
          </button>
        </Link>
      </div>
    </div>
  );
}
