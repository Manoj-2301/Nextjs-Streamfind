'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { LayoutGrid, Film, User, Search, Settings, HelpCircle } from 'lucide-react';

export default function Sitemap() {
  const sections = [
    {
      title: "Core Platform",
      icon: LayoutGrid,
      links: [
        { name: "Home", path: "/" },
        { name: "Browse Movies", path: "/browse" },
        { name: "Search Engine", path: "/search" },
        { name: "Global Watchlist", path: "/watchlist" }
      ]
    },
    {
      title: "Content",
      icon: Film,
      links: [
        { name: "Popular Now", path: "/browse" },
        { name: "New Releases", path: "/browse" },
        { name: "Genre Explorer", path: "/browse" },
        { name: "Cast Directory", path: "/search" }
      ]
    },
    {
      title: "Company",
      icon: User,
      links: [
        { name: "About StreamFind", path: "/about" },
        { name: "Partner With Us", path: "/sponsorship" },
        { name: "Contact Support", path: "/contact" }
      ]
    },
    {
      title: "Legal",
      icon: Settings,
      links: [
        { name: "Privacy Policy", path: "/privacy" },
        { name: "Terms of Service", path: "/privacy" },
        { name: "Cookie Settings", path: "/privacy" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20 text-center"
        >
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic mb-6">Site <span className="text-brand">Index</span></h1>
          <p className="text-white/40 font-medium uppercase tracking-[0.3em] text-[10px]">A complete map of the StreamFind ecosystem</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sections.map((section, idx) => (
            <motion.div 
              key={section.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="p-8 rounded-[32px] bg-surface/30 border border-white/5 hover:bg-white/[0.03] transition-all group"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <section.icon className="w-5 h-5 text-brand" />
                </div>
                <h2 className="text-sm font-black text-white/80 uppercase tracking-widest">{section.title}</h2>
              </div>

              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link href={link.path} className="text-white/40 hover:text-brand text-sm font-medium transition-colors block">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 p-12 rounded-[40px] border border-dashed border-white/10 flex flex-col items-center text-center"
        >
          <HelpCircle className="w-8 h-8 text-white/20 mb-6" />
          <h3 className="text-white font-bold mb-2">Can't find what you're looking for?</h3>
          <p className="text-white/40 text-sm mb-8">Our AI Search can find any movie or person in our database.</p>
          <Link href="/search" className="bg-white text-black px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand transition-all">
             Open Search Engine
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
