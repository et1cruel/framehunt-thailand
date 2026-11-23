import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
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
const reportTarget = process.argv.find((arg) => arg.startsWith("--write-report="))?.slice("--write-report=".length);

function persistAudit(payload) {
  if (!reportTarget) return;
  const target = path.resolve(root, reportTarget);
  if (!target.startsWith(root + path.sep)) throw new Error("Audit report path must stay inside the repository.");
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(payload, null, 2) + "\n");
  console.log("Audit report saved: " + path.relative(root, target));
}

async function inspectImageUrl(url, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const headers = {
      "user-agent": "Framehunt directory image audit/1.0",
      accept: "image/avif,image/webp,image/*,*/*;q=0.5",
    };
    const options = { headers, signal: AbortSignal.timeout(4000) };
    try {
      let response = await fetch(url, { ...options, method: "HEAD" });
      if ([403, 405, 501].includes(response.status)) {
        response = await fetch(url, { ...options, headers: { ...headers, range: "bytes=0-0" } });
      }
      const type = response.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "";
      const status = response.status;
      await response.body?.cancel();
      if (response.ok && type.startsWith("image/")) return { status: "reachable image", http: status, type, attempts: attempt + 1 };
      if ([408, 425, 429].includes(status) || status >= 500) {
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
          continue;
        }
        return { status: "blocked or unknown", http: status, type, attempts: attempt + 1 };
      }
      if (status === 403) return { status: "blocked or unknown", http: status, type, attempts: attempt + 1 };
      if (response.ok) return { status: "not an image response", http: status, type, attempts: attempt + 1 };
      return { status: "unavailable", http: status, type, attempts: attempt + 1 };
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        return { status: "blocked or unknown", error: error.name, attempts: attempt + 1 };
      }
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }
      return { status: "blocked or unknown", error: error instanceof Error ? error.name : "request failed", attempts: attempt + 1 };
    }
  }
  return { status: "blocked or unknown", attempts: retries + 1 };
}

if (process.argv.includes("--check-urls")) {
  const results = new Map();
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit=") || arg.startsWith("--limit-urls="));
  const urlLimit = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 1) : uniqueUrls.length;
  const selectedUrls = urlLimit >= uniqueUrls.length
    ? uniqueUrls
    : Array.from({ length: urlLimit }, (_, index) => uniqueUrls[Math.floor(index * uniqueUrls.length / urlLimit)]);
  const checkpointPath = path.join(root, "data", "reports", ".directory-cover-audit-checkpoint.json");
  mkdirSync(path.dirname(checkpointPath), { recursive: true });
  const urlSignature = createHash("sha256").update(selectedUrls.join("\n")).digest("hex");
  if (existsSync(checkpointPath)) {
    try {
      const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8"));
      if (checkpoint.urlSignature === urlSignature) {
        for (const [url, result] of Object.entries(checkpoint.imageUrls ?? {})) results.set(url, result);
        console.log(`Resuming image URL audit at ${results.size}/${selectedUrls.length}.`);
      }
    } catch {
      // A partial checkpoint is ignored and rebuilt.
    }
  }
  const retryArg = process.argv.find((arg) => arg.startsWith("--retries="));
  const retries = retryArg ? Math.max(0, Math.min(3, Number(retryArg.split("=")[1]) || 0)) : 1;
  let next = 0;
  let completed = results.size;
  const workers = Array.from({ length: Math.min(16, selectedUrls.length) }, async () => {
    while (next < selectedUrls.length) {
      const url = selectedUrls[next++];
      if (results.has(url)) continue;
      results.set(url, await inspectImageUrl(url, retries));
      completed++;
      if (completed % 50 === 0) {
        writeFileSync(checkpointPath, JSON.stringify({ urlSignature, imageUrls: Object.fromEntries(results) }));
        if (!process.argv.includes("--json")) console.log(`Checked ${completed}/${selectedUrls.length} remote image URLs.`);
      }
    }
  });
  await Promise.all(workers);
  if (existsSync(checkpointPath)) unlinkSync(checkpointPath);

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
  const auditPayload = {
    generatedAt: new Date().toISOString(),
    urlCheck: {
      enabled: true,
      selected: selectedUrls.length,
      available: uniqueUrls.length,
      complete: selectedUrls.length === uniqueUrls.length,
      retries,
      concurrency: Math.min(16, selectedUrls.length),
      checkpointed: true,
      note: "A reachable image response confirms URL health only, not place identity or reuse rights.",
    },
    report,
    missing,
    imageUrls: Object.fromEntries(results),
  };
  persistAudit(auditPayload);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(auditPayload, null, 2));
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
} else if (process.argv.includes("--json") || reportTarget) {
  const auditPayload = { generatedAt: new Date().toISOString(), urlCheck: { enabled: false }, report, missing };
  persistAudit(auditPayload);
  if (process.argv.includes("--json")) console.log(JSON.stringify(auditPayload, null, 2));
} else {
  console.table(report);
}

if (process.argv.includes("--strict") && Object.values(report).some(({ missing: missingCount }) => missingCount > 0)) {
  process.exitCode = 1;
}
