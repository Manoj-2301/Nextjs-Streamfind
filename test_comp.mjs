import { Redis } from '@upstash/redis';
import zlib from 'zlib';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function test() {
  const data = { hello: "world", large: "a".repeat(10000) };
  const jsonStr = JSON.stringify(data);
  const compressed = zlib.gzipSync(Buffer.from(jsonStr)).toString('base64');
  
  await redis.set('test_comp', compressed);
  const retrieved = await redis.get('test_comp');
  
  const decompressed = zlib.gunzipSync(Buffer.from(retrieved, 'base64')).toString('utf-8');
  const parsed = JSON.parse(decompressed);
  
  console.log("Original length:", jsonStr.length);
  console.log("Compressed length:", compressed.length);
  console.log("Match:", parsed.large === data.large);
}

test();
