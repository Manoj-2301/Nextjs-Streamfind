import CastDetails from '@/components/cast-details';
import { getCastDetails, getCastMovies } from '@/services/tmdbService';

export default async function CastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const idStr = resolvedParams.id;
  const personId = parseInt(idStr);

  let initialCast = undefined;
  let initialMovies = undefined;

  try {
    if (!isNaN(personId)) {
      const [castData, moviesData] = await Promise.all([
        getCastDetails(personId),
        getCastMovies(personId),
      ]);
      initialCast = castData;
      initialMovies = moviesData;
    }
  } catch (error) {
    console.error('Error pre-fetching cast details on server:', error);
  }

  return <CastDetails initialCast={initialCast} initialMovies={initialMovies} />;
}
