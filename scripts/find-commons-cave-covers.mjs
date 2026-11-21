import fs from "node:fs";
const file = "src/data/directory-covers.json";
const covers = JSON.parse(fs.readFileSync(file, "utf8"));
const places = JSON.parse(fs.readFileSync("src/data/activity-directory.json", "utf8")).places;
const candidates = places.filter((p) => p.name.includes("ถ้ำ") && p.categories.includes("nature") && !covers[`${p.name}|${p.province}`]);
const normalize = (s) => (s || "").toLocaleLowerCase("th").replace(/[^\p{L}\p{N}]/gu, "");
let added = 0;
for (const [index, p] of candidates.entries()) {
  const name = p.name.split(" · ")[0].trim();
  if (normalize(name).length < 7) continue;
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({ action: "query", format: "json", generator: "search", gsrnamespace: "6", gsrlimit: "5", gsrsearch: `"${name}"`, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "500" }).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const response = await fetch(url, { headers: { "User-Agent": "FramehuntThailand/1.0 (location photo attribution; info@framehunt.co)" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const pages = Object.values(json.query?.pages || {});
    const page = pages.find((entry) => normalize(entry.title).includes(normalize(name)) && /\.(jpg|jpeg|png)$/i.test(entry.title));
    const info = page?.imageinfo?.[0];
    const license = info?.extmetadata?.LicenseShortName?.value;
    if (!info?.thumburl || !license || !/^(CC BY|CC0|Public domain)/i.test(license)) continue;
    const author = (info.extmetadata.Artist?.value || "Wikimedia Commons").replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
    covers[`${p.name}|${p.province}`] = { url: info.thumburl, credit: `${author} · ${license} · Wikimedia Commons`, source: info.descriptionurl };
    added++;
  } catch (error) { console.warn(`${name}: ${error.message}`); }
  if (index % 25 === 0) console.log(`Checked ${index + 1}/${candidates.length}, matched ${added}`);
  await new Promise((resolve) => setTimeout(resolve, 500));
}
fs.writeFileSync(file, `${JSON.stringify(covers, null, 2)}\n`);
console.log(`Added ${added} exact-name Commons cave images`);
