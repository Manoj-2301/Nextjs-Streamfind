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

import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'StreamFind - Find Where to Stream Movies & Shows',
  description: 'Find exactly where your favorite movies are streaming. Compare Netflix, Hotstar, Prime Video and more in one place.',
  openGraph: {
    title: 'StreamFind - Find Where to Stream Movies & Shows',
    description: 'Find exactly where your favorite movies are streaming. Compare Netflix, Hotstar, Prime Video and more in one place.',
    type: 'website',
    url: 'https://streamfind.app',
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
          <SmoothScroll />
          <Navbar />
          <Toaster 
            position="top-center"
            containerStyle={{ zIndex: 999999 }}
            toastOptions={{
              className: 'font-black tracking-widest uppercase text-xs shadow-2xl',
              style: {
                background: 'rgba(10, 10, 10, 0.95)',
                color: '#fff',
                border: '1px solid rgba(255, 40, 78, 0.3)',
                backdropFilter: 'blur(12px)',
                padding: '16px 24px',
                borderRadius: '100px',
                boxShadow: '0 20px 40px -10px rgba(255,40,78,0.15)',
              },
              success: {
                iconTheme: {
                  primary: '#ff284e',
                  secondary: '#fff',
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
        </Providers>
      </body>
    </html>
  );
}
