/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <div key={pathname}>
      {children}
    </div>
  );
}

