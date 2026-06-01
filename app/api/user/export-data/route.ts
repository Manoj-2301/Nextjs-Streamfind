import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ─── POST /api/user/export-data ───────────────────────────
export async function POST(request: Request) {
  try {
    const { uid, email, displayName, pdfBase64 } = await request.json();

    if (!uid || !email) {
      return NextResponse.json({ error: 'Missing uid or email' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];

    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const { getAuth } = await import('firebase-admin/auth');
    const adminAuth = getAuth(adminApp);

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized: Token verification failed' }, { status: 401 });
    }

    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Forbidden: Cannot access another user data' }, { status: 403 });
    }

    const name = displayName || email.split('@')[0];
    const transporter = createTransporter();

    let attachments = [];
    if (pdfBase64) {
      // Attach the provided PDF base64
      attachments.push({
        filename: `streamfind_data_${new Date().toISOString().split('T')[0]}.pdf`,
        content: pdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf',
      });
    } else {
      // Fallback: Generate JSON locally
      const userDoc = await db.doc(`users/${uid}`).get();
      const profile = userDoc.data() || {};
      const watchlistSnap = await db.collection(`users/${uid}/watchlist`).get();
      const watchlist = watchlistSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const reviewsSnap = await db.collection(`users/${uid}/reviews`).get();
      const reviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const auditSnap = await db.collection(`users/${uid}/audit_logs`).orderBy('timestamp', 'desc').limit(100).get();
      const auditLogs = auditSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const exportData = { exportedAt: new Date().toISOString(), uid, profile, watchlist, reviews, auditLogs };
      
      attachments.push({
        filename: `streamfind_data_${new Date().toISOString().split('T')[0]}.json`,
        content: JSON.stringify(exportData, null, 2),
        contentType: 'application/json',
      });
    }

    await transporter.sendMail({
      from: `"StreamFind" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '📦 Your StreamFind Data Export',
      html: generateExportEmailHtml(name, !!pdfBase64),
      attachments,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('export-data error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

function generateExportEmailHtml(name: string, isPdf: boolean = false) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:'Inter',-apple-system,sans-serif;background-color:#080808;color:#ffffff;margin:0;padding:40px 0;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="560"
    style="width:560px;margin:0 auto;background-color:#0c0c0c;border:1px solid rgba(255,255,255,0.04);border-radius:28px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.8);">

    <!-- Header -->
    <tr>
      <td style="padding:36px 24px;text-align:center;background:linear-gradient(to bottom,#250207 0%,#0c0c0c 100%);border-bottom:1px solid rgba(255,40,78,0.15);">
        <table align="center" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color:#ff284e;border-radius:8px;padding:6px 14px;box-shadow:0 0 15px rgba(255,40,78,0.6);">
              <span style="color:#ffffff;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:3px;font-style:italic;">STREAMFIND</span>
            </td>
          </tr>
          <tr>
            <td style="color:rgba(255,255,255,0.4);font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:4px;padding-top:8px;text-align:center;">
              YOUR UNIVERSE OF CINEMA
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:36px 36px 32px 36px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%"
          style="background-color:#161616;border-left:4px solid #ff284e;border-radius:8px;margin-bottom:28px;border-collapse:collapse;">
          <tr>
            <td style="padding:20px 24px;">
              <h2 style="margin:0 0 8px 0;font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;text-transform:uppercase;">
                Hey ${name},
              </h2>
              <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.6);">
                Your StreamFind data export is ready. We've attached a complete ${isPdf ? 'PDF archive' : 'JSON archive'} of your account including your profile, watchlist, reviews, and recent account activity.
              </p>
            </td>
          </tr>
        </table>

        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
          <tr>
            <td style="text-align:center;padding:16px 0;">
              <div style="display:inline-block;background:rgba(255,40,78,0.08);border:1px solid rgba(255,40,78,0.2);border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:26px;margin-bottom:16px;">
                📦
              </div>
              <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:-0.3px;">
                Data Export Attached
              </h3>
              <p style="margin:0 auto;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.7;max-width:360px;">
                The attached <strong style="color:rgba(255,255,255,0.65);">${isPdf ? '.pdf' : '.json'}</strong> file contains your complete StreamFind data. Keep it in a safe place.
              </p>
            </td>
          </tr>
        </table>

        <table border="0" cellpadding="0" cellspacing="0" width="100%"
          style="background-color:#111111;border:1px solid rgba(255,255,255,0.05);border-radius:10px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 4px 0;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.3);">
                🔒 What's included
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);line-height:1.8;">
                ✓ Profile settings &amp; preferences<br>
                ✓ Full watchlist<br>
                ✓ All reviews &amp; ratings<br>
                ✓ Recent account event logs
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:28px 24px;text-align:center;background-color:#090909;border-top:1px solid rgba(255,255,255,0.03);">
        <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.25);line-height:1.7;">
          You requested this export from your StreamFind account settings.<br>If you didn't request this, please contact support immediately.
        </p>
        <p style="margin:14px 0 0 0;font-size:9px;color:rgba(255,255,255,0.12);font-weight:bold;text-transform:uppercase;letter-spacing:2px;">
          © 2026 STREAMFIND. ALL RIGHTS RESERVED.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>`;
}
