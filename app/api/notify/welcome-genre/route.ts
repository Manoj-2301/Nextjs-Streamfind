/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { checkRateLimit } from '@/lib/rateLimit';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

const GENRE_MAP: Record<string, number> = {
  'Action': 28,
  'Adventure': 12,
  'Animation': 16,
  'Comedy': 35,
  'Crime': 80,
  'Documentary': 99,
  'Drama': 18,
  'Family': 10751,
  'Fantasy': 14,
  'History': 36,
  'Horror': 27,
  'Music': 10402,
  'Mystery': 9648,
  'Romance': 10749,
  'Sci-Fi': 878,
  'TV Movie': 10770,
  'Thriller': 53,
  'War': 10752,
  'Western': 37,
  'Neo-Noir': 80, 
  'Cyberpunk': 878,
  'Post-Apocalyptic': 878,
  'Synthwave': 10402
};

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!checkRateLimit(ip, 10, 60000)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const body = await request.json();
    const { uid, email, displayName, genre } = body;

    if (!email || !genre) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const genreId = GENRE_MAP[genre] || 28; // Default to Action if unknown

    // Fetch the absolute top trending movie for this specific genre
    const tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1`;
    const tmdbRes = await fetch(tmdbUrl);
    const tmdbData = await tmdbRes.json();
    const rawMovies = tmdbData.results || [];

    if (rawMovies.length === 0) {
      return NextResponse.json({ error: 'No movies found for this genre' }, { status: 404 });
    }

    // Take the #1 top movie
    const topMovie = rawMovies[0];

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const siteUrl = `${protocol}://${host}`;

    const posterUrl = topMovie.poster_path ? `https://image.tmdb.org/t/p/w500${topMovie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster';
    
    const htmlContent = `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-w-xl mx-auto bg-black text-white p-8 rounded-xl border border-[#333]">
        <h1 style="color: #f0abfc; font-weight: 900; text-transform: uppercase; font-size: 24px; margin-bottom: 20px;">
          Welcome to the ${genre} Universe, ${displayName}!
        </h1>
        <p style="color: #ccc; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
          You just added <strong>${genre}</strong> to your favorite genres! To celebrate, we've pulled the absolute top-trending masterpiece in this category just for you.
        </p>
        
        <div style="background-color: #10001a; border: 1px solid #18002a; border-radius: 12px; overflow: hidden; margin-bottom: 30px;">
          <img src="${posterUrl}" alt="${topMovie.title}" style="width: 100%; height: auto; display: block;" />
          <div style="padding: 20px;">
            <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 800;">${topMovie.title}</h2>
            <p style="color: #888; font-size: 14px; margin: 0 0 15px 0;">IMDb: ${topMovie.vote_average}</p>
            <p style="color: #bbb; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
              ${topMovie.overview}
            </p>
            <a href="${siteUrl}/movie/${topMovie.id}" style="display: inline-block; background-color: #f0abfc; color: #080009; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
              View Details
            </a>
          </div>
        </div>

        <p style="color: #666; font-size: 12px; text-align: center; margin-top: 40px;">
          Sent from StreamFind. You can manage your genre alerts in your profile settings.
        </p>
      </div>
    `;

    // Configure Nodemailer
    const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    let transporter;
    if (emailProvider === 'gmail') {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY,
        },
      });
    }

    await transporter.sendMail({
      from: emailProvider === 'gmail' ? gmailUser : 'StreamFind Alerts <onboarding@resend.dev>',
      to: email,
      subject: `🎬 Your first ${genre} recommendation is here!`,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, message: 'Welcome email sent successfully' });
  } catch (error: any) {
    console.error('Error sending welcome genre email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
