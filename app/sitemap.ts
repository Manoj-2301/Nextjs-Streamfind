/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { MetadataRoute } from 'next';
import { SEO_PLATFORMS, SEO_GENRES } from '@/lib/seo-config';

/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  
  const sitemaps: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    }
  ];

  // 1. Add "New On" routes
  SEO_PLATFORMS.forEach((platform) => {
    sitemaps.push({
      url: `${baseUrl}/new-on/${platform.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    });
  });

  // 2. Add "Best Genre on Platform" routes
  SEO_GENRES.forEach((genre) => {
    SEO_PLATFORMS.forEach((platform) => {
      sitemaps.push({
        url: `${baseUrl}/best/${genre.slug}-${platform.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });
  });

  return sitemaps;
}
