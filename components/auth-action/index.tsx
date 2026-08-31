'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle, XCircle, Loader2, Mail,
  Lock, ArrowRight, Eye, EyeOff
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';

/* ─── Types ─────────────────────────────────────────────── */
type Mode = 'verifyEmail' | 'resetPassword' | 'unknown';
type Phase = 'loading' | 'form' | 'success' | 'error';

/* ─── Shared UI pieces ───────────────────────────────────── */
function BrandFooter() {
  return (
    <div className="mt-8 pt-6 border-t border-white/5 text-center">
      <Link href="/" className="text-brand font-black tracking-tighter text-lg hover:opacity-80 transition-opacity">
        STREAMFIND
      </Link>
      <p className="text-white/20 text-xs mt-1">Your universe of cinema</p>
    </div>
  );
}

function StatusIcon({ type }: { type: 'loading' | 'success' | 'error' }) {
  return (
    <motion.div
      initial={{ scale: type === 'loading' ? 1 : 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
        type === 'loading' ? 'bg-brand/20' :
        type === 'success' ? 'bg-green-500/20' :
        'bg-red-500/20'
      }`}
    >
      {type === 'loading' && <Loader2 className="w-8 h-8 text-brand animate-spin" />}
      {type === 'success' && <CheckCircle className="w-8 h-8 text-green-400" />}
      {type === 'error'   && <XCircle   className="w-8 h-8 text-brand" />}
    </motion.div>
  );
}

/* ─── Email Verify Section ───────────────────────────────── */
function VerifyEmailSection({ oobCode }: { oobCode: string }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    applyActionCode(auth, oobCode)
      .then(() => setPhase('success'))
      .catch((err) => {
        if (err.code === 'auth/expired-action-code') {
          setErrorMsg('This verification link has expired. Please sign up again to get a new one.');
        } else if (err.code === 'auth/invalid-action-code') {
          setErrorMsg('This link is invalid or has already been used.');
        } else {
          setErrorMsg('Something went wrong. Please try again.');
        }
        setPhase('error');
      });
  }, [oobCode]);

  return (
    <div className="text-center">
      {phase === 'loading' && (
        <>
          <StatusIcon type="loading" />
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">Verifying Your Email</h1>
          <p className="text-white/50 text-sm">Please wait a moment…</p>
        </>
      )}

      {phase === 'success' && (
        <>
          <StatusIcon type="success" />
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">Email Verified!</h1>
          <p className="text-white/60 leading-relaxed mb-8">
            Your email is confirmed. You can now sign in to your{' '}
            <span className="text-brand font-bold">StreamFind</span> account.
          </p>
          <Link href="/auth">
            <button
              className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center gap-2"
            >
              <Mail className="w-5 h-5" /> Sign In Now <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </>
      )}

      {phase === 'error' && (
        <>
          <StatusIcon type="error" />
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">Verification Failed</h1>
          <p className="text-white/60 leading-relaxed mb-8">{errorMsg}</p>
          <div className="flex flex-col gap-3">
            <Link href="/auth">
              <button
                className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" /> Back to Sign Up
              </button>
            </Link>
            <Link href="/">
              <button className="w-full text-white/40 hover:text-white text-sm transition-colors py-2">
                Go to Home
              </button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Reset Password Section ─────────────────────────────── */
function ResetPasswordSection({ oobCode }: { oobCode: string }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => { setEmail(userEmail); setPhase('form'); })
      .catch((err) => {
        if (err.code === 'auth/expired-action-code') {
          setErrorMsg('This reset link has expired. Please request a new one.');
        } else {
          setErrorMsg('This link is invalid or has already been used.');
        }
        setPhase('error');
      });
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setPhase('success');
    } catch (err: any) {
      if (err.code === 'auth/expired-action-code') {
        setErrorMsg('This link has expired. Please request a new reset email.');
        setPhase('error');
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('Password is too weak. Use at least 6 characters.');
      } else {
        setErrorMsg('Failed to reset password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {phase === 'loading' && (
        <div className="text-center">
          <StatusIcon type="loading" />
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">Validating Link</h1>
          <p className="text-white/50 text-sm">Please wait…</p>
        </div>
      )}

      {phase === 'form' && (
        <>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <Lock className="w-8 h-8 text-brand" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Reset Password</h1>
            <p className="text-white/50 text-sm">
              New password for <span className="text-white font-semibold">{email}</span>
            </p>
          </div>

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm"
            >
              {errorMsg}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
              <input
                type={showNew ? 'text' : 'password'} required minLength={6}
                placeholder="New Password" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
              <input
                type={showConfirm ? 'text' : 'password'} required minLength={6}
                placeholder="Confirm New Password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit" disabled={isSubmitting}
              className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
            >
              {isSubmitting
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <><Lock className="w-5 h-5" /> Set New Password</>}
            </button>
          </form>
        </>
      )}

      {phase === 'success' && (
        <div className="text-center">
          <StatusIcon type="success" />
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">Password Updated!</h1>
          <p className="text-white/60 leading-relaxed mb-8">
            Your password has been reset. You can now sign in with your new password.
          </p>
          <Link href="/auth">
            <button
              className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center gap-2"
            >
              Sign In Now <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      )}

      {phase === 'error' && (
        <div className="text-center">
          <StatusIcon type="error" />
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">Link Expired</h1>
          <p className="text-white/60 leading-relaxed mb-8">{errorMsg}</p>
          <div className="flex flex-col gap-3">
            <Link href="/auth">
              <button
                className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center gap-2"
              >
                Request New Link <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/">
              <button className="w-full text-white/40 hover:text-white text-sm transition-colors py-2">
                Go to Home
              </button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function AuthActionPage() {
  const searchParams = useSearchParams();
  const mode   = (searchParams.get('mode') ?? 'unknown') as Mode;
  const oobCode = searchParams.get('oobCode') ?? '';

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
        <div className="glass-dark border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl">

          {/* Unknown / missing mode */}
          {(mode === 'unknown' || !oobCode) && (
            <div className="text-center">
              <StatusIcon type="error" />
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">Invalid Link</h1>
              <p className="text-white/60 leading-relaxed mb-8">
                This link is invalid or missing required parameters. Please use the link from your email.
              </p>
              <Link href="/">
                <button
                  className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                >
                  Go to Home
                </button>
              </Link>
            </div>
          )}

          {mode === 'verifyEmail'   && oobCode && <VerifyEmailSection oobCode={oobCode} />}
          {mode === 'resetPassword' && oobCode && <ResetPasswordSection oobCode={oobCode} />}

          <BrandFooter />
        </div>
      </motion.div>
    </motion.div>
  );
}
