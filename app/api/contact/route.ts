/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { escapeHtml } from '@/lib/utils';

// ─── Nodemailer transporter ───────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ─── Shared email shell ───────────────────────────────────
function emailShell(content: string, footerText: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:'Inter',-apple-system,sans-serif;background-color:#080808;color:#ffffff;margin:0;padding:40px 0;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="560" class="main-table"
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
              ADMINISTRATIVE NOTIFICATION
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:36px 36px 32px 36px;">
        ${content}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:28px 24px;text-align:center;background-color:#090909;border-top:1px solid rgba(255,255,255,0.03);">
        <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.25);line-height:1.7;">
          ${footerText}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Rate Limiting State ──────────────────────────────────
const rateLimitCache = new Map<string, number[]>();
const MAX_REQUESTS = 3;
const WINDOW_MS = 60 * 1000; // 1 minute

// ─── POST /api/contact ────────────────────────────────────
export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    if (ip !== 'unknown') {
      const timestamps = rateLimitCache.get(ip) || [];
      const windowTimestamps = timestamps.filter(t => now - t < WINDOW_MS);
      
      if (windowTimestamps.length >= MAX_REQUESTS) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
      }
      
      windowTimestamps.push(now);
      rateLimitCache.set(ip, windowTimestamps);
    }
    const { firstName, lastName, email, message } = await request.json();

    if (!firstName || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const content = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%"
        style="background-color:#161616;border-left:4px solid #ff284e;border-radius:8px;margin-bottom:28px;border-collapse:collapse;">
        <tr>
          <td style="padding:20px 24px;">
            <h2 style="margin:0 0 8px 0;font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;text-transform:uppercase;">
              New Contact Query
            </h2>
            <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.6);">
              You have received a new message from the contact form.
            </p>
          </td>
        </tr>
      </table>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td>
            <p style="margin:0 0 4px 0;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.3);">
              Name
            </p>
            <p style="margin:0;font-size:14px;color:#ffffff;">
              ${escapeHtml(firstName)} ${escapeHtml(lastName || '')}
            </p>
          </td>
        </tr>
      </table>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td>
            <p style="margin:0 0 4px 0;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.3);">
              Email Address
            </p>
            <p style="margin:0;font-size:14px;color:#ffffff;">
              ${escapeHtml(email)}
            </p>
          </td>
        </tr>
      </table>

      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td>
            <p style="margin:0 0 4px 0;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.3);">
              Message
            </p>
            <div style="background-color:#111111;border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:16px 20px;">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.8);line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</p>
            </div>
          </td>
        </tr>
      </table>
    `;

    const htmlContent = emailShell(
      content,
      `You received this email because someone filled out the contact form on StreamFind.`
    );

    const transporter = createTransporter();
    
    // We send this to the admin email address
    const adminEmail = 'mt398401@gmail.com';

    await transporter.sendMail({
      from: `"StreamFind Contact Form" <${process.env.GMAIL_USER}>`,
      to: adminEmail,
      subject: `📩 New Message from ${firstName}`,
      html: htmlContent,
      replyTo: email,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('contact-email error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
