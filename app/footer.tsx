'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  if (pathname === '/profile' || pathname === '/admin') return null;
  return (
    <footer className="pt-17 pb-7 px-6 lg:px-12 border-t border-white/5 bg-surface/30">
      <div className="container mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-2">
          <h3 className="text-2xl font-display font-bold text-white mb-6">StreamFind</h3>
          <p className="text-white/60 max-w-sm mb-8 leading-relaxed">
            Find where to stream your favorite movies and shows across all major platforms.
            The ultimate aggregator for cinematic experiences.
          </p>
          <div className="flex gap-4">
            {["Twitter", "Instagram", "Discord"].map(social => (
              <a key={social} href="#" className="w-10 h-10 rounded-full glass flex items-center justify-center text-xs font-bold hover:bg-brand hover:text-black transition-all">
                {social[0]}
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6">Explore</h4>
          <ul className="space-y-4 text-white/60 text-sm">
            <li><Link href="/browse" className="hover:text-brand transition-colors">Popular Movies</Link></li>
            <li><Link href="/browse" className="hover:text-brand transition-colors">TV Shows</Link></li>
            <li><Link href="/browse" className="hover:text-brand transition-colors">New Arrivals</Link></li>
            <li><Link href="/browse" className="hover:text-brand transition-colors">Genres</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6">Support</h4>
          <ul className="space-y-4 text-white/60 text-sm">
            <li><Link href="/about" className="hover:text-brand transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-brand transition-colors">Contact</Link></li>
            <li><Link href="/privacy" className="hover:text-brand transition-colors">Privacy Policy</Link></li>
            <li><Link href="/sitemap-page" className="hover:text-brand transition-colors">Sitemap</Link></li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto max-w-7xl mt-20 pt-8 border-t border-white/5 text-center text-white/60 text-xs">
        © 2026 StreamFind AI. All Rights Reserved. Not affiliated with any streaming service.
      </div>
    </footer>
  );
}
