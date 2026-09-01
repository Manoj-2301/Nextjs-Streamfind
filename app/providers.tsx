'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { RatingProvider } from '@/context/RatingContext';
import { WatchlistProvider } from '@/context/WatchlistContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RatingProvider>
          <WatchlistProvider>
            {children}
          </WatchlistProvider>
        </RatingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
