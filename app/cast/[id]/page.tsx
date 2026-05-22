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
  let initialTotalPages = 0;
  let initialCurrentPage = 1;

  try {
    if (!isNaN(personId)) {
      const [castData, moviesData] = await Promise.all([
        getCastDetails(personId),
        getCastMovies(personId, 1),
      ]);
      initialCast = castData;
      initialMovies = moviesData.items;
      initialTotalPages = moviesData.totalPages;
      initialCurrentPage = moviesData.currentPage;
    }
  } catch (error) {
    console.error('Error pre-fetching cast details on server:', error);
  }

  return <CastDetails initialCast={initialCast} initialMovies={initialMovies} initialTotalPages={initialTotalPages} initialCurrentPage={initialCurrentPage} />;
}
