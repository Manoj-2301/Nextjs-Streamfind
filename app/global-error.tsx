/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import { useEffect } from 'react';


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error Caught:', error);
  }, [error]);


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <html lang="en">
      <body className="bg-background min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface/50 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-xl">
          <div className="w-16 h-16 bg-brand/20 text-brand rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-3">Something went wrong</h2>
          <p className="text-white/60 text-sm font-medium leading-relaxed mb-8">
            We encountered an unexpected error while loading this page. Our team has been notified.
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-4 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand/90 transition-all shadow-[0_0_20px_rgba(255,40,78,0.3)]"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
