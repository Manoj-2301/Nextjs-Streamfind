const { loadEnvConfig } = require('@next/env');
loadEnvConfig('./');

const admin = require('firebase-admin');

try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // Replace escaped literal \n with actual newlines for the private key
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase admin initialized successfully");
} catch (error) {
    console.error('Firebase admin initialization error', error);
}
