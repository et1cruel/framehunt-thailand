/**
 * Shared helpers for the FRAMEHUNT ingestion pipeline.
 * Everything here talks to public, documented APIs (Wikidata, Wikimedia Commons).
 * Responses are cached on disk so re-runs are reproducible and polite.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.resolve("scripts/ingest/.cache/http");
const UA = process.env.WIKIMEDIA_USER_AGENT || "FrameHuntThailand/0.1 (https://framehunt.co; ops@framehunt.co)";

let lastRequest = 0;
const MIN_GAP_MS = 140;

export async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, MIN_GAP_MS - (now - lastRequest));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
}

function cachePath(url) {
  const h = createHash("sha1").update(url).digest("hex");
  return path.join(CACHE_DIR, `${h}.json`);
}

export async function fetchJson(url, { retries = 3, cache = true } = {}) {
  const file = cachePath(url);
  if (cache) {
    try {
      return JSON.parse(await readFile(file, "utf8"));
    } catch {
      /* cache miss */
    }
  }

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await throttle();
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          "Api-User-Agent": UA,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const json = await res.json();
      if (cache) {
        await mkdir(CACHE_DIR, { recursive: true });
        await writeFile(file, JSON.stringify(json));
      }
      return json;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1) ** 2));
    }
  }
  throw lastErr;
}

export const WIKIDATA = "https://www.wikidata.org/w/api.php";
export const COMMONS = "https://commons.wikimedia.org/w/api.php";

export function qs(params) {
  const sp = new URLSearchParams({ format: "json", origin: "*", ...params });
  return sp.toString();
}

/** Strip HTML tags/entities from Commons extmetadata values. */
export function stripHtml(input) {
  if (!input) return "";
  return String(input)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const LICENSE_ALLOW = [
  /^cc0/i,
  /^public domain/i,
  /^pd\b/i,
  /^pd-/i,
  /^cc[ -]by(-sa)?([ -]?\d|$)/i,
  /^cc[ -]by(-sa)?[ -]/i,
  /^attribution/i,
];

const LICENSE_DENY = /\b(nc|nd|non-?commercial|no-?deriv|non-?free|fair[ -]?use|copyright|all rights reserved|gfdl)\b/i;

/**
 * Decide whether a Commons license string is safe for commercial use.
 * We only auto-accept licenses that permit commercial reuse AND adaptation.
 */
export function licenseDecision(shortName, licenseUrl = "") {
  const raw = `${shortName || ""} ${licenseUrl || ""}`.trim();
  if (!raw) return { ok: false, reason: "missing-license" };
  if (LICENSE_DENY.test(raw)) return { ok: false, reason: "restricted-license" };
  if (LICENSE_ALLOW.some((re) => re.test(raw))) return { ok: true, reason: "allowed" };
  return { ok: false, reason: "unrecognised-license" };
}

/** dHash (64-bit) from an image buffer, returned as 16 hex chars. */
export async function perceptualHash(buffer) {
  try {
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(buffer)
      .resize(9, 8, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let bits = 0n;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const left = data[y * 9 + x];
        const right = data[y * 9 + x + 1];
        bits = (bits << 1n) | (left > right ? 1n : 0n);
      }
    }
    return bits.toString(16).padStart(16, "0");
  } catch {
    return null;
  }
}

export function hammingHex(a, b) {
  if (!a || !b) return 64;
  let x = BigInt("0x" + a) ^ BigInt("0x" + b);
  let count = 0;
  while (x) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

export function slugify(input) {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

export async function downloadBuffer(url, { maxBytes = 8_000_000, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await throttle();
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Api-User-Agent": UA },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`image HTTP ${res.status}`);
      if (!res.ok) throw new Error(`image HTTP ${res.status}`);
      const len = Number(res.headers.get("content-length") || 0);
      if (len && len > maxBytes) throw new Error("image too large");
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > maxBytes) throw new Error("image too large");
      if (!res.headers.get("content-type")?.startsWith("image/")) {
        throw new Error(`not an image: ${res.headers.get("content-type")}`);
      }
      return buf;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1) ** 2));
    }
  }
  throw lastErr;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
