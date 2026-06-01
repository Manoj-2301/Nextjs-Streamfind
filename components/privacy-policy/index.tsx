'use client';

import { motion } from 'motion/react';
import { ShieldCheck, Eye, Lock, RefreshCcw } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-brand/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-brand" />
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic">Privacy <span className="text-brand">Policy</span></h1>
          </div>
          <p className="text-white/40 font-medium leading-relaxed">
            Last Updated: May 17, 2026. Your privacy is paramount to us at StreamFind. 
            This document outlines how we collect, protect, and use your information.
          </p>
        </motion.div>

        <div className="space-y-16">
          {[
            {
              icon: Eye,
              title: "Information Collection",
              content: "We collect minimal data to provide our service. This includes your email (if signed in), your movie preferences (Watchlists and Ratings) to improve recommendations, and basic usage logs to ensure platform stability. We Never sell your personal data."
            },
            {
              icon: Lock,
              title: "Security & Data Sharing",
              content: "All data is encrypted in transit and at rest using industry-standard protocols. We utilize secure OAuth providers like Google to ensure your credentials never touch our servers. We use the TMDB API to fetch movie metadata, but we do not share your personally identifiable information (PII) with TMDB."
            },
            {
              icon: ShieldCheck,
              title: "Your Data Rights (GDPR/CCPA)",
              content: "You have the absolute right to access, rectify, or erase your personal data (Article 17 GDPR). You can delete your account and all associated records (reviews, watchlists, profile data) instantly from your Profile Settings. If you need a raw export of your data, contact our support."
            },
            {
              icon: RefreshCcw,
              title: "Dynamic Updates",
              content: "Our policy evolves as our features do. We will notify users of major changes via email or an announcement. By continuing to use StreamFind, you agree to the latest version of this policy."
            }
          ].map((section, idx) => (
            <motion.section 
              key={section.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="flex items-center gap-4 mb-6">
                 <section.icon className="w-5 h-5 text-brand opacity-50 group-hover:opacity-100 transition-opacity" />
                 <h2 className="text-2xl font-black text-white uppercase tracking-tight">{section.title}</h2>
              </div>
              <p className="text-white/40 leading-[1.8] font-medium bg-surface/20 p-8 rounded-[24px] border border-white/5 group-hover:border-white/10 transition-colors">
                {section.content}
              </p>
            </motion.section>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-32 p-12 bg-white/[0.02] border border-white/5 rounded-[40px] text-center"
        >
          <p className="text-white/20 text-sm mb-6">Have questions about your data?</p>
          <button className="text-white font-black uppercase tracking-widest text-xs border-b border-brand pb-1 hover:text-brand transition-colors">
             Contact our Data Team →
          </button>
        </motion.div>
      </div>
    </div>
  );
}
