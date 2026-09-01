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
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
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
