import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SEO_PLATFORMS, SEO_GENRES } from '@/lib/seo-config';
import SeoMovieGrid from '@/components/ui/SeoMovieGrid';

export const revalidate = 86400; // 24 hours ISR

interface PageProps {
  params: Promise<{ slug: string }>; // The file is named [genre]-[platform]/page.tsx, wait we should name the folder [slug] to avoid complex parsing in App Router directory names or just keep it as `[slug]` folder.
}

// In Next.js app router, the folder name will be [slug] since multiple parameters in one segment `[genre]-[platform]` is technically supported as `[[...slug]]` or we can parse it from `[slug]`.
// Let's assume the folder name is `app/best/[slug]/page.tsx` for simplicity and we parse it here.

export async function generateStaticParams() {
  const paths: { slug: string }[] = [];
  
  SEO_GENRES.forEach((genre) => {
    SEO_PLATFORMS.forEach((platform) => {
      paths.push({
        slug: `${genre.slug}-${platform.slug}`,
      });
    });
  });
  
  return paths;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  
  let match = null;
  for (const genre of SEO_GENRES) {
    for (const platform of SEO_PLATFORMS) {
      if (`${genre.slug}-${platform.slug}` === slug) {
        match = { genre, platform };
        break;
      }
    }
  }
  
  if (!match) {
    return { title: 'Not Found' };
  }

  const { genre, platform } = match;

  const title = `Best ${genre.name} Movies & Shows on ${platform.name} in India`;
  const description = `Find the highest rated ${genre.name.toLowerCase()} movies and TV shows currently streaming on ${platform.name} in India.`;
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/best/${slug}`,
    }
  };
}

export default async function BestGenrePlatformPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  
  let match = null;
  for (const genre of SEO_GENRES) {
    for (const platform of SEO_PLATFORMS) {
      if (`${genre.slug}-${platform.slug}` === slug) {
        match = { genre, platform };
        break;
      }
    }
  }
  
  if (!match) {
    notFound();
  }

  const { genre, platform } = match;
  
  const BASE_URL = 'https://api.themoviedb.org/3';
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
  
  // Best movies by genre and provider
  const movieRes = await fetch(`${BASE_URL}/discover/movie?api_key=${apiKey}&with_genres=${genre.id}&with_watch_providers=${platform.id}&watch_region=IN&sort_by=vote_average.desc&vote_count.gte=100`, { next: { revalidate: 86400 } });
  const tvRes = await fetch(`${BASE_URL}/discover/tv?api_key=${apiKey}&with_genres=${genre.id}&with_watch_providers=${platform.id}&watch_region=IN&sort_by=vote_average.desc&vote_count.gte=100`, { next: { revalidate: 86400 } });
  
  const [movieData, tvData] = await Promise.all([
    movieRes.json().catch(() => ({ results: [] })),
    tvRes.json().catch(() => ({ results: [] }))
  ]);
  
  // Combine and sort by rating
  const combined = [
    ...(movieData.results || []).map((m: any) => ({ ...m, type: 'movie' })),
    ...(tvData.results || []).map((t: any) => ({ ...t, type: 'tv' }))
  ].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 20);
  
  // Format to standard Movie object expected by Grid
  const formattedMovies = combined.map(item => ({
    id: item.id,
    title: item.title || item.name || 'Unknown',
    year: (item.release_date || item.first_air_date) ? new Date(item.release_date || item.first_air_date).getFullYear() : 0,
    rating: Number(item.vote_average?.toFixed(1) || 0),
    description: item.overview || '',
    posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://placehold.co/500x750?text=No+Poster',
    type: item.type,
    genre: [genre.name], // Just inject the current genre name for UI display
    platforms: [{ name: platform.name, logo: '', watchUrl: `https://www.themoviedb.org/${item.type}/${item.id}` }]
  }));

  return (
    <div className="pt-24 min-h-screen">
      <SeoMovieGrid 
        movies={formattedMovies as any} 
        title={`Best ${genre.name} on ${platform.name}`} 
        description={`Find the highest rated ${genre.name.toLowerCase()} movies and TV shows currently streaming on ${platform.name} in India.`}
      />
    </div>
  );
}
