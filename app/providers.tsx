/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { RatingProvider } from '@/context/RatingContext';
import { WatchlistProvider } from '@/context/WatchlistContext';



/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function Providers({ children }: { children: React.ReactNode }) {

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes (ideal for mostly static TMDB data)
        gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes for fast back-navigation
        refetchOnWindowFocus: false,
        retry: 1, // Only retry once to avoid waterfall delays on failed TMDB endpoints
      },
    },
  }));


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
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
