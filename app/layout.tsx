import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Bebas_Neue } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

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
import Providers from './providers';
import Navbar from '@/components/ui/navbar';
import Footer from './footer';
import SmoothScroll from '@/components/ui/smooth-scroll';
import NewsletterPopup from '@/components/ui/newsletter-popup';
import MaintenanceGuard from '@/components/ui/maintenance-guard';

import { Toaster } from 'react-hot-toast';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${bebasNeue.variable}`}>
      <head>
        <link rel="preconnect" href="https://image.tmdb.org" />
      </head>
      <body className="min-h-screen bg-background selection:bg-brand/30 selection:text-brand font-sans">
        <Providers>
          <MaintenanceGuard>
            <SmoothScroll />
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
            <NewsletterPopup />
          </MaintenanceGuard>
        </Providers>
      </body>
    </html>
  );
}
