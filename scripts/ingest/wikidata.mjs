/**
 * Wikidata + Wikipedia resolution.
 * Coordinates and descriptions come from these public sources — never invented.
 */
import { COMMONS, WIKIDATA, fetchJson, qs } from "./lib.mjs";

const THAILAND_QID = "Q869";
const TH_BBOX = { minLat: 5.5, maxLat: 20.5, minLon: 97.0, maxLon: 106.0 };

export function inThailand(lat, lon) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= TH_BBOX.minLat &&
    lat <= TH_BBOX.maxLat &&
    lon >= TH_BBOX.minLon &&
    lon <= TH_BBOX.maxLon
  );
}

async function searchEntities(name, language = "en") {
  const url = `${WIKIDATA}?${qs({
    action: "wbsearchentities",
    search: name,
    language,
    uselang: language,
    type: "item",
    limit: "8",
  })}`;
  const json = await fetchJson(url);
  return (json.search || []).map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description,
  }));
}

async function getEntities(ids) {
  if (!ids.length) return {};
  const url = `${WIKIDATA}?${qs({
    action: "wbgetentities",
    ids: ids.join("|"),
    props: "claims|sitelinks|labels|descriptions",
    languages: "th|en",
    sitefilter: "thwiki|enwiki|commonswiki",
  })}`;
  const json = await fetchJson(url);
  return json.entities || {};
}

function claimValue(entity, prop) {
  const c = entity?.claims?.[prop]?.[0]?.mainsnak;
  if (!c || c.snaktype !== "value") return null;
  return c.datavalue?.value ?? null;
}

function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\u0e00-\u0e7f]/g, "");
}

// If Wikidata supplies a representative image but no category, confirm a
// category through that exact file and a location-specific title.
async function categoryFromMainImage(filename, labels) {
  if (typeof filename !== "string" || !filename) return null;
  const names = new Set(labels.map(normalizeName).filter((name) => name.length >= 8));
  try {
    const json = await fetchJson(
      `${COMMONS}?${qs({
        action: "query",
        titles: `File:${filename}`,
        prop: "categories",
        clshow: "!hidden",
        cllimit: "100",
        redirects: "1",
      })}`,
    );
    const categories = Object.values(json.query?.pages ?? {}).flatMap((page) => page.categories ?? []);
    const category = categories.find((item) => names.has(normalizeName(item.title.replace(/^Category:/, ""))));
    return category?.title.slice(9) ?? null;
  } catch {
    return null;
  }
}

/** Resolve the best Wikidata entity for a seed name. */
export async function resolveEntity(seed) {
  const candidates = seed.qid ? [{ id: seed.qid, label: seed.name_en }] : await searchEntities(seed.name_en);
  if (
    seed.strict &&
    seed.name_th &&
    !candidates.some(({ label }) => similarity(normalizeName(label), normalizeName(seed.name_en)) >= 0.88)
  ) {
    const thai = await searchEntities(seed.name_th, "th");
    const knownIds = new Set(candidates.map(({ id }) => id));
    candidates.push(...thai.filter(({ id }) => !knownIds.has(id)));
  }
  if (!candidates.length) return { error: "no-wikidata-candidate" };

  const entities = await getEntities(candidates.map((c) => c.id));
  const scored = [];

  for (const cand of candidates) {
    const entity = entities[cand.id];
    if (!entity || entity.missing !== undefined) continue;

    const coord = claimValue(entity, "P625");
    if (!coord || !inThailand(coord.latitude, coord.longitude)) continue;

    const country = claimValue(entity, "P17")?.id;
    if (seed.strict && country && country !== THAILAND_QID) continue;
    const enLabel = entity.labels?.en?.value || cand.label || "";
    const thLabel = entity.labels?.th?.value || "";
    const nameScore = seed.qid
      ? 1
      : Math.max(
          similarity(normalizeName(enLabel), normalizeName(seed.name_en)),
          similarity(normalizeName(thLabel), normalizeName(seed.name_th)),
        );

    let score = nameScore * 100;
    if (country === THAILAND_QID) score += 25;
    if (entity.sitelinks?.thwiki) score += 8;
    if (entity.sitelinks?.enwiki) score += 5;
    if (claimValue(entity, "P373")) score += 5;

    scored.push({ entity, coord, score, nameScore, country });
  }

  if (!scored.length) return { error: "no-thai-coordinate-candidate" };
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best.nameScore < (seed.strict ? 0.88 : 0.45)) return { error: "low-name-confidence", best };

  const entity = best.entity;
  const commonsTitle = entity.sitelinks?.commonswiki?.title || "";
  const commonsCategory =
    seed.commonsCategory ||
    claimValue(entity, "P373") ||
    (commonsTitle.startsWith("Category:") ? commonsTitle.slice(9) : null) ||
    (seed.strict
      ? await categoryFromMainImage(claimValue(entity, "P18"), [
          seed.name_en,
          seed.name_th,
          entity.labels?.en?.value,
          entity.labels?.th?.value,
        ])
      : null);

  const result = {
    qid: entity.id,
    latitude: best.coord.latitude,
    longitude: best.coord.longitude,
    country: best.country,
    commonsCategory,
    commonsCategoryUrl: commonsCategory
      ? `${COMMONS}?${qs({ action: "query", list: "categorymembers", cmtitle: `Category:${commonsCategory}`, cmlimit: "1" })}`
      : null,
    sitelinks: {
      th: entity.sitelinks?.thwiki?.title || null,
      en: entity.sitelinks?.enwiki?.title || null,
    },
    labels: {
      th: entity.labels?.th?.value || null,
      en: entity.labels?.en?.value || null,
    },
    descriptions: {
      th: entity.descriptions?.th?.value || null,
      en: entity.descriptions?.en?.value || null,
    },
    confidence: Math.round(best.nameScore * 100),
    score: Math.round(best.score),
  };

  const [thExtract, enExtract] = await Promise.all([
    result.sitelinks.th
      ? wikipediaExtract("th", result.sitelinks.th)
      : seed.strict
        ? null
        : wikipediaSearchExtract("th", seed.name_th),
    result.sitelinks.en
      ? wikipediaExtract("en", result.sitelinks.en)
      : seed.strict
        ? null
        : wikipediaSearchExtract("en", seed.name_en),
  ]);
  result.extract_th = thExtract;
  result.extract_en = enExtract;

  return result;
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (!longer.length) return 0;
  if (longer.includes(shorter) && shorter.length >= 6) return 0.9;
  const dist = levenshtein(a, b);
  return 1 - dist / longer.length;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

async function wikipediaExtract(lang, title) {
  const url = `https://${lang}.wikipedia.org/w/api.php?${qs({
    action: "query",
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
    redirects: "1",
    titles: title,
  })}`;
  try {
    const json = await fetchJson(url);
    const pages = Object.values(json.query?.pages || {});
    const text = pages[0]?.extract || "";
    if (!text) return null;
    return {
      title,
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      text: cleanExtract(text, 900),
      license: "CC BY-SA 4.0",
      retrieved_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Fallback: find a Wikipedia article whose title contains the seed name. */
async function wikipediaSearchExtract(lang, query) {
  if (!query) return null;
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?${qs({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: "4",
    })}`;
    const json = await fetchJson(url);
    const hits = json.query?.search || [];
    const norm = (s) => String(s).replace(/[\s_]/g, "");
    const target = norm(query);
    const hit = hits.find((h) => {
      const t = norm(h.title);
      return t === target || t.includes(target) || target.includes(t);
    });
    if (!hit) return null;
    return await wikipediaExtract(lang, hit.title);
  } catch {
    return null;
  }
}

function cleanExtract(text, max) {
  if (!text) return "";
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf("।"), cut.lastIndexOf("."), cut.lastIndexOf(" "));
  return `${cut.slice(0, lastStop > max * 0.6 ? lastStop : max).trim()}…`;
}
