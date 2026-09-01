/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SEO_PLATFORMS } from '@/lib/seo-config';
import { browseDiscoverMovies } from '@/services/tmdbService';
import SeoMovieGrid from '@/components/ui/SeoMovieGrid';

export const revalidate = 86400; // 24 hours ISR


/*
 * ============================================================
 * TYPES
 * ============================================================
 */
interface PageProps {
  params: Promise<{ platform: string }>;
}

export async function generateStaticParams() {
  return SEO_PLATFORMS.map((platform) => ({
    platform: platform.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const platform = SEO_PLATFORMS.find(p => p.slug === resolvedParams.platform);
  
  if (!platform) {
    return { title: 'Not Found' };
  }

  const title = `New on ${platform.name} in India - Latest Movies & Shows`;
  const description = `Discover the newest movies and TV shows added to ${platform.name} in India. Browse our complete daily updated list of what's new.`;
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/new-on/${platform.slug}`,
    }
  };
}

export default async function NewOnPlatformPage({ params }: PageProps) {
  const resolvedParams = await params;
  const platform = SEO_PLATFORMS.find(p => p.slug === resolvedParams.platform);
  
  if (!platform) {
    notFound();
  }

  // TMDB Discover for new content on platform in India
  // Using tmdbService's existing browseDiscoverMovies by modifying it slightly or doing a direct fetch here
  // Wait, browseDiscoverMovies in tmdbService doesn't accept watch_providers easily without modifying it.
  // We'll write a custom fetch here or use standard fetch from tmdbService. Let's write a small custom fetch that uses the exact parameters needed.
  
  const BASE_URL = 'https://api.themoviedb.org/3';
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
  
  const movieRes = await fetch(`${BASE_URL}/discover/movie?api_key=${apiKey}&with_watch_providers=${platform.id}&watch_region=IN&sort_by=primary_release_date.desc&vote_count.gte=10`, { next: { revalidate: 86400 } });
  const tvRes = await fetch(`${BASE_URL}/discover/tv?api_key=${apiKey}&with_watch_providers=${platform.id}&watch_region=IN&sort_by=first_air_date.desc&vote_count.gte=10`, { next: { revalidate: 86400 } });
  
  const [movieData, tvData] = await Promise.all([
    movieRes.json().catch(() => ({ results: [] })),
    tvRes.json().catch(() => ({ results: [] }))
  ]);
  
  // Combine and sort by date
  const combined = [
    ...(movieData.results || []).map((m: any) => ({ ...m, type: 'movie' })),
    ...(tvData.results || []).map((t: any) => ({ ...t, type: 'tv' }))
  ].sort((a, b) => {
    const dateA = new Date(b.release_date || b.first_air_date || 0).getTime();
    const dateB = new Date(a.release_date || a.first_air_date || 0).getTime();
    return dateA - dateB;
  }).slice(0, 20);
  
  // Format to standard Movie object expected by Grid
  const formattedMovies = combined.map(item => ({
    id: item.id,
    title: item.title || item.name || 'Unknown',
    year: (item.release_date || item.first_air_date) ? new Date(item.release_date || item.first_air_date).getFullYear() : 0,
    rating: Number(item.vote_average?.toFixed(1) || 0),
    description: item.overview || '',
    posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://placehold.co/500x750?text=No+Poster',
    type: item.type,
    platforms: [{ name: platform.name, logo: '', watchUrl: `https://www.themoviedb.org/${item.type}/${item.id}` }]
  }));

  return (
    <div className="pt-24 min-h-screen">
      <SeoMovieGrid 
        movies={formattedMovies as any} 
        title={`New on ${platform.name}`} 
        description={`Discover the newest movies and TV shows added to ${platform.name} in India. Browse our complete daily updated list of what's new.`}
      />
    </div>
  );
}
