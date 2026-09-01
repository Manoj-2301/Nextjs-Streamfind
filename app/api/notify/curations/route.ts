/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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
<body style="font-family:'Inter',-apple-system,sans-serif;background-color:#080009;color:#ffffff;margin:0;padding:40px 0;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" class="main-table"
    style="width:600px;margin:0 auto;background-color:#10001a;border:1px solid rgba(255,255,255,0.04);border-radius:28px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.8);">
    
    <!-- Header -->
    <tr>
      <td style="padding:36px 24px;text-align:center;background:linear-gradient(to bottom,#250207 0%,#10001a 100%);border-bottom:1px solid rgba(240,171,252,0.15);">
        <table align="center" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color:#f0abfc;border-radius:8px;padding:6px 14px;box-shadow:0 0 15px rgba(240,171,252,0.6);">
              <span style="color:#080009;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:3px;font-style:italic;">STREAMFIND</span>
            </td>
          </tr>
          <tr>
            <td style="color:rgba(255,255,255,0.4);font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:4px;padding-top:8px;text-align:center;">
              FEATURED CURATIONS
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
      <td style="padding:28px 24px;text-align:center;background-color:#080009;border-top:1px solid rgba(255,255,255,0.03);">
        <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.25);line-height:1.7;">
          ${footerText}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const { curations, emails } = await request.json();

    if (!curations || !Array.isArray(curations) || curations.length === 0) {
      return NextResponse.json({ error: 'No curations provided' }, { status: 400 });
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ message: 'No users opted in' });
    }

    let curationsHtml = '';
    for (const c of curations) {
      const imgUrl = c.movieImage ? (c.movieImage.startsWith('http') ? c.movieImage : `https://image.tmdb.org/t/p/w500${c.movieImage}`) : '';
      
      curationsHtml += `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#18002a;border-left:4px solid #f0abfc;border-radius:8px;margin-bottom:24px;border-collapse:collapse;">
        <tr>
          <td style="padding:20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                ${imgUrl ? `<td width="100" style="vertical-align:top;padding-right:20px;"><img src="${imgUrl}" width="100" style="display:block;width:100px;height:auto;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.5);" alt="${c.movieTitle}"/></td>` : ''}
                <td style="vertical-align:top;">
                  <p style="margin:0 0 6px 0;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:rgba(240,171,252,0.8);">
                    ${c.type} • ${c.slotNo || ''}
                  </p>
                  <h3 style="margin:0 0 10px 0;font-size:18px;font-weight:900;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                    ${c.movieTitle}
                  </h3>
                  ${c.movieOverview ? `<p style="margin:0;font-size:12px;color:rgba(255,255,255,0.65);line-height:1.6;">${c.movieOverview.substring(0, 140)}...</p>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      `;
    }

    const content = `
      <h2 style="margin:0 0 24px 0;font-size:24px;font-weight:900;color:#ffffff;text-align:center;text-transform:uppercase;font-style:italic;">
        Check out our latest picks!
      </h2>
      ${curationsHtml}
      <div style="text-align:center;margin-top:32px;">
        <a href="https://streamfinds.vercel.app" style="display:inline-block;padding:12px 32px;background-color:#f0abfc;color:#080009;text-decoration:none;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:2px;border-radius:12px;">Explore Now</a>
      </div>
    `;

    const htmlContent = emailShell(
      content,
      `You are receiving this email because you opted in to StreamFind newsletters. You can opt out at any time in your profile settings.`
    );

    const transporter = createTransporter();

    // Send emails (using BCC to protect privacy, or loop to send individually)
    // Sending individually is safer to avoid spam filters and show 'To' correctly
    // But for a large list, bulk email services are better. Here we use Promise.all chunking.
    const CHUNK_SIZE = 50;
    for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
      const chunk = emails.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(email => 
        transporter.sendMail({
          from: `"StreamFind Curations" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: `🎬 Fresh Picks from StreamFind`,
          html: htmlContent,
        }).catch(err => console.error('Failed to send email to', email, err))
      ));
    }

    return NextResponse.json({ success: true, count: emails.length });
  } catch (err: any) {
    console.error('curation email error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
