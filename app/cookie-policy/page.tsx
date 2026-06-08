import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | StreamFind',
  description: 'Cookie Policy for StreamFind.',
};

export default function CookiePolicyPage() {
  return (
    <div className="container mx-auto px-4 py-20 max-w-4xl text-white">
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-8">Cookie Policy</h1>
      <div className="prose prose-invert max-w-none space-y-6 text-white/70">
        <p>This Cookie Policy explains how StreamFind uses cookies and similar technologies to recognize you when you visit our website. It explains what these technologies are and why we use them, as well as your rights to control our use of them.</p>
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">What are cookies?</h2>
        <p>Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.</p>
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Why do we use cookies?</h2>
        <p>We use first and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our website to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our properties.</p>
        <p className="pt-8 text-sm text-white/40">Last updated: June 2026</p>
      </div>
    </div>
  );
}
