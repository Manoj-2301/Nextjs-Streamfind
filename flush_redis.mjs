import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function flush() {
  console.log("Flushing Redis Database...");
  await redis.flushdb();
  console.log("Redis Database Flushed!");
}

flush();
