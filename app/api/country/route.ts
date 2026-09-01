/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  // Extract country from Vercel Edge request headers (defaults to IN)
  const country = request.headers.get('x-vercel-ip-country') || 'IN';
  return NextResponse.json({ country });
}
