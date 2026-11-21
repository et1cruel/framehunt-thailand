import { readFile, writeFile } from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";

const read = async (name) => JSON.parse(await readFile(name, "utf8"));
const write = (name, value) => writeFile(name, JSON.stringify(value, null, 2) + "\n");
const shopFile = "src/data/secondhand-shops.json";
const coverFile = "src/data/directory-covers.json";
const shops = await read(shopFile);
const covers = await read(coverFile);
const { restaurants } = await read("src/data/food-directory.json");
const { places } = await read("src/data/activity-directory.json");
const normalize = (name) => name.normalize("NFC").toLocaleLowerCase("th").replace(/[^\p{L}\p{M}\p{N}]/gu, "");
const key = (place) => place.name + "|" + place.province;
const bangkok = "กรุงเทพมหานคร";
const cm = "เชียงใหม่";
const ragtag = "https://ragtagthailand.com/en/pages/shop-list";
const treasure = "https://www.trefac-th.com/location/";
const vintage = "https://www.timeout.com/bangkok/shopping/the-best-vintage-shops-in-bangkok";
const chiangmai = "https://www.timeout.com/chiang-mai/shopping/chiang-mais-best-vintage-stores-and-markets";
const soul = "https://www.nationthailand.com/pr-news/40068202";
const anchors = [];

function shop(name, province, district, source, image, credit, kind = "clothing") {
  let entry = shops.shops.find((item) => item.name === name && item.province === province);
  if (!entry) {
    entry = { name, province, district, kind, source, sourceName: credit, lastObservedAt: null, hours: null,
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name + " " + district + " " + province) };
    shops.shops.unshift(entry);
  }
  if (image) anchors.push({ entry, image, source, credit });
}

for (const [branch, district, image] of [
  ["One Bangkok", "ปทุมวัน", "1_77659884-a051-41a6-8ae5-d99b8af2b43c.jpg"],
  ["CentralWorld", "ปทุมวัน", "Central-World_1.jpg"],
  ["Central Rama 3", "ยานนาวา", "636A3716.jpg"],
  ["Central Village Outlet", "บางพลี", "S__1900566.jpg"],
]) shop("RAGTAG · " + branch, branch === "Central Village Outlet" ? "สมุทรปราการ" : bangkok, district, ragtag,
  "https://ragtagthailand.com/cdn/shop/files/" + image + "?width=640", "RAGTAG Thailand");

for (const [name, district, image] of [
  ["Treasure Factory · สุขุมวิท 39", "วัฒนา", "sukhumvit39"],
  ["Treasure Factory Phra Khanong", "คลองเตย", "phrakhanong"],
  ["Treasure Factory · อ่อนนุช", "สวนหลวง", "onnut-plaza"],
  ["Treasure Factory · พระราม 9", "ห้วยขวาง", "rama9"],
  ["Treasure Factory · บางนา", "บางนา", "bangna"],
]) shop(name, bangkok, district, treasure, "https://www.trefac-th.com/wp-content/uploads/2025/01/branch_" + image + "_01.jpg", "Treasure Factory Thailand");

shop("1981 Soul & Sold · รามคำแหง", bangkok, "บางกะปิ", soul,
  "https://media.nationthailand.com/uploads/images/md/2026/07/3s7QxeZdOup3mY4xHtel.webp", "The Nation · ภาพประชาสัมพันธ์");
shop("Papaya Studio · สุขาภิบาล 5", bangkok, "บางเขน", vintage, null, "Time Out Bangkok", "vintage");
shop("2nd STREET · CentralWorld", bangkok, "ปทุมวัน", "https://www.youtube.com/watch?v=pLy0bikOBz8", null, "2nd STREET Thailand");
shop("2nd STREET · Fashion Island", bangkok, "คันนายาว", "https://www.youtube.com/watch?v=TQgcu1RiBr4", null, "2nd STREET Thailand");
shop("2nd STREET · The Mall Bangkapi", bangkok, "บางกะปิ", "https://finance-frontend-pc-dist.west.edge.storage-yahoo.jp/disclosure/20250722/20250722517843.pdf", null, "GEO Holdings");
shop("Treasure Factory · บางแค", bangkok, "บางแค", "https://www.trefac-th.com/blog/4672/", null, "Treasure Factory Thailand");
shop("ตลาดนัดรถไฟ ศรีนครินทร์", bangkok, "ประเวศ", "https://www.make-my-bangkok-holiday.com/shops-srinakarin.html",
  "https://www.make-my-bangkok-holiday.com/pixx/shopping/shops/srinakarin/srinakarin-blog-08a.jpg", "Make My Bangkok Holiday");

const thrift = "https://thriftspots.com/thailand/bangkok/bangkok";
const thriftPages = [
  ["patthavikorn-market", "Pattavikorn Market", "บึงกุ่ม"],
  ["bang-sue-junction", "Bang Sue Junction", "จตุจักร"],
  ["tokyo-joe", "Tokyo Joe Bangkok", "วัฒนา"],
  ["horse-unit", "Horse Unit", "บางรัก"],
  ["shinjuku-outlet", "Shinjuku Outlet", ""],
  ["unfashion-vintage-collection", "(un)FASHION Vintage Collection · เอกมัย", "วัฒนา"],
  ["second-soul-eco-shop-bangkok", "Second Soul Eco Shop", ""],
  ["thrift-mood", "Thrift Mood", ""],
  ["chaosnomore", "Chaosnomore Thrift Store", ""],
  ["samantha", "Samantha · K Village", "คลองเตย"],
  ["2nd-street-silom-edge", "2nd STREET · Silom Edge", "บางรัก"],
  ["2nd-street-seacon-bangkae", "2nd STREET · Seacon Bangkae", "ภาษีเจริญ"],
  ["2nd-street-big-c-plaza-rama-iv", "2nd STREET · Big C Rama IV", "คลองเตย"],
  ["2nd-street-central-world", "2nd STREET · CentralWorld", "ปทุมวัน"],
  ["mono-loop", "Mono Loop · Mixt Chatuchak", "จตุจักร"],
  ["second-hand-shoes-banglumpoo", "Second Hand Shoes Banglumpoo", "พระนคร"],
];

for (const [slug, name, district] of thriftPages) {
  const source = thrift + "/" + slug;
  try {
    const response = await fetch(source, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) continue;
    const document = new JSDOM(await response.text(), { virtualConsole: new VirtualConsole() }).window.document;
    const title = document.querySelector("h1")?.textContent.trim();
    if (!title || document.body.textContent.includes("Permanently closed")) continue;
    const images = [...document.querySelectorAll('img[src*="/shopssmall/"], img[src*="/shopsslider"]')];
    const matched = images.find((img) => img.alt === title || img.alt === title + " - Bangkok" || img.alt.startsWith(title + " - Bangkok ("));
    const image = matched ? new URL(matched.getAttribute("src"), source).href : null;
    shop(name, bangkok, district, source, image, "ThriftSpots");
    const entry = shops.shops.find((item) => item.name === name && item.province === bangkok);
    if (district && !entry.district) entry.district = district;
    if (name === "Pattavikorn Market" || name === "Bang Sue Junction") entry.kind = "clothing";
  } catch (error) {
    console.warn("Could not read", source, error.message);
  }
}

const parkPages = ["https://greener.bangkok.go.th/park/", ...new Set(places.map((place) => place.sourceUrl).filter((url) => url?.startsWith("https://greener.bangkok.go.th/park/") && url !== "https://greener.bangkok.go.th/park/"))];
const foodPages = [...new Set(restaurants.filter((entry) => !covers[entry.source] && !covers[key(entry)]).map((entry) => entry.source))];
const pages = [...new Set([vintage, chiangmai, ...parkPages, ...foodPages, ...shops.shops.map((entry) => entry.source).filter((url) => /^https:\/\/(chiangmaipicks|thailandinsiderguide|www\.morriscope)\.com\//u.test(url))])];
const aliases = new Map([
  ["Famous Store", "FAMOUS STORE Chiang Mai"],
  ["Nostalgia Vintage", "Nostalgia Vintage Nimman"],
  ["Toro Clothing", "Toro Clothing — San Sai flagship"],
].map(([label, name]) => [normalize(label), name]));
const browserLike = { "User-Agent": "Mozilla/5.0" };
const all = [...shops.shops, ...restaurants, ...places];

async function crawl(source) {
  const response = await fetch(source, { headers: browserLike, signal: AbortSignal.timeout(9000) });
  if (!response.ok || !response.headers.get("content-type")?.includes("html")) return;
  const document = new JSDOM(await response.text(), { virtualConsole: new VirtualConsole() }).window.document;
  const host = new URL(source).hostname;
  const entries = host === "greener.bangkok.go.th" ? places.filter((place) => place.province === bangkok && place.categories.includes("park"))
    : source === chiangmai ? shops.shops.filter((entry) => entry.province === cm)
    : all.filter((entry) => (entry.source ?? entry.sourceUrl) === source);
  for (const image of document.querySelectorAll("img[alt]")) {
    const label = image.getAttribute("alt").trim();
    if (label.length < 5) continue;
    const matched = entries.filter((entry) => normalize(entry.name) === normalize(label) || source === chiangmai && aliases.get(normalize(label)) === entry.name);
    const src = image.getAttribute("data-src") || image.getAttribute("src");
    if (matched.length !== 1 || !src || src.startsWith("data:")) continue;
    anchors.push({ entry: matched[0], image: new URL(src, response.url).href, source, credit: host === "greener.bangkok.go.th" ? "Greener Bangkok · กทม." : host.replace(/^www\./, "") });
  }
  if (source === "https://www.phuket101.net/the-cafe-mookata/") {
    const entry = entries.find((row) => /the caf[eé]/i.test(row.name));
    const image = document.querySelector('meta[property="og:image"]')?.content;
    if (entry && image) anchors.push({ entry, image, source, credit: "Phuket 101" });
  }
}

for (let index = 0; index < pages.length; index += 6) {
  await Promise.allSettled(pages.slice(index, index + 6).map(crawl));
}
const seen = new Set(Object.values(covers).map((cover) => cover.url));
const added = new Set();
for (let index = 0; index < anchors.length; index += 8) {
  await Promise.allSettled(anchors.slice(index, index + 8).map(async ({ entry, image, source, credit }) => {
    if (!image.startsWith("https://") || covers[key(entry)] || seen.has(image) || added.has(key(entry))) return;
    const response = await fetch(image, { headers: browserLike, signal: AbortSignal.timeout(8000) });
    const policy = response.headers.get("cross-origin-resource-policy");
    await response.body?.cancel();
    if (!response.ok || !/^image\/(?:jpeg|png|webp|avif)/.test(response.headers.get("content-type") ?? "") || policy === "same-origin" || policy === "same-site") return;
    if (covers[key(entry)] || seen.has(image)) return;
    covers[key(entry)] = { url: image, source, credit };
    seen.add(image);
    added.add(key(entry));
  }));
}
await Promise.all([write(shopFile, shops), write(coverFile, covers)]);
console.log("New covers by directory:", Object.fromEntries([["secondhand", shops.shops], ["food", restaurants], ["activities", places]].map(([name, entries]) => [name, entries.filter((entry) => added.has(key(entry))).length])));
console.log("New cover hosts:", [...new Set([...added].map((id) => new URL(covers[id].url).origin))]);
