import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, adminEmail } = body;

    if (!uid) {
      return NextResponse.json({ error: 'Missing required field: uid' }, { status: 400 });
    }

    // Basic authorization check: verify it's the admin calling this
    if (adminEmail !== 'mt398401@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
