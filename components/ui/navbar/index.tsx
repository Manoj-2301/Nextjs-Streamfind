'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Play, Users, Globe, Menu as MenuIcon, X, Bookmark, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useWatchlist } from '@/context/WatchlistContext';
import { useAuth } from '@/context/AuthContext';
import GlobalSearch from '@/components/ui/global-search';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { watchlist } = useWatchlist();
  const { user, loginWithGoogle, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const pathname = usePathname();

  if (pathname === '/profile') {
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
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav border-b border-white/10 px-4 min-[931px]:px-8 py-4 flex items-center justify-between h-16">
      <Link href="/" className="flex items-center gap-2 group">
        <span className="text-xl min-[931px]:text-2xl font-black tracking-tighter text-brand">
          STREAMFIND
        </span>
      </Link>

      {/* Desktop Links */}
      <div className="hidden min-[931px]:flex items-center gap-8 text-sm font-medium text-white/70">
        <Link href="/" className={getDesktopLinkClass('/')}>Home</Link>
        <Link href="/browse" className={getDesktopLinkClass('/browse')}>Browse</Link>
        <Link href="/watchlist" className={`${getDesktopLinkClass('/watchlist')} flex items-center gap-2`}>
          Watchlist {watchlist.length > 0 && <span className="text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full font-black leading-none">{watchlist.length}</span>}
        </Link>
        <Link href="/search" className={`${getDesktopLinkClass('/search')} flex items-center gap-2`}>
          Search
        </Link>
      </div>

      <div className="flex items-center gap-3 min-[931px]:gap-6">
        <div className="min-[931px]:hidden">
          <GlobalSearch />
        </div>

        <div className="hidden min-[931px]:flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 border border-white/10 p-1 pr-3 rounded-full hover:bg-white/5 transition-colors"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-white/20" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-white/60" />
                  </div>
                )}
                <span className="text-xs font-bold text-white/80">{user.displayName ? user.displayName.split(' ')[0] : user.email?.split('@')[0]}</span>
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-48 glass-dark border border-white/10 rounded-lg p-2 shadow-2xl flex flex-col gap-1"
                  >
                    <Link
                      href="/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-white/70 hover:bg-white/10 hover:text-brand transition-all font-semibold"
                    >
                      <UserIcon className="w-4 h-4" /> My Profile
                    </Link>
                    <div className="border-t border-white/5 my-1" />
                    <button
                      onClick={() => {
                        logout();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-white/70 hover:bg-white/10 hover:text-brand transition-all font-semibold"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/auth">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-brand text-white px-4 py-2 rounded text-xs font-black flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" /> SIGN IN
              </motion.button>
            </Link>
          )}

          <Link href="/sponsorship">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="border border-white/30 px-3 min-[931px]:px-4 py-1.5 min-[931px]:py-2 rounded text-[10px] min-[931px]:text-xs font-semibold hover:bg-white hover:text-black transition-colors uppercase tracking-widest"
            >
              PARTNER WITH US
            </motion.button>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="min-[931px]:hidden text-white hover:text-brand transition-colors"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
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
                  <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border border-white/20" referrerPolicy="no-referrer" />
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
