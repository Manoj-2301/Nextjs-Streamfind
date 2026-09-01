/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Zap, Shield, Crown, ArrowRight, Loader2, Star, Play, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import Link from 'next/link';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect to get started and explore basic features.',
    icon: Play,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/20',
    glow: 'shadow-[0_0_15px_rgba(156,163,175,0.1)]',
    features: [
      'Basic search and discovery',
      'Watchlist up to 20 items',
      'Standard recommendations',
      'Community reviews',
    ],
    buttonText: 'Current Plan',
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 500,
    description: 'Ad-free experience with advanced filters and more.',
    icon: Zap,
    color: 'text-brand',
    bgColor: 'bg-brand/10',
    borderColor: 'border-brand/30',
    glow: 'shadow-[0_0_30px_rgba(240,171,252,0.2)]',
    features: [
      'Everything in Free',
      'Ad-Free Experience',
      'Advanced Filters & Sorting',
      'Unlimited Watchlists',
      'Priority Customer Support',
    ],
    buttonText: 'Upgrade to Premium',
    popular: true,
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: 1000,
    description: 'The complete cinematic experience with early access.',
    icon: Crown,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
    glow: 'shadow-[0_0_30px_rgba(250,204,21,0.2)]',
    features: [
      'Everything in Premium',
      'Early Access to New Features',
      'Exclusive Beta Testing',
      'Dedicated Account Manager',
      '4K & HDR Badges on Profile',
    ],
    buttonText: 'Get Ultimate',
    popular: false,
  }
];


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function Pricing() {

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const { user } = useAuth();
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };


  /*
   * ============================================================
   * EVENT HANDLERS
   * ============================================================
   */
  const handleUpgrade = async (planId: string) => {
    if (!user) {
      toast.error('Please sign in to upgrade.');
      router.push('/auth');
      return;
    }

    if (planId === 'free') {
      toast.success('You are already on the free plan.');
      return;
    }

    setLoadingTier(planId);
    try {
      const token = await user.getIdToken();
      const res = await loadRazorpay();
      if (!res) {
        toast.error('Failed to load Razorpay. Check your connection.');
        return;
      }

      // Create Order
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: planId })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '', 
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'StreamFind',
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan Upgrade`,
        order_id: orderData.id,
        handler: async function (response: any) {
          const verifyToast = toast.loading('Verifying payment...');
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');
            
            toast.dismiss(verifyToast);
            toast.success(`Welcome to the ${planId} tier!`);
            router.push('/profile?tab=payment');
          } catch (err: any) {
            toast.dismiss(verifyToast);
            toast.error(err.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: user.displayName || '',
          email: user.email || '',
        },
        theme: { color: '#f0abfc' },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        toast.error(response.error.description || 'Payment failed');
      });
      paymentObject.open();

    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoadingTier(null);
    }
  };


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-display font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-6">
              Choose Your <span className="text-brand">Universe</span>
            </h1>
            <p className="text-white/60 text-sm md:text-base leading-relaxed tracking-wide">
              Unlock the full potential of your streaming experience. Whether you're a casual viewer or a hardcore cinephile, we have a plan designed just for you.
            </p>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TIERS.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative flex flex-col p-8 rounded-3xl backdrop-blur-xl transition-all duration-300 border ${tier.bgColor} ${tier.borderColor} ${tier.glow} ${tier.popular ? 'md:-translate-y-4 md:scale-105 z-10' : ''} hover:-translate-y-2`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand text-black font-black uppercase tracking-widest text-[10px] px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(240,171,252,0.5)]">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${tier.color}`}>
                  <tier.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-widest text-white">{tier.name}</h3>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-display font-black italic tracking-tighter text-white">
                    ₹{tier.price}
                  </span>
                  <span className="text-sm font-bold text-white/40 mb-1 uppercase tracking-widest">/mo</span>
                </div>
                <p className="text-xs text-white/50 mt-3 font-medium leading-relaxed">{tier.description}</p>
              </div>

              <div className="flex-grow space-y-4 mb-8">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${tier.color}`} />
                    <span className="text-xs text-white/70 font-medium tracking-wide">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(tier.id)}
                disabled={loadingTier !== null || (tier.id === 'free')}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 ${
                  tier.popular 
                    ? 'bg-brand text-black hover:bg-white hover:scale-105 shadow-[0_0_20px_rgba(240,171,252,0.4)] disabled:opacity-70 disabled:hover:scale-100' 
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10 disabled:opacity-50'
                }`}
              >
                {loadingTier === tier.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {tier.buttonText}
                    {tier.id !== 'free' && <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>
        
        {/* Safe Payment Banner */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left backdrop-blur-sm"
        >
          <div className="p-3 bg-emerald-500/10 rounded-2xl shrink-0">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-1">Secure & Encrypted</h4>
            <p className="text-[10px] text-white/60 font-medium leading-relaxed tracking-wide">
              All payments are securely processed by Razorpay. We do not store your credit card or UPI details. Cancel anytime from your profile settings.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
