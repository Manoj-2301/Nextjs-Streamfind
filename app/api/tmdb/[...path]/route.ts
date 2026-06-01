import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    if (!resolvedParams.path || resolvedParams.path.length === 0) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Security: Validate CORS Origin
    const origin = request.headers.get('origin');
    if (origin) {
      const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
      const isProductionOrigin = origin === 'https://streamfinds.vercel.app';
      
      if (process.env.NODE_ENV === 'production' && !isProductionOrigin) {
        return NextResponse.json({ error: 'Forbidden: Invalid CORS origin' }, { status: 403 });
      } else if (process.env.NODE_ENV !== 'production') {
        const isLan = origin.startsWith('http://192.168.') || origin.startsWith('http://10.');
        if (!isLocalhost && !isProductionOrigin && !isLan) {
          // Allow LAN access for testing on mobile devices
          return NextResponse.json({ error: 'Forbidden: Invalid CORS origin' }, { status: 403 });
        }
      }
    }

    const path = resolvedParams.path.join('/');

    // Security: Only allow specific TMDB endpoint prefixes to prevent proxy abuse
    const allowedPaths = [
      /^movie\//,
      /^tv\//,
      /^search\//,
      /^discover\//,
      /^trending\//,
      /^person\//,
      /^genre\//,
      /^watch\//,
      /^watch\/providers\//
    ];

    const isAllowed = allowedPaths.some(regex => regex.test(path));
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: Endpoint not allowed by proxy' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Append private API key (always fetch from server envs)
    const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 });
    }

    // Build target URL without duplicate params or Next.js route segments
    const query = new URLSearchParams();
    searchParams.forEach((value, key) => {
      // Exclude framework-injected dynamic route segment keys like 'path'
      if (key !== 'path') {
        if (key === 'page') {
          // Keep page parameter within TMDB's strict integer bounds [1, 500]
          const pageVal = Math.max(1, Math.min(500, Math.floor(Number(value) || 1)));
          query.set(key, pageVal.toString());
        } else {
          query.set(key, value); // use .set() instead of .append() to de-duplicate
        }
      }
    });
    query.set('api_key', apiKey);
    const targetUrl = `https://api.themoviedb.org/3/${path}?${query.toString()}`;

    const response = await fetch(targetUrl, { next: { revalidate: 3600 } });
    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      return NextResponse.json(
        { 
          error: `TMDB API error: ${response.statusText}`,
          targetUrl,
          responseText,
          status: response.status
        },
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
