'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

// Static seed posters (used while fetching, and as fallback)
// These are popular TMDB poster paths
const SEED_POSTERS = [
  '/1E5baAaEse26fej7uHcjOgEE2t2.jpg',
  '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
  '/pThyQovXQrw2m0s9x82twj48Jq4.jpg',
  '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
  '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
  '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
  '/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
  '/qdIMHd4sEoUi2KcZFLqo3aeCD1s.jpg',
  '/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg',
  '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
  '/oqP1qMxHT7MFFNQlQMlH15OEGmz.jpg',
  '/9yBVqNruk6Ykrwc32qRK3QKZe16.jpg',
  '/velWPhVMQeQKcxggNEU8YmIo52R.jpg',
  '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
  '/jtnfNzqZwN4E32FGGxx1YZaBWWf.jpg',
  '/lFDlCKMbydXy3Od4vxJcXmDqIkN.jpg',
  '/mOX5O6JjCaJbUTDA8iBfQqHOhFd.jpg',
  '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
  '/xkHIpzZEA7TMRZ0V8qd0JtjPCDa.jpg',
  '/3bhkrj58Vtu7enYsLebw4cMRBPN.jpg',
  '/9cqNxx0GxF0bAY0KrU6wCBi9Xha.jpg',
  '/gPbM0MK8CP8A174rmUwjinqMvtE.jpg',
  '/v1QQKq3M6g4LbF1dm0MkS3lKa6T.jpg',
];

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default React.memo(function AuthPosterBg() {
  const [posters, setPosters] = useState<string[]>(SEED_POSTERS);

  useEffect(() => {
    // Fetch real trending posters from our TMDB proxy
    fetch('/api/tmdb/trending/all/week')
      .then(r => r.json())
      .then(data => {
        if (data.results) {
          const paths = data.results
            .map((item: any) => item.poster_path)
            .filter(Boolean) as string[];
          if (paths.length >= 10) {
            // Combine with seeds to have plenty of variety
            setPosters([...paths, ...SEED_POSTERS].slice(0, 30));
          }
        }
      })
      .catch(() => {}); // silently fallback to seeds
  }, []);

  // Build 5 columns, each with repeated posters so the scroll is seamless
  const columns = chunk([...posters, ...posters], 6);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex gap-3 overflow-hidden pointer-events-none select-none"
      style={{ opacity: 0.35 }}
    >
      {columns.slice(0, 5).map((col, ci) => {
        const direction = ci % 2 === 0 ? 'scrollUp' : 'scrollDown';
        const duration = 28 + ci * 5; // stagger speed per column
        return (
          <div
            key={ci}
            className="flex-1 flex flex-col gap-3 min-w-0 h-max"
            style={{
              animation: `${direction} ${duration}s linear infinite`,
            }}
          >
            {/* Double the column so it loops seamlessly */}
            {[...col, ...col].map((poster, pi) => (
              <div key={`${ci}-${pi}`} className="relative w-full rounded-xl aspect-[2/3] overflow-hidden shrink-0">
                <Image
                  src={`https://image.tmdb.org/t/p/w300${poster}`}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 150px, 300px"
                  draggable={false}
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
                  unoptimized={true}
                />
              </div>
            ))}
          </div>
        );
      })}

      <style>{`
        @keyframes scrollUp {
          from { transform: translateY(0); }
          to   { transform: translateY(-50%); }
        }
        @keyframes scrollDown {
          from { transform: translateY(-50%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
});
