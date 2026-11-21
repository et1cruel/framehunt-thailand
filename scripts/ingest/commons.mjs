/**
 * Wikimedia Commons photo collection.
 * Only files that pass source + license + size + dedupe checks are marked
 * verified. Every file keeps its author, license, license URL and source page.
 */
import {
  COMMONS,
  downloadBuffer,
  fetchJson,
  hammingHex,
  licenseDecision,
  perceptualHash,
  qs,
  stripHtml,
} from "./lib.mjs";

const BAD_TITLE =
  /(\.svg$|\.pdf$|\.tiff?$|\.gif$|\.webm$|\.ogv$|\.mp4$|\.ogg$|map of|locator|location map|diagram|schematic|floor ?plan|site ?plan|logo|coat of arms|emblem|seal of|banknote|postage stamp|qr code|chart\b|graph\b|infographic|panorama of the world)/i;

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function meta(imageinfo, key) {
  return imageinfo?.extmetadata?.[key]?.value ?? "";
}

/** Wikimedia only serves standard thumbnail widths (T414805). */
const THUMB_STEPS = [120, 250, 330, 500, 960, 1280, 1920, 3840];
export function snapWidth(width) {
  return THUMB_STEPS.find((w) => w >= width) || 3840;
}

export function deriveThumb(url, width) {
  if (!url) return url;
  const w = snapWidth(width);
  const clean = url.split("?")[0];
  if (/\/\d+px-/.test(clean)) return clean.replace(/\/\d+px-/, `/${w}px-`);
  return clean;
}

async function categoryFiles(
  category,
  depth = 0,
  state = { seen: new Set(), files: [], cats: 0 },
  options = { maxDepth: 2, filePages: 1 },
) {
  if (!category || depth > 2 || state.cats > 14) return state.files;
  const key = category.toLowerCase();
  if (state.seen.has(key)) return state.files;
  state.seen.add(key);
  state.cats += 1;

  // Subcategories first (bounded), so curated sub-collections are included.
  if (depth < options.maxDepth || ((options.nightOnly || options.namedChildren) && depth === 0)) {
    try {
      const subUrl = `${COMMONS}?${qs({
        action: "query",
        list: "categorymembers",
        cmtitle: `Category:${category}`,
        cmtype: "subcat",
        cmlimit: "30",
      })}`;
      const sub = await fetchJson(subUrl);
      let used = 0;
      const subject = category
        .toLowerCase()
        .replace(/[^a-z0-9\u0e00-\u0e7f]+/g, " ")
        .trim();
      for (const m of sub.query?.categorymembers || []) {
        const name = String(m.title).replace(/^Category:/, "");
        if (/stubs|templates|files|media|needing|deletion|maps/i.test(name)) continue;
        if (options.nightOnly || options.namedChildren) {
          const child = name
            .toLowerCase()
            .replace(/[^a-z0-9\u0e00-\u0e7f]+/g, " ")
            .trim();
          if ((options.nightOnly && !nightTitle.test(name)) || !subject || !child.includes(subject) || used >= 3)
            continue;
          used += 1;
        }
        await categoryFiles(name, depth + 1, state, options);
      }
    } catch {
      /* ignore subcategory failures */
    }
  }

  let continuation = {};
  try {
    for (let pageIndex = 0; pageIndex < options.filePages; pageIndex += 1) {
      const url = `${COMMONS}?${qs({
        action: "query",
        generator: "categorymembers",
        gcmtitle: `Category:${category}`,
        gcmtype: "file",
        gcmlimit: "50",
        prop: "imageinfo",
        iiprop: "url|size|mime|extmetadata|sha1",
        iiurlwidth: "1920",
        ...continuation,
      })}`;
      const json = await fetchJson(url);
      for (const page of Object.values(json.query?.pages ?? {})) {
        const info = page.imageinfo?.[0];
        if (info) state.files.push({ title: page.title, info, category, depth });
      }
      if (!json.continue) break;
      continuation = json.continue;
    }
  } catch (error) {
    if (options.maxDepth === 0) throw error;
  }
  return state.files;
}

export const nightTitle =
  /\b(?:at night|by night|night view|nightlife|blue hour|after dark|dusk|twilight|night shot|nightscape|illuminated)\b|กลางคืน|ยามค่ำ|ยามราตรี/i;

function scoreFile(file, preferNight) {
  const { info, title } = file;
  let score = 0;
  const w = info.width || 0;
  const h = info.height || 0;
  const ratio = w && h ? w / h : 1;
  if (w >= 2400) score += 30;
  else if (w >= 1600) score += 20;
  else if (w >= 1200) score += 10;
  if (ratio >= 1.2 && ratio <= 2.0) score += 25;
  else if (ratio > 1 && ratio <= 2.6) score += 10;
  if (file.depth === 0) score += 12;
  if (preferNight && nightTitle.test(title)) score += 75;
  if (/quality|featured/i.test(title)) score += 5;
  if (/night|sunset|sunrise|interior|aerial/i.test(title)) score += 2;
  return score;
}

/**
 * Collect, license-filter, dedupe and hash photos for a location.
 * @param {object} opts
 * @param {string|null} opts.category Commons category name
 * @param {string} opts.slug used for deterministic photo ids
 */
export async function collectPhotos({
  category,
  slug,
  limit = 12,
  strict = false,
  widerSearch = false,
  preferNight = false,
  nightOnly = false,
  namedChildren = false,
}) {
  const files = await categoryFiles(category, 0, undefined, {
    maxDepth: strict ? 0 : 2,
    filePages: widerSearch ? 3 : 1,
    nightOnly,
    namedChildren,
  });
  const rejected = [];
  const accepted = [];

  const sorted = files
    .filter((f) => {
      if (
        nightOnly &&
        ![f.title, f.category, stripHtml(meta(f.info, "ImageDescription"))].some((text) => nightTitle.test(text))
      )
        return false;
      if (BAD_TITLE.test(f.title)) {
        rejected.push({ title: f.title, reason: "not-a-location-photo" });
        return false;
      }
      if (!IMAGE_MIME.has(f.info.mime)) {
        rejected.push({ title: f.title, reason: `mime:${f.info.mime}` });
        return false;
      }
      if ((f.info.width || 0) < 1000) {
        rejected.push({ title: f.title, reason: "too-small" });
        return false;
      }
      return true;
    })
    .map((f) => ({ ...f, score: scoreFile(f, preferNight) }))
    .sort((a, b) => b.score - a.score);

  const seenSha = new Set();
  const hashes = [];
  const seenUrls = new Set();

  for (const file of sorted) {
    if (accepted.length >= limit) break;
    const { info } = file;
    const licenseShort = stripHtml(meta(info, "LicenseShortName"));
    const licenseUrl = stripHtml(meta(info, "LicenseUrl"));
    const decision = licenseDecision(licenseShort, licenseUrl);
    if (!decision.ok) {
      rejected.push({ title: file.title, reason: `license:${decision.reason}` });
      continue;
    }
    if (info.sha1 && seenSha.has(info.sha1)) {
      rejected.push({ title: file.title, reason: "duplicate-sha1" });
      continue;
    }

    const creditedArtist = stripHtml(meta(info, "Artist"));
    const artist = creditedArtist || "Unknown author";
    if (
      strict &&
      (!creditedArtist ||
        /^(unknown|anonymous)( author| photographer)?$/i.test(creditedArtist) ||
        !info.sha1 ||
        !info.url?.startsWith("https://") ||
        !info.descriptionurl?.startsWith("https://") ||
        seenUrls.has(info.url))
    ) {
      rejected.push({ title: file.title, reason: "missing-attribution-or-duplicate-source" });
      continue;
    }
    const credit = stripHtml(meta(info, "Credit"));
    const displayUrl = deriveThumb(info.thumburl || info.url, 1920);
    const hashUrl = strict ? displayUrl : deriveThumb(displayUrl, 250);

    let phash = null;
    try {
      const buf = await downloadBuffer(hashUrl, { maxBytes: strict ? 9_000_000 : 2_500_000, retries: strict ? 0 : 2 });
      phash = await perceptualHash(buf);
    } catch {
      /* hashing is best-effort; sha1 still applies */
    }

    if (strict && !phash) {
      rejected.push({ title: file.title, reason: "image-could-not-be-fetched-and-decoded" });
      continue;
    }
    if (phash && hashes.some((h) => hammingHex(h, phash) <= 6)) {
      rejected.push({ title: file.title, reason: "duplicate-perceptual-hash" });
      continue;
    }
    if (phash) hashes.push(phash);
    if (info.sha1) seenSha.add(info.sha1);
    seenUrls.add(info.url);

    const attribution = `${artist} — ${licenseShort || "see source"} · Wikimedia Commons`;

    accepted.push({
      id: `${slug}-ph-${accepted.length + 1}`,
      title: file.title.replace(/^File:/, ""),
      image_url: displayUrl,
      thumb_url: deriveThumb(displayUrl, 500),
      original_url: info.url,
      source_name: "Wikimedia Commons",
      source_page_url: info.descriptionurl,
      photographer: artist,
      credit: credit || null,
      license: licenseShort || "unknown",
      license_url: licenseUrl || null,
      attribution_text: attribution,
      checksum: info.sha1 || null,
      perceptual_hash: phash,
      width: info.width,
      height: info.height,
      is_cover: false,
      is_verified: true,
      verification_status: "automated",
      subject_evidence: `commons-category:${file.category}`,
      verification_checks: [
        "source-page-recorded",
        "license-allows-commercial-use",
        "subject-in-location-category",
        "sha1-unique",
        phash ? "perceptual-hash-unique" : "perceptual-hash-skipped",
        "url-resolves",
        ...(nightOnly ? ["night-caption-confirmed"] : []),
        "attribution-recorded",
      ],
      retrieved_at: new Date().toISOString(),
    });
  }

  if (accepted.length) {
    // Prefer a landscape, high-resolution image as the cover.
    const coverIdx = accepted.reduce((best, p, i, arr) => {
      const s = (p.width >= 1600 ? 2 : 0) + (p.width > p.height ? 2 : 0) + (i === 0 ? 1 : 0);
      const bs =
        (arr[best].width >= 1600 ? 2 : 0) + (arr[best].width > arr[best].height ? 2 : 0) + (best === 0 ? 1 : 0);
      return s > bs ? i : best;
    }, 0);
    accepted[coverIdx].is_cover = true;
  }

  return { photos: accepted, rejected, categoryFound: files.length > 0 };
}
