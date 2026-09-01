'use client';

/*
 * ============================================================
 * BillingTab
 *
 * Displays payment security info, current billing plan,
 * upgrade CTA (Razorpay), invoices, and premium feature list.
 * ============================================================
 */

import React, { useState } from 'react';
import { ShieldCheck, Star, MonitorPlay, Sliders, Unlock, LayoutList } from 'lucide-react';
import { notify as toast } from '@/lib/notify';

interface BillingTabProps {
  user: any;
  billingPlan: string;
  renewalDate: string;
  invoices: any[];
}

export default function BillingTab({
  user,
  billingPlan,
  renewalDate,
  invoices,
}: BillingTabProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  /*
   * ============================================================
   * LAZY PAYMENT INITIALIZATION
   * ============================================================
   * Razorpay checkout script is loaded dynamically on-demand only when
   * the user triggers an upgrade inside BillingTab.
   * ============================================================
   */
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

  const handleUpgrade = async () => {
    if (!user) return toast.error('You must be logged in to upgrade');
    setIsUpgrading(true);

    try {
      const res = await loadRazorpay();
      if (!res) {
        toast.error('Failed to load payment gateway. Please check your connection.');
        setIsUpgrading(false);
        return;
      }

      const token = await user.getIdToken();
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'StreamFinds Premium',
        description: 'Upgrade to StreamFinds Premium',
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            toast.loading('Verifying payment...', { id: 'verify-payment' });
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
                amount: orderData.amount,
                currency: orderData.currency,
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              toast.success('Successfully upgraded to Premium!', { id: 'verify-payment' });
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (err: any) {
            toast.error(err.message, { id: 'verify-payment' });
          }
        },
        prefill: {
          name: user.displayName || '',
          email: user.email || '',
        },
        theme: {
          color: '#ff284e'
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      paymentObject.open();

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpgrading(false);
    }
  };
  return (
    <div className="space-y-8 animate-fadeIn relative">
      <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 blur-[60px] rounded-full pointer-events-none" />
        <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Payment &amp; Billing</h4>
        <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Manage your billing, saved methods, and premium subscriptions.</p>
      </div>

      {/* Payment Security */}
      <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl shadow-inner relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex-shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <ShieldCheck className="w-8 h-8 text-emerald-400 drop-shadow-md" />
          </div>
          <div>
            <h5 className="text-sm font-black text-white uppercase tracking-widest mb-2 drop-shadow-md">Payments secured by Razorpay</h5>
            <p className="text-[11px] text-white/60 leading-relaxed font-bold">
              Your card numbers, UPI IDs, and bank details are <span className="text-emerald-400 font-black drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]">never stored</span> on our servers or in your browser.
              All payment data is handled exclusively by Razorpay, which is PCI-DSS Level 1 compliant — the highest level of payment security certification.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400/80 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">PCI-DSS</span>
              <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400/80 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">256-BIT SSL</span>
              <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400/80 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">RBI COMPLIANT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Plan & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-brand/20 to-purple-500/10 border border-brand/30 rounded-[32px] p-8 md:p-10 relative overflow-hidden flex flex-col justify-center shadow-[inset_0_0_50px_rgba(240,171,252,0.1)]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand/30 blur-[80px] rounded-full pointer-events-none" />
          <p className="text-[11px] text-brand uppercase tracking-widest font-black relative z-10 drop-shadow-md">Current Plan</p>
          <p className="text-4xl font-display font-black text-white mt-2 uppercase italic tracking-tight relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
            {billingPlan === 'premium' ? 'Premium' : 'Free Tier'}
          </p>
          {billingPlan === 'premium' ? (
            <p className="text-[11px] text-white/80 mt-3 font-bold tracking-widest relative z-10">You have access to all premium features.</p>
          ) : (
            <p className="text-[11px] text-white/80 mt-3 font-bold tracking-widest relative z-10">Upgrade to Premium for full features.</p>
          )}
          {billingPlan !== 'premium' && (
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="mt-8 px-8 py-5 bg-gradient-to-r from-brand to-purple-500 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:shadow-[0_0_30px_rgba(240,171,252,0.5)] transition-all duration-300 hover:scale-105 disabled:opacity-50 relative z-10 border border-white/20"
            >
              {isUpgrading ? 'Loading...' : 'Upgrade Now'}
            </button>
          )}
        </div>

        <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl space-y-6 shadow-inner flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-[11px] text-white/50 uppercase font-black tracking-widest">Renewal Date</span>
              <span className="text-xs text-white font-bold tracking-wider">{billingPlan === 'premium' ? renewalDate : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-[11px] text-white/50 uppercase font-black tracking-widest">Billing History</span>
              <button className="text-[10px] text-brand hover:text-white transition-colors font-black uppercase tracking-widest bg-brand/10 hover:bg-brand/30 px-3 py-1.5 rounded-xl border border-brand/20">View All</button>
            </div>
            <div className="space-y-3">
              {invoices.length > 0 ? (
                invoices.slice(0, 1).map((inv, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/5 transition-colors">
                    <span className="text-[11px] text-white/50 font-mono tracking-widest">#{inv.id?.substring(0, 8)}</span>
                    <span className="text-[11px] text-white/90 font-black tracking-widest">₹{inv.amount}</span>
                    <button
                      onClick={async () => {
                        try {
                          toast.loading('Generating invoice…', { id: 'invoice-dl' });
                          const { generateInvoicePdf } = await import('@/lib/pdfGenerator');
                          const blob = generateInvoicePdf(inv, { displayName: user?.displayName, email: user?.email });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `StreamFind_Invoice_${inv.id?.substring(0, 12) || 'unknown'}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          toast.success('Invoice downloaded!', { id: 'invoice-dl' });
                        } catch (err) {
                          console.error('Invoice download error:', err);
                          toast.error('Failed to generate invoice.', { id: 'invoice-dl' });
                        }
                      }}
                      className="text-[10px] bg-white/10 hover:bg-brand/20 hover:text-brand border border-white/10 hover:border-brand/30 text-white px-4 py-2 rounded-xl uppercase font-black tracking-widest transition-all"
                    >Download</button>
                  </div>
                ))
              ) : (
                <div className="flex justify-center items-center py-8 border border-white/5 rounded-2xl bg-white/[0.02] border-dashed">
                  <span className="text-[11px] text-white/30 uppercase font-black tracking-widest">No invoices yet</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Features */}
      <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl mt-8 shadow-inner">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <Star className="w-5 h-5 drop-shadow-md" />
          </div>
          <h5 className="text-sm font-black uppercase tracking-widest text-white drop-shadow-md">Premium Features Included</h5>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { title: 'Ad-Free Experience', icon: MonitorPlay },
            { title: 'Advanced Filters', icon: Sliders },
            { title: 'Early Access', icon: Unlock },
            { title: 'Multiple Watchlists', icon: LayoutList }
          ].map((feat, i) => (
            <div key={i} className="p-6 rounded-[24px] bg-gradient-to-br from-white/5 to-transparent border border-white/10 text-center flex flex-col items-center gap-4 hover:-translate-y-2 transition-transform duration-500 hover:shadow-[0_10px_30px_rgba(255,255,255,0.05)] shadow-inner group">
              <div className="w-14 h-14 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-brand/20 transition-all duration-500 shadow-[inset_0_0_10px_rgba(240,171,252,0.1)]">
                <feat.icon className="w-6 h-6 text-brand drop-shadow-md" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors leading-relaxed">{feat.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
