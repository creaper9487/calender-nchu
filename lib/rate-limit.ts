interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const cutoff = now - windowMs;
  const arr = buckets.get(key) ?? [];
  let i = 0;
  while (i < arr.length && arr[i] <= cutoff) i++;
  const pruned = i > 0 ? arr.slice(i) : arr;

  if (pruned.length >= limit) {
    buckets.set(key, pruned);
    return {
      ok: false,
      limit,
      remaining: 0,
      resetAt: pruned[0] + windowMs,
    };
  }

  pruned.push(now);
  buckets.set(key, pruned);
  return {
    ok: true,
    limit,
    remaining: limit - pruned.length,
    resetAt: pruned[0] + windowMs,
  };
}

export function clientKey(request: Request, routeKey: string): string {
  const xff = request.headers.get("x-forwarded-for") || "";
  const ip =
    xff.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  return `${routeKey}|${ip}`;
}

export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.max(
    1,
    Math.ceil((result.resetAt - Date.now()) / 1000),
  );
  return new Response(
    JSON.stringify({ ok: false, error: "Too many requests" }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": String(result.limit),
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(result.resetAt),
        "retry-after": String(retryAfter),
      },
    },
  );
}

// Test hook: reset buckets between tests
export function _resetBucketsForTest(): void {
  buckets.clear();
}
