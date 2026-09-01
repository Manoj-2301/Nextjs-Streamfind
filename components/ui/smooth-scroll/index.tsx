/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function SmoothScroll() {

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      wheelMultiplier: 1,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return null;
}
