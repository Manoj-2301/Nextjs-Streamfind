'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  
  const { loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setIsSubmitting(false);
          return;
        }
        await signupWithEmail(email, password);
        setVerificationSent(true);
      } else {
        await loginWithEmail(email, password);
        router.push('/');
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      // Clean up firebase error message
      let errorMsg = "An error occurred during authentication.";
      if (err.code === 'auth/email-already-in-use') errorMsg = "This email is already in use.";
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') errorMsg = "Invalid email or password.";
      if (err.code === 'auth/weak-password') errorMsg = "Password should be at least 6 characters.";
      if (err.code === 'auth/operation-not-allowed') errorMsg = "This sign-in method is not enabled in Firebase.";
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
    } catch (err: any) {
      setError("Failed to sign in with Google.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4 relative overflow-hidden"
    >
      

      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md"
      >
        <div className="glass-dark border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
          
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
                onClick={() => {
                  setVerificationSent(false);
                  setIsSignUp(false);
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" /> Sign In Now
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h1>
                <p className="text-white/50 text-sm">
                  {isSignUp ? 'Join StreamFind to save your favorites.' : 'Sign in to access your watchlist.'}
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="space-y-4">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
                    <input 
                      type="email" 
                      required
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
                    <input 
                      type="password" 
                      required
                      minLength={6}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
                    />
                  </div>

                  {isSignUp && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }}
                      className="relative group overflow-hidden"
                    >
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-brand transition-colors" />
                      <input 
                        type="password" 
                        required={isSignUp}
                        minLength={6}
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-brand/50 transition-all"
                      />
                    </motion.div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-2.5 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                      {isSignUp ? 'Sign Up' : 'Sign In'}
                    </>
                  )}
                </button>
              </form>

              <div className="my-8 flex items-center gap-4">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-white/30 text-xs font-bold uppercase tracking-widest">OR</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              <button 
                onClick={handleGoogleLogin}
                type="button"
                className="w-full bg-white text-black hover:bg-white/90 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="mt-8 text-center text-sm text-white/50">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button 
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                  className="text-brand font-bold hover:underline"
                >
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
