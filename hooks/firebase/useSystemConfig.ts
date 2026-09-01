/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import { useEffect, useState } from 'react';
import { subscribeToSystemConfig, SystemConfig } from '@/services/firebase/systemService';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */
interface UseSystemConfigResult {
  config: SystemConfig;
  isLoading: boolean;
}

/**
 * React hook for the global system config.
 * Wraps the real-time systemService listener with proper lifecycle and cleanup.
 */

/*
 * ============================================================
 * HOOK
 * ============================================================
 */
export function useSystemConfig(): UseSystemConfigResult {

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const [config, setConfig] = useState<SystemConfig>({
    maintenanceMode: false,
    flags: { heroAutoplay: false, share: true, analytics: true, realTime: false },
    achievements: [],
    customIcons: [],
  });
  const [isLoading, setIsLoading] = useState(true);


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    const unsubscribe = subscribeToSystemConfig(
      (nextConfig) => {
        setConfig(nextConfig);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { config, isLoading };
}
