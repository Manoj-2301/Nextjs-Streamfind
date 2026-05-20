import type { Metadata } from 'next';
import './globals.css';
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
    <html lang="en">
      <body className="min-h-screen bg-background selection:bg-brand/30 selection:text-brand">
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
