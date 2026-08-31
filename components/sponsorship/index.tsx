'use client';

import { motion } from 'motion/react';
import { Send, Globe, MessageSquare, Briefcase } from 'lucide-react';
import { useState, FormEvent } from 'react';

export default function Sponsorship() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-6 lg:px-12 max-w-4xl py-20"
    >
      

      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter">Partner With Us</h1>
        <p className="text-white/60 text-lg md:text-xl font-light">
          Scale your reach and acquire high-intent subscribers by featuring your platform on StreamFind.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-20">
        {[
          { icon: <Globe className="w-6 h-6" />, title: "Global Reach", desc: "Access a diverse audience of entertainment seekers." },
          { icon: <Briefcase className="w-6 h-6" />, title: "Brand Safety", desc: "Your content featured alongside premium cinema." },
          { icon: <MessageSquare className="w-6 h-6" />, title: "Direct Intent", desc: "Users ready to watch, directly to your checkout." }
        ].map((item, i) => (
          <div key={i} className="glass p-8 rounded-2xl border border-white/5 text-center">
            <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center text-brand mx-auto mb-6">
              {item.icon}
            </div>
            <h3 className="text-lg font-bold text-white mb-3 uppercase tracking-tight">{item.title}</h3>
            <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="glass-dark p-8 md:p-12 rounded-3xl border border-white/10 relative overflow-hidden">
        {submitted ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 mx-auto mb-8">
              <Send className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 uppercase">Message Sent!</h2>
            <p className="text-white/60">Our partnership team will get back to you within 24 hours.</p>
            <button 
              onClick={() => setSubmitted(false)}
              className="mt-8 text-brand font-bold uppercase tracking-widest text-xs hover:underline"
            >
              Send another inquiry
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="relative z-10">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Company Name</label>
                <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-brand transition-colors" placeholder="e.g. Netflix, Disney+" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Work Email</label>
                <input required type="email" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-brand transition-colors" placeholder="partnerships@company.com" />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Platform Details</label>
              <textarea required rows={4} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-brand transition-colors resize-none" placeholder="Tell us about your platform and goals..."></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-brand py-3 rounded-xl font-black text-[13px] tracking-[0.2em] text-white uppercase shadow-lg shadow-brand/20 transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              SUBMIT PARTNERSHIP INQUIRY
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
