import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userEmail, userName, type, reviewText, contactUrl } = body as {
      userEmail: string;
      userName: string;
      type: 'flagged' | 'inactive';
      reviewText?: string;
      contactUrl?: string;
    };

    if (!userEmail || !type) {
      return NextResponse.json({ error: 'Missing required fields: userEmail, type' }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      return NextResponse.json({ error: 'Gmail SMTP credentials not configured in .env.local' }, { status: 500 });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const siteUrl = `${protocol}://${host}`;
    const resolvedContactUrl = contactUrl || `${siteUrl}/contact`;

    const subject = type === 'flagged'
      ? `⚠️ StreamFind: Your account has been flagged`
      : `StreamFind: Your account has been marked inactive`;

    const htmlContent = type === 'flagged'
      ? generateFlaggedEmail(userName, reviewText, resolvedContactUrl, siteUrl)
      : generateInactiveEmail(userName, siteUrl);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    await transporter.sendMail({
      from: `"StreamFind Community" <${gmailUser}>`,
      to: userEmail,
      replyTo: gmailUser,
      subject,
      html: htmlContent,
      headers: {
        'List-Unsubscribe': `<${siteUrl}/profile>`,
        'X-Mailer': 'StreamFind Moderation System',
        'Precedence': 'bulk',
      },
    });

    return NextResponse.json({ success: true, type, sentTo: userEmail });
  } catch (error: any) {
    console.error('Moderation email error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send moderation email' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Flagged Email Template
// ─────────────────────────────────────────────────────────────────────────────
function generateFlaggedEmail(name: string, reviewText: string | undefined, contactUrl: string, siteUrl: string) {
  const reviewBlock = reviewText
    ? `
      <!-- Offending Review Quote -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;border-collapse:collapse;">
        <tr>
          <td style="background-color:#1a0a0a;border-left:4px solid #ff284e;border-radius:8px;padding:20px 24px;">
            <p style="margin:0 0 8px 0;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:rgba(255,40,78,0.7);">FLAGGED CRITIQUE</p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.55);font-style:italic;">"${reviewText.length > 200 ? reviewText.substring(0, 200) + '...' : reviewText}"</p>
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StreamFind Account Flagged</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
      body { font-family: 'Inter', -apple-system, sans-serif; background-color: #080808; color: #ffffff; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
      @media only screen and (max-width: 480px) { .main-table { width: 100% !important; } }
    </style>
  </head>
  <body style="font-family:'Inter',-apple-system,sans-serif;background-color:#080808;color:#ffffff;margin:0;padding:40px 0;">

    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" class="main-table" style="width:600px;margin:0 auto;background-color:#0c0c0c;border:1px solid rgba(255,255,255,0.04);border-radius:28px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.8);">

      <!-- Header -->
      <tr>
        <td style="padding:40px 24px;text-align:center;background:linear-gradient(to bottom,#250207 0%,#0c0c0c 100%);border-bottom:1px solid rgba(255,40,78,0.15);">
          <table align="center" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color:#ff284e;border-radius:8px;padding:6px 12px;box-shadow:0 0 15px rgba(255,40,78,0.6);">
                <span style="color:#ffffff;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:3px;font-style:italic;">STREAMFIND</span>
              </td>
            </tr>
            <tr>
              <td>
                <div style="color:rgba(255,255,255,0.4);font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:4px;margin-top:6px;">COMMUNITY STANDARDS ALERT</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Warning Banner -->
      <tr>
        <td style="padding:0;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(135deg,#3d0a10 0%,#1a0507 100%);border-bottom:1px solid rgba(255,40,78,0.2);border-collapse:collapse;">
            <tr>
              <td style="padding:16px 32px;text-align:center;">
                <span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:3px;color:#ff284e;">⚠ Account Status: FLAGGED</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 36px 0 36px;">

          <!-- Greeting -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#161616;border-left:4px solid #ff284e;border-radius:8px;margin-bottom:28px;border-collapse:collapse;">
            <tr>
              <td style="padding:20px 24px;">
                <h2 style="margin:0 0 10px 0;font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;text-transform:uppercase;">Hey ${name},</h2>
                <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.65);font-weight:500;">
                  Your StreamFind account has been <strong style="color:#ff284e;">flagged</strong> by our moderation team for content that violates our Community Guidelines. Your account access may be restricted until this is reviewed.
                </p>
              </td>
            </tr>
          </table>

          ${reviewBlock}

          <!-- Why Flagged -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;border-collapse:collapse;">
            <tr>
              <td style="background-color:#111111;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:24px;">
                <p style="margin:0 0 12px 0;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">WHY WAS I FLAGGED?</p>
                <p style="margin:0 0 10px 0;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.6);">StreamFind is enjoyed by audiences of all ages, including families and young cinephiles. Our platform requires that all critiques and reviews remain appropriate for <strong style="color:#ffffff;">all age groups</strong>.</p>
                <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.6);">Content containing explicit language, 18+ themes, harassment, or discriminatory language in your critiques for family or general-audience movies is not permitted.</p>
              </td>
            </tr>
          </table>

          <!-- What To Do -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;border-collapse:collapse;">
            <tr>
              <td>
                <p style="margin:0 0 16px 0;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">WHAT TO DO NEXT</p>

                <!-- Step 1 -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;border-collapse:collapse;">
                  <tr>
                    <td width="32" style="vertical-align:top;padding-right:14px;">
                      <div style="width:28px;height:28px;background:linear-gradient(135deg,#ff284e,#a80f27);border-radius:8px;text-align:center;line-height:28px;font-size:11px;font-weight:900;color:#fff;">1</div>
                    </td>
                    <td style="vertical-align:top;">
                      <p style="margin:0 0 2px 0;font-size:12px;font-weight:700;color:#ffffff;">Review your critique</p>
                      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.45);line-height:1.6;">Read through your recent critiques and identify content that may have violated our guidelines.</p>
                    </td>
                  </tr>
                </table>

                <!-- Step 2 -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;border-collapse:collapse;">
                  <tr>
                    <td width="32" style="vertical-align:top;padding-right:14px;">
                      <div style="width:28px;height:28px;background:linear-gradient(135deg,#ff284e,#a80f27);border-radius:8px;text-align:center;line-height:28px;font-size:11px;font-weight:900;color:#fff;">2</div>
                    </td>
                    <td style="vertical-align:top;">
                      <p style="margin:0 0 2px 0;font-size:12px;font-weight:700;color:#ffffff;">Contact our moderation team</p>
                      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.45);line-height:1.6;">Reach out to us explaining the situation. Our team will review and may restore your account if appropriate.</p>
                    </td>
                  </tr>
                </table>

                <!-- Step 3 -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td width="32" style="vertical-align:top;padding-right:14px;">
                      <div style="width:28px;height:28px;background:linear-gradient(135deg,#ff284e,#a80f27);border-radius:8px;text-align:center;line-height:28px;font-size:11px;font-weight:900;color:#fff;">3</div>
                    </td>
                    <td style="vertical-align:top;">
                      <p style="margin:0 0 2px 0;font-size:12px;font-weight:700;color:#ffffff;">Wait for admin review</p>
                      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.45);line-height:1.6;">An administrator will review your case and unflag your account if the content was in error.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- CTA Button -->
          <div style="text-align:center;padding-bottom:40px;border-bottom:1px solid rgba(255,255,255,0.05);">
            <a href="${contactUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#ff284e 0%,#b8142f 100%);color:#ffffff;text-decoration:none;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;padding:14px 36px;border-radius:12px;box-shadow:0 6px 20px rgba(255,40,78,0.4);">
              CONTACT MODERATION TEAM
            </a>
          </div>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:28px 24px;text-align:center;background-color:#090909;border-top:1px solid rgba(255,255,255,0.02);">
          <p style="margin:0 0 8px 0;font-size:10px;color:rgba(255,255,255,0.3);font-weight:500;line-height:1.6;">
            This is an automated account notification from StreamFind. If you believe this is a mistake, please contact our team.
          </p>
          <p style="margin:0;font-size:9px;color:rgba(255,255,255,0.15);font-weight:bold;text-transform:uppercase;letter-spacing:2px;">
            © 2026 STREAMFIND. ALL RIGHTS RESERVED.
          </p>
        </td>
      </tr>

    </table>
  </body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inactive Email Template
// ─────────────────────────────────────────────────────────────────────────────
function generateInactiveEmail(name: string, siteUrl: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StreamFind — We Miss You</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
      body { font-family: 'Inter', -apple-system, sans-serif; background-color: #080808; color: #ffffff; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
      @media only screen and (max-width: 480px) { .main-table { width: 100% !important; } }
    </style>
  </head>
  <body style="font-family:'Inter',-apple-system,sans-serif;background-color:#080808;color:#ffffff;margin:0;padding:40px 0;">

    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" class="main-table" style="width:600px;margin:0 auto;background-color:#0c0c0c;border:1px solid rgba(255,255,255,0.04);border-radius:28px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.8);">

      <!-- Header -->
      <tr>
        <td style="padding:40px 24px;text-align:center;background:linear-gradient(to bottom,#250207 0%,#0c0c0c 100%);border-bottom:1px solid rgba(255,40,78,0.15);">
          <table align="center" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color:#ff284e;border-radius:8px;padding:6px 12px;box-shadow:0 0 15px rgba(255,40,78,0.6);">
                <span style="color:#ffffff;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:3px;font-style:italic;">STREAMFIND</span>
              </td>
            </tr>
            <tr>
              <td>
                <div style="color:rgba(255,255,255,0.4);font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:4px;margin-top:6px;">ACCOUNT NOTIFICATION</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Status Banner -->
      <tr>
        <td style="padding:0;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(135deg,#1a1a1a 0%,#111 100%);border-bottom:1px solid rgba(255,255,255,0.06);border-collapse:collapse;">
            <tr>
              <td style="padding:16px 32px;text-align:center;">
                <span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,0.4);">💤 Account Status: INACTIVE</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 36px 0 36px;">

          <!-- Greeting -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#161616;border-left:4px solid rgba(255,40,78,0.5);border-radius:8px;margin-bottom:28px;border-collapse:collapse;">
            <tr>
              <td style="padding:20px 24px;">
                <h2 style="margin:0 0 10px 0;font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;text-transform:uppercase;">We miss you, ${name}!</h2>
                <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.65);font-weight:500;">
                  Your StreamFind account has been automatically marked as <strong style="color:rgba(255,255,255,0.85);">Inactive</strong> because we haven't seen you in over <strong style="color:#ff284e;">30 days</strong>. Your account and all your watchlists and reviews are completely safe.
                </p>
              </td>
            </tr>
          </table>

          <!-- Stats / Reminder Block -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;border-collapse:collapse;">
            <tr>
              <td style="background-color:#111111;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:24px;">
                <p style="margin:0 0 16px 0;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">WHILE YOU WERE AWAY</p>

                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td width="33%" style="text-align:center;padding:0 8px;">
                      <div style="font-size:28px;font-weight:900;color:#ff284e;letter-spacing:-1px;">🎬</div>
                      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.4);margin-top:4px;">New Movies</div>
                    </td>
                    <td width="33%" style="text-align:center;padding:0 8px;">
                      <div style="font-size:28px;font-weight:900;color:#ff284e;letter-spacing:-1px;">⭐</div>
                      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.4);margin-top:4px;">New Ratings</div>
                    </td>
                    <td width="33%" style="text-align:center;padding:0 8px;">
                      <div style="font-size:28px;font-weight:900;color:#ff284e;letter-spacing:-1px;">📋</div>
                      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.4);margin-top:4px;">Watchlist Updates</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Reactivate Info -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;border-collapse:collapse;">
            <tr>
              <td style="background-color:#0f0f0f;border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:20px 24px;">
                <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.55);">
                  Simply <strong style="color:#ffffff;">log back in</strong> to StreamFind and your account will automatically be reactivated. Pick up right where you left off — your watchlist, ratings, and critiques are all waiting for you.
                </p>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <div style="text-align:center;padding-bottom:40px;border-bottom:1px solid rgba(255,255,255,0.05);">
            <a href="${siteUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#ff284e 0%,#b8142f 100%);color:#ffffff;text-decoration:none;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;padding:14px 36px;border-radius:12px;box-shadow:0 6px 20px rgba(255,40,78,0.4);">
              COME BACK TO STREAMFIND
            </a>
          </div>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:28px 24px;text-align:center;background-color:#090909;border-top:1px solid rgba(255,255,255,0.02);">
          <p style="margin:0 0 8px 0;font-size:10px;color:rgba(255,255,255,0.3);font-weight:500;line-height:1.6;">
            You received this notification because your StreamFind account was automatically marked inactive after 30 days without a login.
          </p>
          <p style="margin:0;font-size:9px;color:rgba(255,255,255,0.15);font-weight:bold;text-transform:uppercase;letter-spacing:2px;">
            © 2026 STREAMFIND. ALL RIGHTS RESERVED.
          </p>
        </td>
      </tr>

    </table>
  </body>
</html>`;
}
