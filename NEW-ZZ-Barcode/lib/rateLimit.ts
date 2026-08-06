type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const CLEANUP_THRESHOLD = 500;

export const checkRateLimit = (key: string, limit: number, windowMs: number) => {
  const now = Date.now();

  // Amortized O(1) lazy cleanup of expired rate limit buckets
  if (buckets.size > CLEANUP_THRESHOLD) {
    for (const [bKey, bVal] of buckets.entries()) {
      if (bVal.resetAt <= now) {
        buckets.delete(bKey);
      }
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) {
    return false;
  }
  bucket.count += 1;
  return true;
};
