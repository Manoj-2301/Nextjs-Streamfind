'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Lock, CheckCircle, XCircle, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';

type ResetStatus = 'loading' | 'form' | 'success' | 'error' | 'invalid';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<ResetStatus>('loading');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [oobCode, setOobCode] = useState('');

  useEffect(() => {
    const code = searchParams.get('oobCode');
    const mode = searchParams.get('mode');

    if (!code || mode !== 'resetPassword') {
      setStatus('invalid');
      return;
    }

    setOobCode(code);

    const verifyCode = async () => {
      try {
        const userEmail = await verifyPasswordResetCode(auth, code);
        setEmail(userEmail);
        setStatus('form');
      } catch (err: any) {
        console.error('Reset code verification error:', err);
        if (err.code === 'auth/expired-action-code') {
          setErrorMessage('This password reset link has expired. Please request a new one.');
        } else if (err.code === 'auth/invalid-action-code') {
          setErrorMessage('This password reset link is invalid or has already been used.');
        } else {
          setErrorMessage('Something went wrong. Please request a new password reset link.');
        }
        setStatus('error');
      }
    };

    verifyCode();
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus('success');
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/expired-action-code') {
        setErrorMessage('This link has expired. Please request a new password reset email.');
        setStatus('error');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Password is too weak. Please use at least 6 characters.');
      } else {
        setErrorMessage('Failed to reset password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

          {/* Loading */}
          {status === 'loading' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">
                Validating Link
              </h1>
              <p className="text-white/50 text-sm">Please wait…</p>
            </div>
          )}

          {/* Form */}
          {status === 'form' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Lock className="w-8 h-8 text-brand" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">
                  Reset Password
                </h1>
                <p className="text-white/50 text-sm leading-relaxed">
                  Set a new password for{' '}
                  <span className="text-white font-semibold">{email}</span>
                </p>
              </div>

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm"
                >
                  {errorMessage}
                </motion.div>
              )}

              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                {/* New Password */}
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-3 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-5 h-5" /> Set New Password
                    </>
                  )}
                </motion.button>
              </form>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-8 h-8 text-green-400" />
              </motion.div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">
                Password Updated!
              </h1>
              <p className="text-white/60 leading-relaxed mb-8">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <Link href="/auth">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Sign In Now <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>
          )}

          {/* Error / Invalid */}
          {(status === 'error' || status === 'invalid') && (
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <XCircle className="w-8 h-8 text-brand" />
              </motion.div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">
                Link Invalid
              </h1>
              <p className="text-white/60 leading-relaxed mb-8">
                {status === 'invalid'
                  ? 'This reset link is invalid. Please make sure you clicked the correct link from your email.'
                  : errorMessage}
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/auth">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    Request New Link <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </Link>
                <Link href="/">
                  <button className="w-full text-white/50 hover:text-white text-sm transition-colors py-2">
                    Back to Home
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* Brand footer */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
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
