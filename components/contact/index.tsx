'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, MessageSquare, Send, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';

export default function Contact() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const db = getFirestore(app);
      // 1. Save to Firestore
      await addDoc(collection(db, 'contact_queries'), {
        ...formData,
        status: 'Unread',
        createdAt: serverTimestamp()
      });

      // 2. Trigger Admin Notification Email
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      toast.success('Your message has been sent successfully!');
      setFormData({ firstName: '', lastName: '', email: '', message: '' });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-20"
        >
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-none mb-6">
            Get in <span className="text-brand">Touch</span>
          </h1>
          <p className="text-white/40 font-medium tracking-[0.2em] uppercase text-xs">
            Questions, feedback, or just want to talk movies? We&apos;re listening.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="space-y-8">
            {[
              { icon: Mail, label: "Email Us", info: "support@streamfind.ai" },
              { icon: MessageSquare, label: "Discord", info: "Join our Community" },
              { icon: MapPin, label: "Office", info: "Silicon Valley, CA" }
            ].map((item, idx) => (
              <motion.div 
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-2xl bg-surface/30 border border-white/5 flex items-center gap-6 group hover:bg-brand/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <item.icon className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-white/30 text-[10px] uppercase font-black mb-1">{item.label}</p>
                  <p className="text-white font-bold">{item.info}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-2">
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface/30 border border-white/5 p-8 md:p-12 rounded-[32px] space-y-6"
              onSubmit={handleSubmit}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-white/40 px-2">First Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-white/10" 
                    placeholder="John" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-white/40 px-2">Last Name</label>
                  <input 
                    type="text" 
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-white/10" 
                    placeholder="Wick" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-white/40 px-2">Email Address *</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-white/10" 
                  placeholder="john@continental.com" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-white/40 px-2">Message *</label>
                <textarea 
                  required
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white h-40 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-white/10 resize-none" 
                  placeholder="Tell us everything..."
                ></textarea>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
                type="submit"
                className="w-full bg-brand text-white py-5 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(var(--color-brand),0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> SENDING...</>
                ) : (
                  <><Send className="w-4 h-4" /> SEND MESSAGE</>
                )}
              </motion.button>
            </motion.form>
          </div>
        </div>
      </div>
    </div>
  );
}
