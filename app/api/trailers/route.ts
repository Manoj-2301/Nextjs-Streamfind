import { NextRequest, NextResponse } from 'next/server';
import { fetchFromTmdb, extractAllTrailers } from '@/services/tmdbService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'movie';

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Fetch trailers for the requested movie/tv show with specific languages
    const data = await fetchFromTmdb(`${type}/${id}/videos?include_video_language=en,hi,te,ta,kn`);
    const availableTrailers = extractAllTrailers(data);
    
    return NextResponse.json({ availableTrailers });
  } catch (error: any) {
    console.error('Error fetching trailers:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch trailers' }, { status: 500 });
  }
}
