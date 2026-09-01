/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

// ─── Firebase Admin SDK init ──────────────────────────────
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

// ─── Rate Limiting State ──────────────────────────────────
// Store IPs and timestamp of last requests. Cleaned up lazily.
const rateLimitCache = new Map<string, number[]>();
const MAX_REQUESTS = 3;
const WINDOW_MS = 60 * 1000; // 1 minute

// ─── POST /api/auth/send-email ────────────────────────────
export async function POST(request: Request) {
  try {
    // 1. Rate Limiting Check
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

    const { type, email, displayName } = await request.json();

    if (!type || !email) {
      return NextResponse.json({ error: 'Missing type or email' }, { status: 400 });
    }
    if (type !== 'verify' && type !== 'reset') {
      return NextResponse.json({ error: 'Invalid type. Use "verify" or "reset"' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const actionUrl = `${appUrl}/auth/action`;

    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);

    let actionLink: string;
    let subject: string;
    let htmlContent: string;
    const name = displayName || email.split('@')[0];

    if (type === 'verify') {
      actionLink = await adminAuth.generateEmailVerificationLink(email, {
        url: actionUrl,
      });
      subject = '✅ Verify your StreamFind email';
      htmlContent = generateVerifyEmailHtml(name, actionLink, appUrl);
    } else {
      actionLink = await adminAuth.generatePasswordResetLink(email, {
        url: actionUrl,
      });
      subject = '🔑 Reset your StreamFind password';
      htmlContent = generateResetPasswordHtml(name, actionLink, appUrl);
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"StreamFind" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('send-email error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// ─── Shared email shell ───────────────────────────────────
function emailShell(content: string, footerText: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
    body { font-family: 'Inter', -apple-system, sans-serif; background-color:#080808; color:#ffffff; margin:0; padding:40px 0; -webkit-font-smoothing:antialiased; }
    @media only screen and (max-width:480px) { .main-table { width:100%!important; } }
  </style>
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
              YOUR UNIVERSE OF CINEMA
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
        <p style="margin:14px 0 0 0;font-size:9px;color:rgba(255,255,255,0.12);font-weight:bold;text-transform:uppercase;letter-spacing:2px;">
          © 2026 STREAMFIND. ALL RIGHTS RESERVED.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>`;
}

// ─── Verify Email HTML ────────────────────────────────────
function generateVerifyEmailHtml(name: string, actionLink: string, siteUrl: string) {
  const content = `
    <!-- Greeting block -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#161616;border-left:4px solid #ff284e;border-radius:8px;margin-bottom:28px;border-collapse:collapse;">
      <tr>
        <td style="padding:20px 24px;">
          <h2 style="margin:0 0 8px 0;font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;text-transform:uppercase;">
            Hey ${name},
          </h2>
          <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.6);">
            Welcome to StreamFind! One quick step — please verify your email address to activate your account and start exploring your universe of cinema.
          </p>
        </td>
      </tr>
    </table>

    <!-- Icon + message -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      <tr>
        <td style="text-align:center;padding:16px 0;">
          <div style="display:inline-block;background:rgba(255,40,78,0.08);border:1px solid rgba(255,40,78,0.2);border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:26px;margin-bottom:16px;">
            ✉️
          </div>
          <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:-0.3px;">
            Confirm Your Email
          </h3>
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.7;max-width:360px;margin:0 auto;">
            Click the button below to verify your email. This link expires in <strong style="color:rgba(255,255,255,0.65);">24 hours</strong>.
          </p>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      <tr>
        <td style="text-align:center;">
          <a href="${actionLink}" target="_blank"
            style="display:inline-block;background:linear-gradient(135deg,#ff284e 0%,#b8142f 100%);color:#ffffff;text-decoration:none;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;padding:16px 40px;border-radius:12px;box-shadow:0 8px 20px rgba(255,40,78,0.35);border:1px solid rgba(255,255,255,0.1);">
            VERIFY MY EMAIL
          </a>
        </td>
      </tr>
    </table>

    <!-- Fallback link -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#111111;border:1px solid rgba(255,255,255,0.05);border-radius:10px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px 0;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.3);">
            Button not working? Copy this link:
          </p>
          <p style="margin:0;font-size:10px;color:rgba(255,40,78,0.7);word-break:break-all;line-height:1.5;">
            <a href="${actionLink}" style="color:rgba(255,40,78,0.7);text-decoration:none;">${actionLink}</a>
          </p>
        </td>
      </tr>
    </table>
  `;

  return emailShell(
    content,
    `You received this email because someone created a StreamFind account with this address.<br>If that wasn't you, you can safely ignore this email.`
  );
}

// ─── Reset Password HTML ──────────────────────────────────
function generateResetPasswordHtml(name: string, actionLink: string, siteUrl: string) {
  const content = `
    <!-- Greeting block -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#161616;border-left:4px solid #ff284e;border-radius:8px;margin-bottom:28px;border-collapse:collapse;">
      <tr>
        <td style="padding:20px 24px;">
          <h2 style="margin:0 0 8px 0;font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;text-transform:uppercase;">
            Hey ${name},
          </h2>
          <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.6);">
            We received a request to reset your StreamFind password. Click the button below to set a new one.
          </p>
        </td>
      </tr>
    </table>

    <!-- Icon + message -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      <tr>
        <td style="text-align:center;padding:16px 0;">
          <div style="display:inline-block;background:rgba(255,40,78,0.08);border:1px solid rgba(255,40,78,0.2);border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:26px;margin-bottom:16px;">
            🔑
          </div>
          <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:-0.3px;">
            Reset Your Password
          </h3>
          <p style="margin:0 auto;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.7;max-width:360px;">
            This link is valid for <strong style="color:rgba(255,255,255,0.65);">1 hour</strong>. If you didn't request a reset, you can safely ignore this email.
          </p>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      <tr>
        <td style="text-align:center;">
          <a href="${actionLink}" target="_blank"
            style="display:inline-block;background:linear-gradient(135deg,#ff284e 0%,#b8142f 100%);color:#ffffff;text-decoration:none;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;padding:16px 40px;border-radius:12px;box-shadow:0 8px 20px rgba(255,40,78,0.35);border:1px solid rgba(255,255,255,0.1);">
            RESET MY PASSWORD
          </a>
        </td>
      </tr>
    </table>

    <!-- Security note -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#111111;border:1px solid rgba(255,255,255,0.05);border-radius:10px;margin-bottom:12px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px 0;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.3);">
            🔒 Security notice
          </p>
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);line-height:1.6;">
            StreamFind will never ask for your password via email. If you didn't request this reset, your account is safe — just ignore this email.
          </p>
        </td>
      </tr>
    </table>

    <!-- Fallback link -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#111111;border:1px solid rgba(255,255,255,0.05);border-radius:10px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px 0;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.3);">
            Button not working? Copy this link:
          </p>
          <p style="margin:0;font-size:10px;color:rgba(255,40,78,0.7);word-break:break-all;line-height:1.5;">
            <a href="${actionLink}" style="color:rgba(255,40,78,0.7);text-decoration:none;">${actionLink}</a>
          </p>
        </td>
      </tr>
    </table>
  `;

  return emailShell(
    content,
    `You received this email because a password reset was requested for your StreamFind account.<br>If that wasn't you, no action is needed — your password has not been changed.`
  );
}
