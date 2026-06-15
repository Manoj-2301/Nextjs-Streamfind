/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { hostname: 'image.tmdb.org' },
      { hostname: 'lh3.googleusercontent.com' },
      { hostname: 'placehold.co' },
      { hostname: 'www.edigitalagency.com.au' },
      { hostname: 'upload.wikimedia.org' },
      { hostname: 'i.ibb.co' },
      { hostname: 'res.cloudinary.com' },
      { hostname: 'firebasestorage.googleapis.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 604800,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://apis.google.com https://checkout.razorpay.com https://www.gstatic.com; worker-src 'self' https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://player.vimeo.com https://firebase.google.com https://api.razorpay.com https://*.firebaseapp.com https://accounts.google.com; connect-src 'self' https://api.themoviedb.org https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com https://api.razorpay.com https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://*.firebaseapp.com https://accounts.google.com https://apis.google.com;",
          }
        ],
      },
    ];
  },
};

export default nextConfig;
