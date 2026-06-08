import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | StreamFind',
  description: 'Terms of Service for StreamFind.',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-20 max-w-4xl text-white">
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-8">Terms of Service</h1>
      <div className="prose prose-invert max-w-none space-y-6 text-white/70">
        <p>Welcome to StreamFind. By accessing our website, you agree to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Use License</h2>
        <p>Permission is granted to temporarily download one copy of the materials (information or software) on StreamFind's website for personal, non-commercial transitory viewing only.</p>
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Disclaimer</h2>
        <p>The materials on StreamFind's website are provided on an 'as is' basis. StreamFind makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
        <p className="pt-8 text-sm text-white/40">Last updated: June 2026</p>
      </div>
    </div>
  );
}
