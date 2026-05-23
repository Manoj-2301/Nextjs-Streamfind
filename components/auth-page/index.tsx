'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthPosterBg from './poster-bg';

type SignInStep = 'email' | 'password';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  // Two-step sign-in state
  const [signInStep, setSignInStep] = useState<SignInStep>('email');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const { user, loginWithEmail, signupWithEmail, loginWithGoogle, sendPasswordReset } = useAuth();
  const router = useRouter();

  // Redirect if already logged in (especially for mobile redirect logins)
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Auto-focus the active field on step change
  useEffect(() => {
    if (signInStep === 'email') {
      setTimeout(() => emailRef.current?.focus(), 100);
    } else {
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
  }, [signInStep]);

  // Reset to email step when toggling between sign-in and sign-up
  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setSignInStep('email');
    setError('');
    setSuccessMessage('');
    setName('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSignInStep('password');
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccessMessage('');
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSuccessMessage('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      let errorMsg = 'Failed to send password reset email.';
      if (err.code === 'auth/invalid-email') errorMsg = 'Invalid email address.';
      else if (err.code === 'auth/user-not-found') errorMsg = 'No user found with this email.';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        if (!name.trim()) { setError('Please enter your name.'); setIsSubmitting(false); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); setIsSubmitting(false); return; }
        await signupWithEmail(email, password, name);
        setVerificationSent(true);
      } else {
        await loginWithEmail(email, password);
        router.push('/');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMsg = 'An error occurred during authentication.';
      if (err.message?.includes('verify your email')) errorMsg = err.message;
      else if (err.code === 'auth/email-already-in-use') errorMsg = 'This email is already in use.';
      else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') errorMsg = 'Invalid email or password.';
      else if (err.code === 'auth/weak-password') errorMsg = 'Password should be at least 6 characters.';
      else if (err.code === 'auth/operation-not-allowed') errorMsg = 'This sign-in method is not enabled.';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
      router.push('/');
    } catch {
      setError('Failed to sign in with Google.');
    }
  };
  

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center px-4 overflow-y-auto bg-background"
    >
      {/* Animated poster background */}
      <AuthPosterBg />
      {/* Dark overlay so form stays readable */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      {/* Radial red glow behind the card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(229,9,20,0.15) 0%, transparent 70%)' }} />
      </div>
<button onClick={() => router.push('/')} className="absolute top-4 left-4 flex items-center gap-2 text-white/70 hover:text-white transition-colors">
  <ArrowLeft className="w-5 h-5" /> Home
</button>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md"
      >
        <div className="glass-dark border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">

          {/* ── Verification Sent Screen ── */}
          {verificationSent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-brand" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-4">Verify Your Email</h2>
              <p className="text-white/60 mb-8 leading-relaxed">
                We've sent a verification link to <strong className="text-white">{email}</strong>.
                Please check your inbox and click the link to activate your account.
              </p>
              <button
                onClick={() => { setVerificationSent(false); setIsSignUp(false); setPassword(''); setConfirmPassword(''); setSignInStep('email'); }}
                className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" /> Sign In Now
              </button>
            </div>

          ) : (
            <>
              
                

              {/* ── Header ── */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
                  {isSignUp ? 'Create Account' : signInStep === 'email' ? 'Welcome Back' : 'Enter Password'}
                </h1>
                <p className="text-white/50 text-sm">
                  {isSignUp
                    ? 'Join StreamFind to save your favorites.'
                    : signInStep === 'email'
                    ? 'Sign in to access your watchlist.'
                    : <span>Signing in as <span className="text-white font-semibold">{email}</span></span>
                  }
                </p>
              </div>

              {/* ── Alerts ── */}
              {successMessage && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-green-400" />
                  <p>{successMessage}</p>
                </motion.div>
              )}
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}

              {/* ── Sign Up Form (all fields at once) ── */}
              {isSignUp ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4" autoComplete="off">
                  {/* Name */}
                  <div className="relative group">
                    <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
                    <input
                      type="text" required placeholder="Full Name" value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="off"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
                    />
                  </div>
                  {/* Email */}
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
                    <input
                      type="email" required placeholder="Email Address" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="off"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
                    />
                  </div>
                  {/* Password */}
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'} required minLength={6}
                      placeholder="Password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Confirm Password */}
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'} required minLength={6}
                      placeholder="Confirm Password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button type="submit" disabled={isSubmitting}
                    className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-2.5 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-5 h-5" /> Sign Up</>}
                  </button>
                </form>

              ) : (
                /* ── Two-Step Sign In ── */
                <AnimatePresence mode="wait">
                  {signInStep === 'email' ? (
                    /* STEP 1: Email only */
                    <motion.form
                      key="step-email"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleEmailContinue}
                      className="flex flex-col gap-4"
                      autoComplete="off"
                    >
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
                        <input
                          ref={emailRef}
                          type="email"
                          required
                          placeholder="Email Address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="username"
                          id="signin-email"
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
                        />
                      </div>

                      <button type="submit"
                        className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-2.5 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
                      >
                        Continue
                      </button>
                    </motion.form>

                  ) : (
                    /* STEP 2: Password only */
                    <motion.form
                      key="step-password"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-4"
                    >
                      {/* Back to email step */}
                      <button
                        type="button"
                        onClick={() => { setSignInStep('email'); setError(''); setPassword(''); }}
                        className="flex items-center justify-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors mb-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Use a different email
                      </button>

                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
                        <input
                          ref={passwordRef}
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          id="signin-password"
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="text-right -mt-2">
                        <button type="button" onClick={handleForgotPassword}
                          className="text-xs text-brand hover:underline font-bold bg-transparent border-none cursor-pointer p-0"
                        >
                          Forgot Password?
                        </button>
                      </div>

                      <button type="submit" disabled={isSubmitting}
                        className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5" /> Sign In</>}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              )}

              {/* ── Google SSO ── */}
              <div className="my-8 flex items-center gap-4">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-white/30 text-xs font-bold uppercase tracking-widest">OR</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              <button onClick={handleGoogleLogin} type="button"
                className="w-full bg-white text-black hover:bg-white/90 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {/* ── Toggle Sign In / Sign Up ── */}
              <div className="mt-8 text-center text-sm text-white/50">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button onClick={handleToggleMode} className="text-brand font-bold hover:underline">
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
