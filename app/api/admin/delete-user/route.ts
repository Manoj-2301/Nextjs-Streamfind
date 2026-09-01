/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];

    // Verify token and verify admin rights
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized: Token verification failed' }, { status: 401 });
    }

    if (decodedToken.email !== 'mt398401@gmail.com') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ error: 'Missing required field: uid' }, { status: 400 });
    }

    // Attempt to delete the user from Firebase Authentication
    await admin.auth().deleteUser(uid);
    
    return NextResponse.json({ success: true, message: 'User permanently deleted from Auth.' });
  } catch (error: any) {
    console.error('Error deleting user from Firebase Auth:', error);
    
    // If the user was already deleted, we can consider it a success
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({ success: true, message: 'User already deleted.' });
    }

    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}
