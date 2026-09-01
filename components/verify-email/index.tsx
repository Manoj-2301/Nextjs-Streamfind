/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { applyActionCode } from 'firebase/auth';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */
type VerifyStatus = 'loading' | 'success' | 'error' | 'invalid';


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function VerifyEmailPage() {
  const searchParams = useSearchParams();

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const [status, setStatus] = useState<VerifyStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    const oobCode = searchParams.get('oobCode');
    const mode = searchParams.get('mode');

    if (!oobCode || mode !== 'verifyEmail') {
      setStatus('invalid');
      return;
    }

    const verify = async () => {
      try {
        await applyActionCode(auth, oobCode);
        setStatus('success');
      } catch (err: any) {
        console.error('Email verification error:', err);
        if (err.code === 'auth/expired-action-code') {
          setErrorMessage('This verification link has expired. Please sign up again to get a new link.');
        } else if (err.code === 'auth/invalid-action-code') {
          setErrorMessage('This verification link is invalid or has already been used.');
        } else {
          setErrorMessage('Something went wrong verifying your email. Please try again.');
        }
        setStatus('error');
      }
    };

    verify();
  }, [searchParams]);


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
    >
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md"
      >
        <div className="glass-dark border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl text-center">

          {/* Loading */}
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">
                Verifying Your Email
              </h1>
              <p className="text-white/50 text-sm leading-relaxed">
                Please wait while we confirm your email address…
              </p>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-8 h-8 text-green-400" />
              </motion.div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">
                Email Verified!
              </h1>
              <p className="text-white/60 leading-relaxed mb-8">
                Your email has been successfully verified. You can now sign in to your{' '}
                <span className="text-brand font-bold">StreamFind</span> account.
              </p>
              <Link href="/auth" className="w-full">
                <Button
                  className="w-full py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] gap-2"
                >
                  Sign In Now <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </>
          )}

          {/* Error */}
          {(status === 'error' || status === 'invalid') && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <XCircle className="w-8 h-8 text-brand" />
              </motion.div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">
                Verification Failed
              </h1>
              <p className="text-white/60 leading-relaxed mb-8">
                {status === 'invalid'
                  ? 'This link is invalid. Please make sure you opened the correct verification email.'
                  : errorMessage}
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/auth" className="w-full">
                  <Button
                    className="w-full py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] gap-2"
                  >
                    <Mail className="w-5 h-5" /> Try Sign Up Again
                  </Button>
                </Link>
                <Link href="/" className="w-full">
                  <Button variant="ghost" className="w-full py-2">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </>
          )}

          {/* Brand footer */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <Link href="/" className="text-brand font-black tracking-tighter text-lg">
              STREAMFIND
            </Link>
            <p className="text-white/20 text-xs mt-1">Your universe of cinema</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
