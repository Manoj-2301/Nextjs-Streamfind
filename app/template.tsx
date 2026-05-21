'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div key={pathname}>
      {children}
    </div>
  );
}

