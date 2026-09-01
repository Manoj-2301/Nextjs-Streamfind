/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

// ─── Firebase Admin init ──────────────────────────────────
function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
    }),
  });
}

// ─── POST /api/user/revoke-sessions ───────────────────────
// Revokes all refresh tokens for the given user.
// After this call, any existing session on other devices will be
// invalidated on their next API request (token refresh).
export async function POST(request: Request) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];

    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized: Token verification failed' }, { status: 401 });
    }

    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Forbidden: Cannot revoke another user sessions' }, { status: 403 });
    }

    // Revoke all refresh tokens — this invalidates all sessions across all devices.
    // Existing ID tokens remain valid for up to 1 hour (Firebase default),
    // but no new tokens can be issued without re-login.
    await adminAuth.revokeRefreshTokens(uid);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('revoke-sessions error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
