import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const cache = process.env.MICHELIN_CACHE_DIR || path.join(process.env.TEMP || "", "framehunt-food-michelin");
const food = JSON.parse(fs.readFileSync(path.join(root, "src/data/food-directory.json"), "utf8"));
const covers = {};
for (let page = 1; page <= 11; page++) {
  const file = path.join(cache, `page-${page}.html`);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(/<a\s+href="(\/th\/en\/[^" ]+\/restaurant\/[^" ]+)"\s+class="image-wrapper[^>]+ci-bg-url="(https:\/\/prod-pics\.guide\.michelin\.com\/[^" ]+)"/g)) {
    const source = `https://guide.michelin.com${match[1]}`;
    if (food.restaurants.some((restaurant) => restaurant.source === source)) covers[source] = { url: match[2].replaceAll("&amp;", "&"), credit: "MICHELIN Guide", source };
  }
}
const locations = JSON.parse(fs.readFileSync(path.join(root, "src/data/locations.generated.json"), "utf8")).locations;
const norm = (s) => (s || "").toLocaleLowerCase("th").replace(/[^\p{L}\p{N}]/gu, "");
const datasets = [JSON.parse(fs.readFileSync(path.join(root, "src/data/secondhand-shops.json"), "utf8")).shops, JSON.parse(fs.readFileSync(path.join(root, "src/data/activity-directory.json"), "utf8")).places];
for (const item of datasets.flat()) {
  const location = locations.find((candidate) => norm(candidate.province_th) === norm(item.province) && [candidate.name_th, candidate.name_en].some((name) => norm(name) && norm(name) === norm(item.name)));
  const photo = location?.photos?.find((p) => p.is_cover && p.is_verified) || location?.photos?.find((p) => p.is_verified);
  if (photo) covers[`${item.name}|${item.province}`] = { url: photo.thumb_url || photo.image_url, credit: photo.attribution_text, source: photo.source_page_url };
}
fs.writeFileSync(path.join(root, "src/data/directory-covers.json"), `${JSON.stringify(covers, null, 2)}\n`);
console.log(`Found ${Object.keys(covers).length} linked covers.`);
