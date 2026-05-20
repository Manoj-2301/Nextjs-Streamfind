import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { SEO_PLATFORMS, SEO_GENRES } from '@/lib/seo-config';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Basic security to ensure only authorized clients (like Vercel Cron) can trigger this
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Revalidate "New On" paths
    SEO_PLATFORMS.forEach(platform => {
      revalidatePath(`/new-on/${platform.slug}`);
    });
    
    // Revalidate "Best" paths
    SEO_GENRES.forEach(genre => {
      SEO_PLATFORMS.forEach(platform => {
        revalidatePath(`/best/${genre.slug}-${platform.slug}`);
      });
    });

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      message: 'Successfully revalidated all SEO paths'
    });
  } catch (err) {
    return NextResponse.json({ error: 'Error revalidating' }, { status: 500 });
  }
}
