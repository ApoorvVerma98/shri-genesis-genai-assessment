export interface RetryDecision {
  retryable: boolean;
  retryAfterMs: number;
  status?: number;
  rateLimitHint?: string;
}

/** Parse Retry-After (seconds or HTTP-date) and common rate-limit headers. */
export function parseRetryAfterMs(headers: Headers): number | undefined {
  const raw = headers.get("retry-after");
  if (raw) {
    const asNum = Number(raw);
    if (!Number.isNaN(asNum) && asNum >= 0) return Math.min(asNum * 1000, 120_000);
    const when = Date.parse(raw);
    if (!Number.isNaN(when)) return Math.min(Math.max(0, when - Date.now()), 120_000);
  }
  const resetMs = headers.get("x-ratelimit-reset-requests");
  if (resetMs) {
    const n = Number(resetMs);
    if (!Number.isNaN(n) && n >= 0) return Math.min(n * 1000, 120_000);
  }
  return undefined;
}

export function classifyHttpFailure(status: number, body: string, headers: Headers): RetryDecision {
  const retryable = status === 429 || status === 503 || status === 502;
  const headerDelay = parseRetryAfterMs(headers);
  const base = headerDelay ?? (status === 429 ? 2000 : 1000);
  const rateLimitHint = headers.get("x-ratelimit-remaining-tokens") ?? headers.get("x-ratelimit-remaining");
  return {
    retryable,
    retryAfterMs: base,
    status,
    rateLimitHint: rateLimitHint ? `remaining=${rateLimitHint}` : undefined,
  };
}

export function computeBackoffMs(
  attempt: number,
  retryAfterMs: number,
  baseMs: number,
  maxMs: number,
): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(maxMs, Math.max(retryAfterMs, exp) + jitter);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function formatAiHttpError(
  status: number,
  body: string,
  decision: RetryDecision,
  attempts: number,
  maxAttempts: number,
): string {
  const snippet = body.slice(0, 200);
  const parts = [`AI HTTP ${status}: ${snippet}`];
  if (decision.rateLimitHint) parts.push(decision.rateLimitHint);
  if (decision.retryable && attempts < maxAttempts) {
    parts.push(`retryable after ${decision.retryAfterMs}ms`);
  }
  return parts.join(" | ");
}
