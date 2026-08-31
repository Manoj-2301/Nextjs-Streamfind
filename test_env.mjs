import { loadEnvConfig } from '@next/env';
loadEnvConfig('./');

console.log(process.env.FIREBASE_ADMIN_PRIVATE_KEY ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.substring(0, 50) : "UNDEFINED");
console.log("Has literal \\n?", process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('\\n'));
console.log("Has actual newline?", process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('\n'));
