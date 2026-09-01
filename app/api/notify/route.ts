/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import nodemailer from 'nodemailer';
import { checkRateLimit } from '@/lib/rateLimit';


// 1. Initialize Firebase Config on Serverless Environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// 2. Standard TMDB Genre Map matching Vigilance Hub
const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

// 3. Main Route Trigger Handler (GET or POST)
export async function GET(request: Request) {
  return handleDispatch(request);
}

export async function POST(request: Request) {
  return handleDispatch(request);
}

async function handleDispatch(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!checkRateLimit(ip, 5, 60000)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || request.headers.get('Authorization')?.split(' ')[1];

    // Security check: Only authenticate triggers in production if CRON_SECRET is set
    const expectedSecret = process.env.CRON_SECRET;
    if (process.env.NODE_ENV === 'production' && expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized Trigger Key' }, { status: 401 });
    }

    const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    // Support two drivers: 'gmail' (default) or 'resend'
    const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!tmdbApiKey) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_TMDB_API_KEY env key is missing' }, { status: 500 });
    }

    // 4. Calculate date range (Movies released in the last 7 days)
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayIso = today.toISOString().split('T')[0];
    const sevenDaysAgoIso = sevenDaysAgo.toISOString().split('T')[0];

    // Fetch popular releases from TMDB Discover API
    const tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&sort_by=popularity.desc&primary_release_date.gte=${sevenDaysAgoIso}&primary_release_date.lte=${todayIso}&with_original_language=en`;
    const tmdbRes = await fetch(tmdbUrl, { next: { revalidate: 3600 } });
    const tmdbData = await tmdbRes.json();
    const rawMovies = tmdbData.results || [];

    if (rawMovies.length === 0) {
      return NextResponse.json({ success: true, message: 'No new movies found from TMDB for this date range.', emailsSent: 0 });
    }

    // Map TMDB items to our cleaner frontend definitions
    const movies = rawMovies.map((movie: any) => {
      const genres = movie.genre_ids ? movie.genre_ids.map((id: number) => GENRE_MAP[id] || 'Unknown') : [];
      return {
        id: movie.id,
        title: movie.title,
        overview: movie.overview || 'No synopsis available.',
        rating: movie.vote_average ? Number(movie.vote_average.toFixed(1)) : 0,
        releaseDate: movie.release_date,
        genres,
        posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://placehold.co/500x750?text=No+Poster',
        backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : 'https://placehold.co/1280x720?text=No+Backdrop'
      };
    });

    // 5. Query subscribed users from Firestore
    const usersSnap = await getDocs(collection(db, 'users'));
    const subscribedUsers: any[] = [];
    usersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      // Process users who have any alert preference active
      if (data.email && (data.notifyNewRelease === true || data.notifyFavGenres === true || data.notifyLeavingSoon === true)) {
        subscribedUsers.push({
          uid: docSnap.id,
          displayName: data.displayName || 'Cinema Lover',
          email: data.email,
          favoriteGenres: data.favoriteGenres || [],
          notifyNewRelease: data.notifyNewRelease === true,
          notifyFavGenres: data.notifyFavGenres === true,
          notifyLeavingSoon: data.notifyLeavingSoon === true,
          lastFavGenresEmailSent: data.lastFavGenresEmailSent || null
        });
      }
    });

    // Support secure instant developer test modes
    const testMode = searchParams.get('test') === 'true';
    if (testMode) {
      const testEmail = searchParams.get('email') || 'manoj@example.com';
      subscribedUsers.push({
        uid: 'test_mode_uid',
        displayName: 'Manoj (Test Mode)',
        email: testEmail,
        favoriteGenres: ['Sci-Fi', 'Action', 'Drama', 'Thriller'],
        notifyNewRelease: true,
        notifyFavGenres: true,
        notifyLeavingSoon: true,
        lastFavGenresEmailSent: null
      });
    }

    if (subscribedUsers.length === 0) {
      return NextResponse.json({ success: true, message: 'No users subscribed to Vigilance Hub alerts in Firestore.', emailsSent: 0 });
    }

    // 6. Match and Dispatch custom newsletters
    let emailsSent = 0;
    const errors: string[] = [];

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const siteUrl = `${protocol}://${host}`;

    for (const user of subscribedUsers) {
      let matchedMovies = [];
      let isFavGenresAlert = false;

      // Determine if a favorite genres email is due (every 2 days)
      let shouldSendFavGenres = false;
      if (user.notifyFavGenres) {
        if (!user.lastFavGenresEmailSent) {
          shouldSendFavGenres = true;
        } else {
          const hoursElapsed = (Date.now() - user.lastFavGenresEmailSent) / (1000 * 60 * 60);
          if (hoursElapsed >= 40) {
            shouldSendFavGenres = true;
          }
        }
      }

      if (shouldSendFavGenres) {
        // Targeted Favorite Genres Alert (triggers every 2 days)
        const userFavsLower = user.favoriteGenres.map((g: string) => g.toLowerCase());
        matchedMovies = movies.filter((movie: any) =>
          movie.genres.some((genre: string) => userFavsLower.includes(genre.toLowerCase()))
        );
        isFavGenresAlert = true;

        // If no matching favorite genre movies are found, fall back to general new releases if notifyNewRelease is active
        if (matchedMovies.length === 0 && user.notifyNewRelease) {
          matchedMovies = movies;
          isFavGenresAlert = false;
        }
      } else if (user.notifyNewRelease) {
        // General New Release Alert (triggers daily)
        matchedMovies = movies;
        isFavGenresAlert = false;
      }

      // Cap at 3 highly relevant movies per alert newsletter
      matchedMovies = matchedMovies.slice(0, 3);

      if (matchedMovies.length > 0) {
        const htmlContent = generateNewsletterHtml(user.displayName, matchedMovies, user.favoriteGenres, siteUrl, isFavGenresAlert);
        const emailSubject = isFavGenresAlert
          ? `🎬 STREAMFIND: New releases in your favorite genres!`
          : `🎬 STREAMFIND: Today's top new movie epic releases!`;

        let mailSentSuccessfully = false;

        if (emailProvider === 'resend') {
          // ==============================
          // 🏆 DRIVER 1: RESEND (Requires Custom Domain)
          // ==============================
          if (resendApiKey) {
            try {
              const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: 'StreamFind Vigilance <alerts@streamfind.ai>',
                  to: user.email,
                  subject: emailSubject,
                  html: htmlContent
                })
              });

              if (!resendRes.ok) {
                const errorText = await resendRes.text();
                console.error(`Resend API error for ${user.email}:`, errorText);
                errors.push(`Resend failed for ${user.email}: ${errorText}`);
              } else {
                emailsSent++;
                mailSentSuccessfully = true;
              }
            } catch (e: any) {
              console.error(`Resend request error for ${user.email}:`, e);
              errors.push(`Resend error for ${user.email}: ${e.message}`);
            }
          } else {
            console.warn(`Resend API Key is missing. Simulating sending email to ${user.email}.`);
            emailsSent++;
            mailSentSuccessfully = true;
          }
        } else {
          // ==============================
          // ✉️ DRIVER 2: GMAIL SMTP (Zero Domain Restrictions, Free!)
          // ==============================
          if (gmailUser && gmailAppPassword) {
            try {
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: gmailUser,
                  pass: gmailAppPassword
                }
              });

              await transporter.sendMail({
                from: `"StreamFind Alerts" <${gmailUser}>`,
                to: user.email,
                subject: emailSubject,
                html: htmlContent
              });

              emailsSent++;
              mailSentSuccessfully = true;
            } catch (e: any) {
              console.error(`Gmail SMTP error for ${user.email}:`, e);
              errors.push(`Gmail failed for ${user.email}: ${e.message}`);
            }
          } else {
            console.warn(`Gmail SMTP credentials missing. Simulating sending email to ${user.email}.`);
            emailsSent++;
            mailSentSuccessfully = true;
          }
        }

        // Update Firestore lastFavGenresEmailSent on successful favorite genres send
        if (mailSentSuccessfully && isFavGenresAlert && user.uid !== 'test_mode_uid') {
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              lastFavGenresEmailSent: Date.now()
            });
          } catch (e: any) {
            console.error(`Failed to update lastFavGenresEmailSent for ${user.email}:`, e);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      newReleasesScraped: movies.length,
      usersProcessed: subscribedUsers.length,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error running notification runner:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// 7. Premium, Sleek, Cinematic Responsive HTML Email Template Generator
function generateNewsletterHtml(name: string, movies: any[], genres: string[], siteUrl: string, isFavGenresAlert: boolean) {
  const genreListString = genres.join(', ');
  const movieCardsRows = [];

  for (let i = 0; i < movies.length; i += 2) {
    const rowMovies = movies.slice(i, i + 2);
    const rowHtml = rowMovies.map((movie, index) => {
      const globalIndex = i + index;
      const rankBadgeText = `RANK #${globalIndex + 1}`;

      const genrePills = movie.genres.slice(0, 2).map((g: string) =>
        `<span style="display:inline-block;background-color:rgba(240,171,252,0.06);border:1px solid rgba(240,171,252,0.25);color:#f0abfc;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;padding:2px 6px;border-radius:4px;margin-right:4px;margin-bottom:4px;">${g}</span>`
      ).join('');

      return `
        <!-- Movie Card Column -->
        <td class="movie-card-column" width="48%" style="width:48%;vertical-align:top;background:linear-gradient(to bottom, #18002a, #10001a);border:1px solid rgba(255,255,255,0.06);border-radius:24px;padding:16px;box-shadow:0 12px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);box-sizing:border-box;">
          
          <!-- Cinematic Image backdrop with Rank Pill -->
          <div style="border-radius:16px;overflow:hidden;height:135px;background:linear-gradient(to top, #18002a 0%, rgba(24,0,42,0.6) 50%, rgba(24,0,42,0) 100%), url('${movie.backdropUrl}') no-repeat center center;background-size:cover;position:relative;">
            <a href="${siteUrl}/movie/${movie.id}" target="_blank" style="display:block;width:100%;height:135px;text-decoration:none;border:none;outline:none;position:relative;">
              
              <!-- Vibrant Floating Neon Rank Pill -->
              <div style="position:absolute;top:10px;right:10px;left:auto;z-index:30;">
                <table border="0" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg, #f0abfc 0%, #e879f9 100%);border-radius:6px;box-shadow:0 4px 10px rgba(240,171,252,0.4);">
                  <tr>
                    <td style="padding:4px 8px;color:#080009;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1px;text-align:center;">
                      ${rankBadgeText}
                    </td>
                  </tr>
                </table>
              </div>
              
            </a>
          </div>
          
          <!-- Card Details Body -->
          <div style="padding:16px 4px 4px 4px;">
            <div style="margin-bottom:8px;line-height:1.2;">
              ${genrePills}
            </div>
            
            <h3 class="movie-card-title" style="margin:0 0 6px 0;font-size:14px;font-weight:900;color:#ffffff;letter-spacing:-0.2px;text-transform:uppercase;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${movie.title}</h3>
            
            <!-- Rating Badging -->
            <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
              <tr>
                <td style="color:#f0abfc;font-size:11px;font-weight:bold;padding-right:6px;vertical-align:middle;">★ ${movie.rating.toFixed(1)}</td>
                <td style="background-color:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);font-size:8px;font-weight:bold;padding:1px 4px;border-radius:3px;vertical-align:middle;">TMDB</td>
              </tr>
            </table>
            
            <p class="movie-card-desc" style="margin:0 0 16px 0;font-size:11px;line-height:1.5;color:rgba(255,255,255,0.5);font-weight:500;height:50px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">
              ${movie.overview.length > 95 ? movie.overview.substring(0, 95) + '...' : movie.overview}
            </p>
            
            <!-- Deluxe Action Button -->
            <a href="${siteUrl}/movie/${movie.id}" target="_blank" class="movie-card-btn" style="display:inline-block;background:linear-gradient(135deg, #f0abfc 0%, #e879f9 100%);color:#080009;text-decoration:none;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;padding:10px 22px;border-radius:10px;box-shadow:0 6px 15px rgba(240,171,252,0.3);text-align:center;border:1px solid rgba(255,255,255,0.1);">
              WATCH TRAILER
            </a>
          </div>
          
        </td>
      `;
    }).join('<td class="movie-card-space" width="4%" style="width:4%;"></td>');

    const fillerCell = rowMovies.length === 1 ? '<td class="movie-card-space" width="4%" style="width:4%;"></td><td width="48%" style="width:48%;"></td>' : '';

    movieCardsRows.push(`
      <tr>
        ${rowHtml}
        ${fillerCell}
      </tr>
    `);

    if (i + 2 < movies.length) {
      movieCardsRows.push(`
        <tr>
          <td colspan="3" style="height:24px;line-height:24px;font-size:24px;">&nbsp;</td>
        </tr>
      `);
    }
  }
  const movieCards = movieCardsRows.join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>StreamFind Vigilance Alert</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            background-color: #080808;
            color: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          @media only screen and (max-width: 480px) {
            .main-table {
              width: 100% !important;
            }
            .movie-card-title {
              font-size: 11px !important;
            }
            .movie-card-desc {
              font-size: 9px !important;
              height: 38px !important;
            }
            .movie-card-btn {
              padding: 6px 12px !important;
              font-size: 8px !important;
            }
          }
        </style>
      </head>
      <body style="font-family:'Inter', -apple-system, sans-serif;background-color:#080009;color:#ffffff;margin:0;padding:40px 0;">
        
        <!-- Main Email Container -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" class="main-table" style="width:600px;margin:0 auto;background-color:#10001a;border:1px solid rgba(255,255,255,0.04);border-radius:28px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.8);">
          
          <!-- Glowing Header Logo -->
          <tr>
            <td style="padding:40px 24px;text-align:center;background:linear-gradient(to bottom, #250207 0%, #10001a 100%);border-bottom:1px solid rgba(240,171,252,0.15);">
              <table align="center" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#f0abfc;border-radius:8px;padding:6px 12px;box-shadow:0 0 15px rgba(240,171,252,0.6);margin-bottom:8px;display:inline-block;">
                    <span style="color:#080009;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:3px;font-style:italic;">STREAMFIND</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="color:rgba(255,255,255,0.4);font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:4px;margin-top:6px;">VIGILANCE HUB ALERT</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Newsletter Body Content -->
          <tr>
            <td style="padding:32px 32px 0 32px;">
              
              <!-- Premium Left-Accent Greeting Block -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#18002a;border-left:4px solid #f0abfc;border-radius:8px;margin-bottom:32px;border-collapse:collapse;">
                <tr>
                  <td style="padding:20px 24px;">
                    <h2 style="margin:0 0 8px 0;font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;text-transform:uppercase;">Hey ${name},</h2>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.65);font-weight:500;">
                      ${isFavGenresAlert 
                        ? `We scanned the multiverse and detected new cinematic blockbusters matching your favorite genres: <strong style="color:#f0abfc;font-weight:700;">${genreListString}</strong>. Check them out below!`
                        : `We scanned the multiverse and detected today's absolute top new movie epic releases across all platforms! Check them out below!`
                      }
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Single Table Movie Cards Grid -->
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:0 auto;table-layout:fixed;border-collapse:collapse;">
                ${movieCards}
              </table>
              
              <!-- Manage Preferences CTA -->
              <div style="text-align:center;padding:32px 0 40px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <a href="${siteUrl}/profile" target="_blank" style="display:inline-block;color:rgba(255,255,255,0.4);text-decoration:none;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);padding:10px 24px;border-radius:8px;box-shadow:0 4px 8px rgba(0,0,0,0.2);">
                  MANAGE SUBSCRIPTION PREFERENCES
                </a>
              </div>
              
            </td>
          </tr>
          
          <!-- Muted Cinema Footer -->
          <tr>
            <td style="padding:32px 24px;text-align:center;background-color:#080009;border-top:1px solid rgba(255,255,255,0.02);">
              <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);font-weight:500;line-height:1.6;">
                ${isFavGenresAlert
                  ? 'You are receiving this automated alert because you subscribed to "Your Favorite Genres" alerts inside your StreamFind Profile settings.'
                  : 'You are receiving this automated alert because you subscribed to "New Release" alerts inside your StreamFind Profile settings.'
                }
              </p>
              <p style="margin:16px 0 0 0;font-size:9px;color:rgba(255,255,255,0.15);font-weight:bold;text-transform:uppercase;letter-spacing:2px;">
                © 2026 STREAMFIND. ALL RIGHTS RESERVED.
              </p>
            </td>
          </tr>
          
        </table>
        
      </body>
    </html>
  `;
}
