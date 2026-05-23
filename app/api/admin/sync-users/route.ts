import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminEmail } = body;

    // Basic authorization check: verify it's the admin calling this
    if (adminEmail !== 'mt398401@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // 1. Fetch all auth users (handling pagination)
    let authUids = new Set<string>();
    let pageToken: string | undefined = undefined;
    do {
      const listUsersResult = await auth.listUsers(1000, pageToken);
      listUsersResult.users.forEach((userRecord) => {
        authUids.add(userRecord.uid);
      });
      pageToken = listUsersResult.pageToken;
    } while (pageToken);

    // 2. Fetch all firestore users
    const usersSnapshot = await db.collection('users').get();
    
    // 3. Find orphaned firestore users
    const batch = db.batch();
    let deleteCount = 0;

    for (const doc of usersSnapshot.docs) {
      if (!authUids.has(doc.id)) {
        // User is in Firestore but not in Auth -> Delete from Firestore
        batch.delete(doc.ref);
        deleteCount++;
      }
    }

    // 4. Commit deletions if any
    if (deleteCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, deletedCount: deleteCount });
  } catch (error: any) {
    console.error('Error syncing users with auth:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync users' }, { status: 500 });
  }
}
