/**
 * A very simple in-memory rate limiter for serverless functions.
 * Note: In Vercel Edge/Serverless functions, this state might be reset occasionally,
 * but it still provides basic DoS protection per-instance.
 */

interface RateLimitTracker {
  count: number;
  resetTime: number;
}

const ipMap = new Map<string, RateLimitTracker>();

export function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = ipMap.get(ip);

  if (!record) {
    ipMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true; // Allowed
  }

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return true; // Allowed
  }

  if (record.count >= limit) {
    return false; // Rate limited
  }

  record.count += 1;
  return true; // Allowed
}
