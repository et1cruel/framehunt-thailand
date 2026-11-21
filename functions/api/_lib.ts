// Shared helpers for Cloudflare Pages Functions under /api/*.
//
// Only server-side bindings are read here. The service-role key never leaves
// this module: it is used for PostgREST calls and never echoed in a response.

export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  /** Optional KV namespace for simple per-IP rate limiting. */
  SUBMISSION_RATE_LIMIT?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
}

export interface FunctionContext {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  next(): Promise<Response>;
  waitUntil(promise: Promise<unknown>): void;
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
} as const;

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });
}

export function error(code: string, message: string, status = 400, details?: unknown): Response {
  return json({ error: code, message, details: details ?? null }, status);
}

export function supabaseConfigured(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function supabaseRestUrl(env: Env, table: string, query = ""): string {
  const base = String(env.SUPABASE_URL).replace(/\/+$/, "");
  return `${base}/rest/v1/${table}${query ? `?${query}` : ""}`;
}

export function supabaseHeaders(env: Env, prefer?: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: String(env.SUPABASE_SERVICE_ROLE_KEY),
    authorization: `Bearer ${String(env.SUPABASE_SERVICE_ROLE_KEY)}`,
    "content-type": "application/json",
    accept: "application/json",
  };
  if (prefer) headers.prefer = prefer;
  return headers;
}

export async function supabaseRequest(env: Env, pathAndQuery: string, init: RequestInit = {}): Promise<Response> {
  return fetch(supabaseRestUrl(env, pathAndQuery), {
    ...init,
    headers: { ...supabaseHeaders(env), ...(init.headers as Record<string, string> | undefined) },
  });
}

/** Trim, collapse control characters, and cap length. Keeps tabs/newlines. */
export function cleanText(value: unknown, max = 4000): string {
  if (typeof value !== "string") return "";
  const stripped = Array.from(value)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      if (code === 9 || code === 10 || code === 13) return true;
      return code > 31 && code !== 127;
    })
    .join("");
  return stripped.trim().slice(0, max);
}

export function isEmail(value: string): boolean {
  return value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isHttpUrl(value: string): boolean {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Parses "lat, lng" and rejects anything outside Thailand. Returns null when
 * the input is empty or invalid.
 */
export function parseThaiCoordinates(value: string): { lat: number; lng: number } | null {
  if (!value) return null;
  const match = value.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < 5 || lat > 21 || lng < 97 || lng > 106) return null;
  return { lat, lng };
}

export function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

/**
 * Fixed-window limiter. Without a KV binding the check is skipped and the
 * response reports `limited: false` so the caller can still serve the request.
 */
export async function rateLimit(
  env: Env,
  request: Request,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<{ limited: boolean; remaining: number }> {
  const kv = env.SUBMISSION_RATE_LIMIT;
  if (!kv) return { limited: false, remaining: limit };
  const key = `${bucket}:${clientIp(request)}`;
  const raw = await kv.get(key);
  const count = raw ? Number.parseInt(raw, 10) || 0 : 0;
  if (count >= limit) return { limited: true, remaining: 0 };
  await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return { limited: false, remaining: Math.max(0, limit - count - 1) };
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return null;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 64 * 1024) return null;
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function methodNotAllowed(allowed: string[]): Response {
  return json({ error: "method_not_allowed", message: `Allowed: ${allowed.join(", ")}` }, 405, {
    allow: allowed.join(", "),
  });
}
