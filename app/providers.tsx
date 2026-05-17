'use client';

import { AuthProvider } from '@/context/AuthContext';
import { RatingProvider } from '@/context/RatingContext';
import { WatchlistProvider } from '@/context/WatchlistContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RatingProvider>
        <WatchlistProvider>
          {children}
        </WatchlistProvider>
      </RatingProvider>
    </AuthProvider>
  );
}
