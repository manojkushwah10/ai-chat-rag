// In-memory, per-process rate limiter. This resets on every cold start/redeploy and is
// not shared across serverless instances — it's a best-effort abuse guard for a small
// testing deployment, not a substitute for a shared store (e.g. Upstash Redis) in production.

import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function cleanup(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  if (buckets.size > 5000) cleanup(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function rateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: `Too many requests. Please wait ${retryAfterSeconds}s and try again.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
