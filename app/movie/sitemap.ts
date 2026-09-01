/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { MetadataRoute } from 'next';
import { fetchFromTmdb } from '@/services/tmdbService';

const TOTAL_PAGES = 500; // max pages allowed by TMDB discover
const PAGES_PER_CHUNK = 10;
const TOTAL_CHUNKS = Math.ceil(TOTAL_PAGES / PAGES_PER_CHUNK);

export async function generateSitemaps() {
  return Array.from({ length: TOTAL_CHUNKS }, (_, i) => ({
    id: i.toString(),
  }));
}

export default async function sitemap(
  props: { id: Promise<string> } | { id: string }
): Promise<MetadataRoute.Sitemap> {
  const idValue = props.id instanceof Promise ? await props.id : props.id;
  const chunkIndex = parseInt(idValue as string, 10);
  
  if (isNaN(chunkIndex)) return [];

  const startPage = chunkIndex * PAGES_PER_CHUNK + 1;
  const endPage = startPage + PAGES_PER_CHUNK - 1;

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

  const fetchPromises = [];
  for (let page = startPage; page <= endPage; page++) {
    if (page > TOTAL_PAGES) break;
    
    fetchPromises.push(
      fetchFromTmdb(`discover/movie?sort_by=popularity.desc&page=${page}`, { next: { revalidate: 86400 } })
        .catch(() => ({ results: [] }))
    );
  }

  const responses = await Promise.all(fetchPromises);
  const sitemapEntries: MetadataRoute.Sitemap = [];

  responses.forEach((res) => {
    if (res && res.results) {
      res.results.forEach((movie: any) => {
        if (movie.id) {
          sitemapEntries.push({
            url: `${baseUrl}/movie/${movie.id}`,
            lastModified: movie.release_date ? new Date(movie.release_date) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      });
    }
  });

  return sitemapEntries;
}
