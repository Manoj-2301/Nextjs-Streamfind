import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    if (!resolvedParams.path || resolvedParams.path.length === 0) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const path = resolvedParams.path.join('/');
    const searchParams = request.nextUrl.searchParams;

    // Append private API key (always fetch from server envs)
    const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 });
    }

    // Build target URL
    const query = new URLSearchParams(searchParams);
    query.delete('path');
    query.set('api_key', apiKey);
    const targetUrl = `https://api.themoviedb.org/3/${path}?${query.toString()}`;

    const response = await fetch(targetUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: `TMDB API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      return NextResponse.json({
        error: 'TMDB API returned a non-JSON response. Your network or ISP may be blocking or redirecting api.themoviedb.org.',
        details: text.slice(0, 150)
      }, { status: 502 });
    }

    let data;
    try {
      data = await response.json();
    } catch (e: any) {
      return NextResponse.json({
        error: 'Failed to parse TMDB response as JSON.',
        details: e.message
      }, { status: 502 });
    }

    // Cache the TMDB responses at Vercel's Edge layer using clean Cache-Control headers
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    headers.set('Content-Type', 'application/json');

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
