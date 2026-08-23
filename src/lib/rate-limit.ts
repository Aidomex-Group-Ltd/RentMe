/**
 * In-memory sliding-window rate limiter for Next.js Edge Middleware.
 *
 * Works in Edge runtime (no Node.js APIs). Resets on process restart,
 * which is fine for burst protection — the main goal is preventing
 * brute-force login, registration spam, and property-listing floods.
 *
 * For distributed rate limiting behind multiple pods, use the
 * k3s Ingress rate-limit annotations already in k8s/base/ingress.yaml.
 */

interface RateLimitEntry {
  /** Timestamps of requests within the current window (ms since epoch). */
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

/** Evict stale windows every 5 minutes to prevent memory leaks. */
let lastEviction = Date.now();
const EVICT_INTERVAL = 5 * 60 * 1000;

function evict(now: number) {
  if (now - lastEviction < EVICT_INTERVAL) return;
  lastEviction = now;
  const cutoff = now - 60_000; // 1 minute ago
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed within the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Key used to identify the client. Defaults to IP. */
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check rate limit for a given key (typically client IP).
 * Returns whether the request is allowed and metadata for response headers.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  evict(now);

  const key = `${config.keyPrefix || "rl"}:${identifier}`;
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  const windowStart = now - config.windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);
  const resetMs =
    entry.timestamps.length > 0
      ? entry.timestamps[0] + config.windowMs - now
      : config.windowMs;

  if (entry.timestamps.length >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetMs };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: remaining - 1, resetMs };
}

/** Read the real client IP from forwarded headers (nginx / k3s ingress). */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Pre-configured rate limit tiers for different endpoint types. */
export const RateLimits = {
  /** Auth endpoints: login, register — 10 req/min per IP */
  auth: {
    maxRequests: 10,
    windowMs: 60_000,
    keyPrefix: "auth",
  },
  /** Property creation — 5 req/min per IP */
  propertyCreate: {
    maxRequests: 5,
    windowMs: 60_000,
    keyPrefix: "prop",
  },
  /** Upload endpoint — 20 req/min per IP */
  upload: {
    maxRequests: 20,
    windowMs: 60_000,
    keyPrefix: "upload",
  },
  /** Listing reports — 8 req / 10 min per IP to slow abuse */
  reports: {
    maxRequests: 8,
    windowMs: 10 * 60_000,
    keyPrefix: "reports",
  },
  /** General API reads — 60 req/min per IP */
  apiRead: {
    maxRequests: 60,
    windowMs: 60_000,
    keyPrefix: "api",
  },
  /** Chatbot — 30 req/min per IP */
  chatbot: {
    maxRequests: 30,
    windowMs: 60_000,
    keyPrefix: "chatbot",
  },
  /** Inspections — 10 req/min per IP */
  inspections: {
    maxRequests: 10,
    windowMs: 60_000,
    keyPrefix: "inspect",
  },
  /** Message sends — 30/min per user (enforced route-side, keyed by userId) */
  messages: {
    maxRequests: 30,
    windowMs: 60_000,
    keyPrefix: "msg",
  },
} as const;
