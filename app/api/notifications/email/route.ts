/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { sendNotificationEmail, NotificationType } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Bearer token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Verify if the user's channelEmail preference is enabled
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    // Default to true if not explicitly set
    const profile = userDoc.data() || {};
    const channelEmailEnabled = profile.channelEmail !== false;

    if (!channelEmailEnabled) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email delivery channel is disabled for this user' 
      }, { status: 200 }); // Return 200 so frontend doesn't throw error
    }

    const body = await req.json();
    const { type, data } = body as { type: NotificationType; data: any };

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    const result = await sendNotificationEmail(email, type, data);

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

  } catch (error) {
    console.error('Email Notification API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
