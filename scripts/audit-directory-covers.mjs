import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const read = (name) => readFileSync(new URL(`../src/data/${name}`, import.meta.url), "utf8");
const json = (name) => JSON.parse(read(`${name}.json`));
const covers = json("directory-covers");
const studios = json("studios-directory").studios;
const activityPlaces = json("activity-directory").places;
const liveProgramsSource = read("live-programs.ts");
const { sceneVenues, programs } = await import(
  "data:text/javascript;charset=utf-8," +
    encodeURIComponent(ts.transpileModule(liveProgramsSource, {
      compilerOptions: { module: ts.ModuleKind.ESNext },
    }).outputText)
);

const activities = [
  ...activityPlaces,
  ...sceneVenues.map((venue) => ({ ...venue, province: "กรุงเทพมหานคร" })),
];
const published = json("locations.generated").locations.filter(({ status }) => status === "published");
const report = {};
const missing = {};
const uses = [];

function hasLocalAsset(url) {
  if (!url?.startsWith("/")) return false;
  let relative;
  try {
    relative = decodeURIComponent(url.split(/[?#]/u, 1)[0].slice(1));
  } catch {
    return false;
  }
  const resolved = path.resolve(publicRoot, relative);
  return resolved.startsWith(`${publicRoot}${path.sep}`) && existsSync(resolved);
}

const resolveCover = (entry, source = entry.sourceUrl ?? entry.source) => {
  const name = entry.name ?? entry.name_th ?? entry.title;
  const province = entry.province_th ?? entry.province;
  if (!name) return undefined;
  return covers[`${name}|${province}`] ?? (source ? covers[source] : undefined);
};

function check(section, entries, getCover) {
  let byName = 0;
  let bySource = 0;
  let missingSource = 0;
  let missingCredit = 0;
  let missingLicense = 0;
  const uncovered = [];

  for (const entry of entries) {
    const cover = getCover(entry);
    const url = cover?.url;
    const isLocal = hasLocalAsset(url);
    const isRemote = typeof url === "string" && url.startsWith("https://") && !url.startsWith("https://images.unsplash.com/");
    const isUsableUrl = isLocal || isRemote;
    const exactKey = covers[`${entry.name ?? entry.name_th ?? entry.title}|${entry.province_th ?? entry.province}`];
    if (!isUsableUrl) {
      uncovered.push({
        name: entry.name ?? entry.name_th ?? entry.title ?? "(untitled)",
        province: entry.province_th ?? entry.province ?? "",
        source: entry.sourceUrl ?? entry.source ?? "",
        reason: !url ? "missing image URL" : url.startsWith("https://images.unsplash.com/") ? "generic stock photo" : url.startsWith("/") ? "missing local asset" : "non-HTTPS image URL",
      });
      continue;
    }

    if (section === "Locations" || exactKey?.url === cover.url) byName++;
    else bySource++;
    if (!cover.source?.startsWith("https://")) missingSource++;
    if (!cover.credit?.trim()) missingCredit++;
    if (!cover.license?.trim()) missingLicense++;
    uses.push({ section, url, kind: isLocal ? "local" : "remote" });
  }

  report[section] = {
    total: entries.length,
    withPhotoUrl: entries.length - uncovered.length,
    matchedByName: byName,
    matchedBySource: bySource,
    missing: uncovered.length,
    missingSource,
    missingCredit,
    missingLicense,
  };
  missing[section] = uncovered;
}

check("Locations", published, (location) => {
  const photo = location.photos.find((item) => item.is_cover) ?? location.photos[0];
  return photo ? { url: photo.image_url, source: photo.source_page_url, credit: photo.attribution_text, license: photo.license } : undefined;
});
check("Secondhand", json("secondhand-shops").shops, resolveCover);
check("Food", json("food-directory").restaurants, resolveCover);
check("Activities", activities, resolveCover);
check("Studios", studios, resolveCover);
check("Live posters", programs, (entry) => entry.poster ? { url: entry.poster, source: entry.source, credit: entry.posterCredit } : undefined);

const normalize = (name) => name.toLocaleLowerCase("th").replace(/[^\p{L}\p{N}]/gu, "");
const locationNames = new Set(published.flatMap((loc) =>
  [loc.name_th, loc.name_en].filter(Boolean).map((name) => `${normalize(name)}|${normalize(loc.province_th)}`),
));
for (const category of ["cave", "art", "temple", "nakhon-pathom"]) {
  const leads = activityPlaces.filter((place) => (
    category === "cave"
      ? place.name.includes("ถ้ำ") && place.categories.includes("nature")
      : place.categories.includes(category)
  ) && !locationNames.has(`${normalize(place.name.split(" · ")[0])}|${normalize(place.province)}`));
  check(`Collection leads: ${category}`, leads, resolveCover);
}

const uniqueUrls = [...new Set(uses.filter(({ kind }) => kind === "remote").map(({ url }) => url))];

async function inspectImageUrl(url) {
  const options = {
    headers: { "user-agent": "Framehunt directory image audit/1.0", accept: "image/avif,image/webp,image/*,*/*;q=0.5" },
    signal: AbortSignal.timeout(4000),
  };
  try {
    let response = await fetch(url, { ...options, method: "HEAD" });
    if ([403, 405, 501].includes(response.status)) {
      response = await fetch(url, { ...options, headers: { ...options.headers, range: "bytes=0-0" } });
    }
    const type = response.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "";
    await response.body?.cancel();
    if (response.ok && type.startsWith("image/")) return { status: "reachable image", http: response.status, type };
    if (response.status === 403 || response.status === 429 || response.status >= 500) {
      return { status: "blocked or unknown", http: response.status, type };
    }
    if (response.ok) return { status: "not an image response", http: response.status, type };
    return { status: "unavailable", http: response.status, type };
  } catch (error) {
    return { status: "blocked or unknown", error: error instanceof Error ? error.name : "request failed" };
  }
}

if (process.argv.includes("--check-urls")) {
  const results = new Map();
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit-urls="));
  const urlLimit = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 1) : uniqueUrls.length;
  const selectedUrls = urlLimit >= uniqueUrls.length
    ? uniqueUrls
    : Array.from({ length: urlLimit }, (_, index) => uniqueUrls[Math.floor(index * uniqueUrls.length / urlLimit)]);
  let next = 0;
  let completed = 0;
  const workers = Array.from({ length: Math.min(32, selectedUrls.length) }, async () => {
    while (next < selectedUrls.length) {
      const url = selectedUrls[next++];
      results.set(url, await inspectImageUrl(url));
      completed++;
      if (completed % 50 === 0 && !process.argv.includes("--json")) console.log(`Checked ${completed}/${selectedUrls.length} remote image URLs.`);
    }
  });
  await Promise.all(workers);

  for (const [section, summary] of Object.entries(report)) {
    const sectionUses = uses.filter((item) => item.section === section);
    const sectionUrls = [...new Set(sectionUses.map((item) => item.url))];
    const health = {};
    for (const healthResult of sectionUrls.map((item) => hasLocalAsset(item) ? { status: "local asset present" } : results.get(item)).filter(Boolean)) {
      health[healthResult.status] = (health[healthResult.status] ?? 0) + 1;
    }
    summary.uniqueImageUrls = sectionUrls.length;
    summary.checkedImageUrls = sectionUrls.filter((url) => url.startsWith("/") || results.has(url)).length;
    summary.notCheckedImageUrls = summary.uniqueImageUrls - summary.checkedImageUrls;
    summary.imageHealth = health;
  }
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ report, missing, imageUrls: Object.fromEntries(results) }, null, 2));
  } else {
    console.table(Object.fromEntries(Object.entries(report).map(([section, summary]) => [section, {
      total: summary.total,
      withPhotoUrl: summary.withPhotoUrl,
      missing: summary.missing,
      missingSource: summary.missingSource,
      missingCredit: summary.missingCredit,
      missingLicense: summary.missingLicense,
      uniqueImageUrls: summary.uniqueImageUrls,
      checked: summary.checkedImageUrls,
      notChecked: summary.notCheckedImageUrls,
      reachable: summary.imageHealth["reachable image"] ?? 0,
      unavailable: summary.imageHealth.unavailable ?? 0,
      notImage: summary.imageHealth["not an image response"] ?? 0,
      blockedOrUnknown: summary.imageHealth["blocked or unknown"] ?? 0,
    }])));
    console.log("URL checks confirm an image response only; they do not verify place identity or reuse rights.");
  }
} else if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ report, missing }, null, 2));
} else {
  console.table(report);
}

if (process.argv.includes("--strict") && Object.values(report).some(({ missing: missingCount }) => missingCount > 0)) {
  process.exitCode = 1;
}
