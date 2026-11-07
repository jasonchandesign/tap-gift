const hits = new Map<string, number[]>();

/** Fixed per-process limit. The app runs as one instance, so memory is enough. */
export function isRateLimited(request: Request, scope: string, limit: number, windowMs: number) {
  // Render sits behind Cloudflare, which sets this one itself. A client can fake x-forwarded-for.
  const ip =
    request.headers.get("true-client-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > limit;
}
