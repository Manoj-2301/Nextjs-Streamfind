import type { Metadata, ResolvingMetadata } from 'next';
import MovieDetails from '@/components/movie-details';
import { getMovieDetails } from '@/services/tmdbService';
import { Suspense } from 'react';
import JsonLd from '@/components/seo/JsonLd';
import { generateSemanticTitle, generateSemanticDescription, generateFaqSchema } from '@/lib/seo-engine';

export async function generateMetadata(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const id = Number(resolvedParams.id);
  const type = resolvedSearchParams.type as 'movie' | 'tv' | undefined;

  if (!id) {
    return {
      title: 'Not Found - StreamFind',
    };
  }

  try {
    const movie = await getMovieDetails(id, type);
    
    if (!movie) {
      return {
        title: 'Not Found - StreamFind',
      };
    }

    const title = generateSemanticTitle(movie);
    const description = generateSemanticDescription(movie);

    const previousImages = (await parent).openGraph?.images || [];
    const ogImage = movie.posterUrl || movie.backdropUrl || null;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://streamfinds.vercel.app/movie/${id}${type ? `?type=${type}` : ''}`,
        siteName: 'StreamFind',
        images: ogImage ? [
          {
            url: ogImage,
            width: 800,
            height: 1200,
            alt: `${movie.title} Poster`,
          },
          ...previousImages,
        ] : previousImages,
        locale: 'en_US',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ogImage ? [ogImage] : [],
      },
    };
  } catch (error) {
    return {
      title: 'StreamFind - Find Where to Stream Movies & Shows',
    };
  }
}

export default async function MovieDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const id = Number(resolvedParams.id);
  const type = resolvedSearchParams.type as 'movie' | 'tv' | undefined;

  let initialMovie = null;
  try {
    if (id) {
      initialMovie = await getMovieDetails(id, type);
    }
  } catch (error) {
    console.error('Error pre-fetching movie details on server:', error);
  }

  let jsonLd = null;
  let faqSchema = null;
  if (initialMovie) {
    const isTv = initialMovie.type === 'tv';
    faqSchema = generateFaqSchema(initialMovie);
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': isTv ? 'TVSeries' : 'Movie',
      name: initialMovie.title,
      image: initialMovie.posterUrl || initialMovie.backdropUrl || undefined,
      description: initialMovie.description,
      dateCreated: initialMovie.releaseDate,
      aggregateRating: initialMovie.rating ? {
        '@type': 'AggregateRating',
        ratingValue: initialMovie.rating,
        bestRating: '10',
        worstRating: '1',
        ratingCount: 1,
      } : undefined,
      actor: initialMovie.cast?.slice(0, 5).map((c: any) => ({
        '@type': 'Person',
        name: c.name,
      })),
      director: initialMovie.crew?.filter((c: any) => c.role === 'Director' || c.role === 'Directing').map((c: any) => ({
        '@type': 'Person',
        name: c.name,
      })),
      offers: initialMovie.platforms?.map((p: any) => ({
        '@type': 'Offer',
        url: p.watchUrl,
        name: p.name,
        category: 'subscription',
      })),
    };
  }

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      {faqSchema && <JsonLd data={faqSchema} />}
      <Suspense fallback={null}>
        <MovieDetails initialMovie={initialMovie || undefined} />
      </Suspense>
    </>
  );
}
