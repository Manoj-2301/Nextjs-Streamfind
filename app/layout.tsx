/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import type { Metadata } from 'next';
import { Space_Grotesk, Bebas_Neue } from 'next/font/google';
import './globals.css';
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css';



const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-accent',
});

import dynamic from 'next/dynamic';
import Providers from './providers';
import Navbar from '@/components/ui/navbar';
import Footer from './footer';
import MaintenanceGuard from '@/components/ui/maintenance-guard';
import { Toaster } from 'react-hot-toast';

const NewsletterPopupLoader = dynamic(() => import('@/components/ui/newsletter-popup-loader'));
const CookieConsent = dynamic(() => import('@/components/ui/cookie-consent'));
const SmoothScroll = dynamic(() => import('@/components/ui/smooth-scroll'));

export const metadata: Metadata = {
  title: 'StreamFind - Find Where to Stream Movies & Shows',
  description: 'Find exactly where your favorite movies are streaming. Compare Netflix, Hotstar, Prime Video and more in one place.',
  openGraph: {
    title: 'StreamFind - Find Where to Stream Movies & Shows',
    description: 'Find exactly where your favorite movies are streaming. Compare Netflix, Hotstar, Prime Video and more in one place.',
    type: 'website',
    url: 'https://streamfinds.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StreamFind - Find Where to Stream Movies & Shows',
    description: 'Find exactly where your favorite movies are streaming.',
    creator: 'StreamFind',
  },
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${bebasNeue.variable}`}>
      <head>
        {/* Preconnect to speed up critical resource domains */}
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://api.themoviedb.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.themoviedb.org" />
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
      </head>
      <body className="min-h-screen bg-background selection:bg-brand/30 selection:text-brand font-sans">
        <Providers>
          <MaintenanceGuard>
            <Navbar />
            <Toaster
              position="top-center"
              containerStyle={{ zIndex: 999999 }}
              toastOptions={{
                className: 'font-sans font-medium text-sm tracking-wide shadow-2xl',
                style: {
                  background: 'rgba(5, 5, 5, 0.85)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  padding: '16px 24px',
                  borderRadius: '24px',
                  boxShadow: '0 30px 60px -15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981', // Premium green
                    secondary: '#000',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ff284e',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <main className="pt-16">
              {children}
            </main>
            <Footer />
            <NewsletterPopupLoader />
            <CookieConsent />
            <SmoothScroll />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'WebSite',
                  name: 'StreamFind',
                  url: 'https://streamfinds.vercel.app',
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: 'https://streamfinds.vercel.app/search?q={search_term_string}',
                    'query-input': 'required name=search_term_string',
                  },
                }),
              }}
            />
          </MaintenanceGuard>
        </Providers>
      </body>
    </html>
  );
}
