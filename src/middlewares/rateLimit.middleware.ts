import type { RequestHandler } from 'express';
import { AppError } from '../utils/appError.js';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window, in-memory limiter keyed by client IP.
 * ponytail: per-process only — swap for a Redis-backed limiter if the API is
 * ever scaled horizontally; that is the ceiling here.
 */
export function rateLimit({ windowMs, max }: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, Bucket>();
  let lastPrune = Date.now();

  return (req, _res, next) => {
    const now = Date.now();

    if (now - lastPrune > windowMs) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
      lastPrune = now;
    }

    const key = req.ip ?? 'unknown';
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > max) {
      next(AppError.tooManyRequests());
      return;
    }

    next();
  };
}

/** Credential endpoints: 30 attempts per 15 minutes per IP. */
export const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });