'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Search, Play, Users, Globe, Menu as MenuIcon, X, Bookmark, LogIn, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { useWatchlist } from '@/context/WatchlistContext';
import { useAuth } from '@/context/AuthContext';
import GlobalSearch from '@/components/ui/global-search';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { watchlist } = useWatchlist();
  const { user, loginWithGoogle, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (pathname === '/admin' || pathname?.startsWith('/auth')) {
    return null;
  }

  if (pathname === '/profile' || pathname === '/auth/verify-email' || pathname === '/auth/reset-password' || pathname === '/auth/action') {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav border-b border-white/10 px-4 py-4 flex items-center justify-center h-16">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl min-[931px]:text-2xl font-black tracking-tighter text-brand">
            STREAMFIND
          </span>
        </Link>
      </nav>
    );
  }

  const getDesktopLinkClass = (path: string) =>
    `transition-colors ${pathname === path ? 'text-brand font-bold' : 'text-white/70 hover:text-brand'}`;

  const getMobileLinkClass = (path: string) =>
    `font-bold text-lg transition-colors ${pathname === path ? 'text-brand' : 'text-white/70 hover:text-brand'}`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080808]/70 backdrop-blur-2xl border-b border-white/5 px-4 min-[931px]:px-8 flex items-center justify-between h-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      <Link href="/" className="flex items-center gap-2 group">
        <span className="text-xl min-[931px]:text-2xl font-black tracking-tighter text-brand drop-shadow-[0_0_12px_rgba(255,40,78,0.5)] group-hover:drop-shadow-[0_0_20px_rgba(255,40,78,0.8)] group-hover:scale-105 transition-all origin-left">
          STREAMFIND
        </span>
      </Link>

      {/* Desktop Links - Premium Animated Pill */}
      <div className="hidden min-[931px]:flex items-center gap-1 p-1.5 bg-white/5 border border-white/5 rounded-2xl shadow-inner">
        {[
          { path: '/', label: 'Home' },
          { path: '/browse', label: 'Browse' },
          { path: '/watchlist', label: 'Watchlist', count: watchlist.length },
          { path: '/search', label: 'Search' },
        ].map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path} 
              className={`relative px-5 py-2 rounded-xl text-sm font-bold tracking-wide transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/50 hover:text-white/90'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="navbar-active-pill"
                  className="absolute inset-0 bg-white/10 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {item.label}
                {item.count && item.count > 0 ? (
                  <span className="text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-md font-black leading-none shadow-[0_0_10px_rgba(255,40,78,0.4)]">
                    {item.count}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-3 min-[931px]:gap-6">
        <div className="min-[931px]:hidden">
          <GlobalSearch />
        </div>

        <div className="hidden min-[931px]:flex items-center gap-4">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                aria-label="Toggle profile menu"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="group flex items-center gap-3 p-1 pr-5 rounded-full bg-gradient-to-r from-white/5 to-white/10 hover:from-brand/10 hover:to-rose-500/10 border border-white/5 hover:border-brand/30 transition-all duration-300 min-h-[44px] hover:scale-105 active:scale-95 shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
              >
                <div className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-tr from-brand via-rose-500 to-purple-600 shadow-[0_0_10px_rgba(255,40,78,0.3)] group-hover:shadow-[0_0_20px_rgba(255,40,78,0.6)] transition-all shrink-0">
                  {user.photoURL ? (
                    <Image src={user.photoURL} alt="Profile" width={36} height={36} className="w-full h-full rounded-full object-cover border border-[#0a0a0a]" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center border border-[#0a0a0a]">
                      <UserIcon className="w-4 h-4 text-white/80" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-black text-white/80 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all tracking-wide truncate max-w-[100px]">
                  {user.displayName ? user.displayName.split(' ')[0] : user.email?.split('@')[0]}
                </span>
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                    className="absolute top-full right-0 mt-4 w-64 bg-[#0a0a0a] border border-white/15 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)_inset] overflow-hidden flex flex-col z-50"
                  >
                    {/* Decorative Header Gradient */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand via-rose-500 to-purple-600" />
                    
                    {/* User Info Header */}
                    <div className="px-5 pt-6 pb-4 border-b border-white/10 bg-white/[0.02]">
                      <p className="text-white font-black text-lg truncate tracking-tight drop-shadow-md">
                        {user.displayName || 'Cinema Lover'}
                      </p>
                      <p className="text-white/60 text-xs truncate mt-0.5 font-semibold">
                        {user.email}
                      </p>
                    </div>

                    <div className="p-2 flex flex-col gap-1 bg-[#0a0a0a]">
                      {user?.email === 'mt398401@gmail.com' && (
                        <Link
                          href="/admin"
                          onClick={() => setShowProfileMenu(false)}
                          className="group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs text-white/90 transition-all font-bold uppercase tracking-widest overflow-hidden hover:bg-brand/10"
                        >
                          <Shield className="w-4 h-4 text-brand group-hover:scale-110 transition-transform relative z-10 drop-shadow-lg" /> 
                          <span className="relative z-10 text-white group-hover:text-brand drop-shadow-md">Director&apos;s Hub</span>
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs text-white/90 transition-all font-bold uppercase tracking-widest overflow-hidden hover:bg-white/10"
                      >
                        <UserIcon className="w-4 h-4 text-white/80 group-hover:text-white transition-colors relative z-10 drop-shadow-lg" /> 
                        <span className="relative z-10 text-white group-hover:text-white drop-shadow-md">My Profile</span>
                      </Link>
                      
                      <div className="border-t border-white/10 my-2 mx-2" />
                      
                      <button
                        onClick={() => {
                          logout();
                          setShowProfileMenu(false);
                        }}
                        className="group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs text-white/90 transition-all font-bold uppercase tracking-widest overflow-hidden hover:bg-red-500/15"
                      >
                        <LogOut className="w-4 h-4 text-red-500 group-hover:text-red-400 relative z-10 drop-shadow-lg" /> 
                        <span className="relative z-10 text-white group-hover:text-red-400 drop-shadow-md">Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/auth">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-brand to-rose-500 shadow-[0_0_20px_rgba(255,40,78,0.3)] text-white px-6 py-2.5 rounded-full text-xs font-black flex items-center gap-2 uppercase tracking-widest"
              >
                <LogIn className="w-4 h-4" /> SIGN IN
              </motion.button>
            </Link>
          )}

          {/* Hiding Partner With Us button for now */}
          {/* <Link href="/sponsorship">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="border border-white/30 px-3 min-[931px]:px-4 py-1.5 min-[931px]:py-2 rounded text-[10px] min-[931px]:text-xs font-semibold hover:bg-white hover:text-black transition-colors uppercase tracking-widest"
            >
              PARTNER WITH US
            </motion.button>
          </Link> */}
        </div>

        {/* Mobile menu toggle */}
        <button
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="min-[931px]:hidden text-white/70 hover:text-brand transition-colors p-3 min-h-[48px] min-w-[48px] flex items-center justify-center bg-white/5 rounded-full"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-0 right-0 glass-dark border-b border-white/10 p-6 flex flex-col gap-6 min-[931px]:hidden z-40"
          >
            {user && (
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                {user.photoURL ? (
                  <Image src={user.photoURL} alt="Profile" width={40} height={40} className="w-10 h-10 rounded-full border border-white/20 object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full border border-white/20 bg-white/5 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white/60" />
                  </div>
                )}
                <div>
                  <p className="text-white font-bold">{user.displayName || user.email?.split('@')[0]}</p>
                  <p className="text-white/40 text-xs">{user.email}</p>
                </div>
              </div>
            )}

            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className={getMobileLinkClass('/')}
            >
              Home
            </Link>
            <Link
              href="/browse"
              onClick={() => setIsMenuOpen(false)}
              className={getMobileLinkClass('/browse')}
            >
              Browse
            </Link>
            <Link
              href="/watchlist"
              onClick={() => setIsMenuOpen(false)}
              className={`${getMobileLinkClass('/watchlist')} flex items-center justify-between`}
            >
              Watchlist
              {watchlist.length > 0 && <span className="bg-brand text-white px-2 py-0.5 rounded-full text-xs font-black">{watchlist.length}</span>}
            </Link>
            <Link
              href="/search"
              onClick={() => setIsMenuOpen(false)}
              className={getMobileLinkClass('/search')}
            >
              Search
            </Link>

            <div className="pt-4 border-t border-white/10 flex flex-col gap-4">
              {user ? (
                <>
                  {user?.email === 'mt398401@gmail.com' && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full flex items-center gap-2 font-bold text-white/60 hover:text-brand"
                    >
                      <Shield className="w-5 h-5 text-brand" /> Director&apos;s Hub
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full flex items-center gap-2 font-bold text-white/60 hover:text-brand"
                  >
                    <UserIcon className="w-5 h-5" /> My Profile
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 font-bold text-white/60 hover:text-brand"
                  >
                    <LogOut className="w-5 h-5" /> Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full bg-brand p-3 rounded font-black text-white flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" /> SIGN IN
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
