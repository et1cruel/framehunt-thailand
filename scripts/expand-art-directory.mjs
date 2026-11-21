import fs from "node:fs";
const url = "https://www.rama9art.org/galleries?list_name_group=gallery";
const response = await fetch(url);
if (!response.ok) throw new Error(`Gallery directory returned ${response.status}`);
const html = (await response.text()).replaceAll('\\"', '"');
const data = JSON.parse(fs.readFileSync("src/data/activity-directory.json", "utf8"));
const locations = JSON.parse(fs.readFileSync("src/data/locations.generated.json", "utf8")).locations;
const provinces = new Set(JSON.parse(fs.readFileSync("src/data/provinces.json", "utf8")).provinces.map((p) => p.name_th));
const norm = (s) => (s || "").toLocaleLowerCase("th").replace(/[^\p{L}\p{N}]/gu, "");
const seen = new Set([...data.places.map((p) => `${norm(p.name)}|${norm(p.province)}`), ...locations.flatMap((p) => [p.name_th, p.name_en].filter(Boolean).map((n) => `${norm(n)}|${norm(p.province_th)}`))]);
let added = 0;
for (const match of html.matchAll(/\{"image_url":.*?"opening_status":(?:"[^"]*"|null)\}/g)) {
  let record;
  try { record = JSON.parse(match[0]); } catch { continue; }
  if (record.opening_status !== "active" || !provinces.has(record.province_th) || (!record.title_en && !record.title_th)) continue;
  const name = record.title_en || record.title_th;
  const keys = [record.title_th, record.title_en].filter(Boolean).map((n) => `${norm(n)}|${norm(record.province_th)}`);
  if (keys.some((key) => seen.has(key))) continue;
  keys.forEach((key) => seen.add(key));
  data.places.push({ name, province: record.province_th, categories: ["art"], sourceUrl: url });
  added++;
}
fs.writeFileSync("src/data/activity-directory.json", `${JSON.stringify(data, null, 2)}\n`);
console.log(`Added ${added} art spaces`);
