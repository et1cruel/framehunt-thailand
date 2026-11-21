import fs from "node:fs";
const file = "src/data/directory-covers.json";
const covers = JSON.parse(fs.readFileSync(file, "utf8"));
const places = JSON.parse(fs.readFileSync("src/data/activity-directory.json", "utf8")).places;
const candidates = places.filter((p) => p.categories.includes("nature") && (p.lat && p.lon || p.province === "กรุงเทพมหานคร"));
let added = 0;
for (let i = 0; i < candidates.length; i += 40) {
  const batch = candidates.slice(i, i + 40);
  const names = batch.map((p) => p.name.split(" · ")[0]);
  const url = new URL("https://th.wikipedia.org/w/api.php");
  Object.entries({ action: "query", format: "json", prop: "pageimages|coordinates", piprop: "thumbnail", pithumbsize: "500", titles: names.join("|") }).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const json = await fetch(url).then((r) => r.json());
    for (const page of Object.values(json.query.pages)) {
      if (!page.thumbnail?.source || !page.coordinates?.[0]) continue;
      const { lat, lon } = page.coordinates[0];
      const item = batch.find((p) => p.name.split(" · ")[0] === page.title && (p.lat && p.lon ? Math.abs(p.lat - lat) < 0.03 && Math.abs(p.lon - lon) < 0.03 : p.province === "กรุงเทพมหานคร" && lat > 13.5 && lat < 14.0 && lon > 100.3 && lon < 100.95));
      if (!item) continue;
      const match = page.thumbnail.source.match(/\/thumb\/[^/]+\/[^/]+\/([^/]+)\//);
      if (!match) continue;
      const imageTitle = `File:${decodeURIComponent(match[1]).replaceAll("_", " ")}`;
      const infoUrl = new URL("https://commons.wikimedia.org/w/api.php");
      Object.entries({ action: "query", format: "json", prop: "imageinfo", iiprop: "url|extmetadata", titles: imageTitle }).forEach(([k, v]) => infoUrl.searchParams.set(k, v));
      const info = await fetch(infoUrl).then((r) => r.json());
      const image = Object.values(info.query.pages)[0]?.imageinfo?.[0];
      const license = image?.extmetadata?.LicenseShortName?.value;
      if (!image || !license || !/^(CC BY|CC0|Public domain)/i.test(license)) continue;
      const author = (image.extmetadata.Artist?.value || "Wikimedia Commons").replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
      covers[`${item.name}|${item.province}`] = { url: page.thumbnail.source, credit: `${author} · ${license} · Wikimedia Commons`, source: image.descriptionurl };
      added++;
    }
  } catch (error) { console.warn(`Batch ${i}: ${error.message}`); }
}
fs.writeFileSync(file, `${JSON.stringify(covers, null, 2)}\n`);
console.log(`Added ${added} Wikimedia covers.`);
