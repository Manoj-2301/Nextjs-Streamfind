'use client';

import Image, { ImageProps } from 'next/image';

interface OptimizedImageProps extends ImageProps {
  alt: string;
}

export function OptimizedImage({ 
  alt,
  priority = false, 
  className = '',
  ...props 
}: OptimizedImageProps) {
  return (
    <Image
      alt={alt}
      priority={priority}
      // Add a subtle fade-in ONLY if it's not a priority image (LCP element)
      className={`object-cover ${!priority ? 'transition-opacity duration-500' : ''} ${className}`}
      {...props}
    />
  );
}

export function OptimizedIframe({ src, title, className, ...props }: React.IframeHTMLAttributes<HTMLIFrameElement>) {
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
