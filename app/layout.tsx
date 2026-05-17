import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import Navbar from '@/components/ui/navbar';
import Footer from './footer';
import SmoothScroll from '@/components/ui/smooth-scroll';

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
          <main className="pt-16">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
