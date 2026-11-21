import fs from "node:fs";
import { JSDOM } from "jsdom";
const shops = JSON.parse(fs.readFileSync("src/data/secondhand-shops.json", "utf8")).shops;
const covers = JSON.parse(fs.readFileSync("src/data/directory-covers.json", "utf8"));
const norm = (s) => (s || "").toLocaleLowerCase("th").replace(/[^\p{L}\p{N}]/gu, "");
const groups = Map.groupBy(shops.filter((s) => !s.source.includes("facebook.com") && !s.source.includes("youtube.com")), (s) => s.source);
let added = 0;
for (const [source, entries] of groups) {
  try {
    const response = await fetch(source, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) continue;
    const dom = new JSDOM(await response.text());
    const imgs = [...dom.window.document.querySelectorAll("img")];
    for (const shop of entries) {
      const key = norm(shop.name);
      const image = imgs.find((img) => key.length >= 7 && norm(img.alt) === key && (img.getAttribute("data-src") || img.getAttribute("src")));
      if (!image) continue;
      const url = new URL(image.getAttribute("data-src") || image.getAttribute("src"), source);
      if (url.protocol !== "https:") continue;
      covers[`${shop.name}|${shop.province}`] = { url: url.href, credit: new URL(source).hostname, source };
      added++;
    }
  } catch (error) { console.warn(`${source}: ${error.message}`); }
}
fs.writeFileSync("src/data/directory-covers.json", `${JSON.stringify(covers, null, 2)}\n`);
console.log(`Matched ${added} shop photos by exact alt text.`);
