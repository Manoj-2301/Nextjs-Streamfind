'use client';

import Image, { ImageProps } from 'next/image';
import LiteYouTubeEmbed from 'react-lite-youtube-embed';

interface OptimizedImageProps extends ImageProps {
  alt: string;
}

export function OptimizedImage({ 
  alt,
  priority = false, 
  className = '',
  src,
  ...props 
}: OptimizedImageProps) {
  // If the image is from TMDB, we can bypass Next.js image optimization
  // to avoid huge TTFB delays on the Edge/Server, and rely on TMDB's fast CDN.
  const isTmdb = typeof src === 'string' && src.includes('tmdb.org');

  return (
    <Image
      src={src}
      alt={alt}
      priority={priority}
      unoptimized={isTmdb} // Bypasses slow next/image processing for LCP image
      // Add a subtle fade-in ONLY if it's not a priority image (LCP element)
      className={`object-cover ${!priority ? 'transition-opacity duration-500' : ''} ${className}`}
      {...props}
    />
  );
}

export function OptimizedIframe({ src, title, className, ...props }: React.IframeHTMLAttributes<HTMLIFrameElement>) {
  if (src && typeof src === 'string' && src.includes('youtube') && src.includes('embed/')) {
    const match = src.match(/embed\/([^?]+)/);
    if (match && match[1]) {
      const videoId = match[1];
      const params = src.split('?')[1] || '';
      return (
        <div className={`w-full h-full [&>article]:w-full [&>article]:h-full ${className || ''}`}>
          <LiteYouTubeEmbed
            id={videoId}
            title={title || 'YouTube Video'}
            params={params}
            noCookie={src.includes('-nocookie')}
          />
        </div>
      );
    }
  }

  return (
    <iframe
      src={src}
      title={title}
      className={`w-full h-full ${className || ''}`}
      loading="lazy"
      {...props}
    />
  );
}
