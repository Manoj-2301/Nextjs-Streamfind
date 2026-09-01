'use client';

/*
 * ============================================================
 * HelpTab
 *
 * FAQ section, contact support (WhatsApp / Email), support ticket
 * submission form with inquiry type selector, and legal links.
 * ============================================================
 */

import React, { useState } from 'react';
import { MessageSquare, Mail, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { notify as toast } from '@/lib/notify';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { submitSupportTicket } from '@/services/firebase/accountService';

interface HelpTabProps {
  user: any;
}

export default function HelpTab({ user }: HelpTabProps) {
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  return (
    <div className="space-y-8 animate-fadeIn relative">
      <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />
        <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tight drop-shadow-md">Help &amp; Support</h4>
        <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-2">Get assistance, contact support, and view legal documents.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FAQ */}
        <div className="space-y-8">
          <div className="space-y-6">
            <h5 className="text-[11px] font-black uppercase tracking-widest text-white/50 drop-shadow-sm pl-2">Frequently Asked Questions</h5>
            <div className="space-y-3">
              {[
                { q: 'What is StreamFinds?', a: 'A universal streaming aggregator that tracks what to watch and where.' },
                { q: 'How does availability tracking work?', a: 'We sync daily with global databases to ensure accurate streaming platforms.' },
                { q: 'Why can\'t I play content directly?', a: 'StreamFinds redirects you to the official platform where the content is hosted.' },
                { q: 'How often is data updated?', a: 'Pricing, availability, and trending metrics are refreshed every 24 hours.' }
              ].map((faq, i) => (
                <div key={i} className="p-6 rounded-[24px] bg-[#0a0a0a]/50 border border-white/10 backdrop-blur-xl hover:bg-white/5 transition-all duration-300 shadow-inner group">
                  <p className="text-[11px] font-black text-white uppercase tracking-wider group-hover:text-blue-400 transition-colors drop-shadow-sm">{faq.q}</p>
                  <p className="text-[10px] text-white/50 mt-2 leading-relaxed font-bold tracking-wide">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="space-y-6">
          <h5 className="text-[11px] font-black uppercase tracking-widest text-white/50 drop-shadow-sm pl-2">Contact Support</h5>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <a href="https://api.whatsapp.com/send?phone=918639563091&text=Hi%20StreamFinds%20team!%20I%20need%20some%20help." target="_blank" rel="noreferrer" className="p-6 rounded-[24px] bg-gradient-to-br from-[#25D366]/10 to-transparent border border-[#25D366]/20 flex flex-col items-center gap-4 hover:-translate-y-2 transition-all duration-500 group shadow-[0_5px_15px_rgba(37,211,102,0.1)] hover:shadow-[0_10px_30px_rgba(37,211,102,0.2)]">
              <div className="w-14 h-14 bg-[#25D366]/10 border border-[#25D366]/30 rounded-[20px] flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-inner">
                <MessageSquare className="w-6 h-6 text-[#25D366] drop-shadow-md" />
              </div>
              <span className="text-[10px] font-black uppercase text-[#25D366] tracking-widest">WhatsApp Chat</span>
            </a>
            <a href="mailto:crestteeofficial@gmail.com" className="p-6 rounded-[24px] bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 flex flex-col items-center gap-4 hover:-translate-y-2 transition-all duration-500 group shadow-[0_5px_15px_rgba(59,130,246,0.1)] hover:shadow-[0_10px_30px_rgba(59,130,246,0.2)]">
              <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/30 rounded-[20px] flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-inner">
                <Mail className="w-6 h-6 text-blue-400 drop-shadow-md" />
              </div>
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Email Support</span>
            </a>
          </div>

          {/* Support Ticket Form */}
          <div className="p-8 rounded-[32px] bg-[#0a0a0a]/50 border border-white/10 backdrop-blur-xl shadow-inner space-y-6 relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand/10 blur-[40px] rounded-full pointer-events-none" />
            <div className="space-y-2 relative z-10">
              <label className="text-[10px] font-black text-white/50 uppercase tracking-widest pl-1">Inquiry Type</label>
              <CustomSelect
                value={supportMessage.startsWith('Type:') ? supportMessage.split(':')[1] : 'Submit Ticket'}
                onChange={(val) => setSupportMessage(`Type:${val}`)}
                options={[
                  { value: 'Submit Ticket', label: 'Submit Ticket' },
                  { value: 'Feedback', label: 'Feedback' },
                  { value: 'Report Wrong Availability', label: 'Report Wrong Availability' },
                  { value: 'Report Missing Show/Movie', label: 'Report Missing Show/Movie' },
                  { value: 'Suggest New Streaming Service', label: 'Suggest New Streaming Service' },
                  { value: 'Feature Requests', label: 'Feature Requests' }
                ]}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-bold tracking-widest text-white shadow-inner focus-within:border-brand/50 transition-colors"
              />
            </div>
            <div className="space-y-2 relative z-10">
              <label className="text-[10px] font-black text-white/50 uppercase tracking-widest pl-1">Your Message</label>
              <textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-bold tracking-widest text-white placeholder-white/20 focus:outline-none focus:border-brand/50 h-32 resize-none shadow-inner transition-colors"
                placeholder="Describe your issue or request..."
              />
            </div>
            <button
              onClick={async () => {
                if (!supportMessage) return toast.error('Please enter a message');
                setIsSubmittingSupport(true);
                try {
                  const type = supportMessage.startsWith('Type:') ? supportMessage.split(':')[1].split('\n')[0] : 'Submit Ticket';
                  const msg = supportMessage.includes('\n') ? supportMessage.substring(supportMessage.indexOf('\n') + 1).trim() : supportMessage;
                  await submitSupportTicket({
                    uid: user?.uid || 'anonymous',
                    email: user?.email || '',
                    type: type,
                    message: msg || supportMessage
                  });
                  toast.success('Ticket submitted successfully!');
                  setSupportMessage('');
                } catch (e) {
                  console.error('Failed to submit ticket', e);
                  toast.error('Failed to submit ticket. Please try again later.');
                } finally {
                  setIsSubmittingSupport(false);
                }
              }}
              disabled={isSubmittingSupport}
              className="w-full py-4 bg-brand hover:bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all duration-300 disabled:opacity-50 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(240,171,252,0.4)] relative z-10"
            >
              {isSubmittingSupport ? 'Sending...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>

      {/* Legal */}
      <div className="space-y-6 pt-10 mt-10 border-t border-white/10 w-full">
        <h5 className="text-[11px] font-black uppercase tracking-widest text-white/50 drop-shadow-sm pl-2">Legal &amp; Policies</h5>
        <div className="flex flex-wrap gap-3">
          {[
            { title: 'Terms of Service', path: '/terms' },
            { title: 'Privacy Policy', path: '/privacy' },
            { title: 'Cookie Policy', path: '/cookie-policy' },
            { title: 'DMCA Policy', path: '/dmca' },
            { title: 'Data Disclaimer', path: '/data-disclaimer' }
          ].map((doc, i) => (
            <Link
              key={i}
              href={doc.path}
              className="px-5 py-3 bg-[#0a0a0a]/50 border border-white/10 rounded-full text-[10px] sm:text-[11px] font-black uppercase text-white/60 hover:text-white hover:border-brand/40 hover:bg-brand/5 transition-all duration-300 flex items-center gap-2 group backdrop-blur-xl"
            >
              <span className="tracking-widest">{doc.title}</span>
              <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:text-brand transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
