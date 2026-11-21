import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const pages = JSON.parse(await readFile(path.join(root, "src/data/provinces.json"), "utf8")).provinces;
const provinceBySlug = new Map(pages.map((province) => [province.slug, province]));
const provinceSlugAliases = new Map([
  ["koh-samui_7770005", "surat-thani"],
  ["suraasdrthaanii_2719394", "surat-thani"],
  ["chon-buri_2758557", "chonburi"],
  ["th-phang-nga", "phang-nga"],
  ["phra-nakhon-si-ayutthaya", "ayutthaya"],
]);
const michelinBase = "https://guide.michelin.com/th/en/selection/thailand/restaurants";
const michelinSource = "https://guide.michelin.com/th/en/selection/thailand/restaurants";
const foodieMapSource = "https://www.tourismthailand.org/Articles/explore-thai-taste-thai-foodie-map-2-0-en";
const mookataBangkokSource = "https://www.rentthaifriend.com/blog/mookata";
const mookataChiangMaiSource = "https://thailandaddict.com/en/chiang-mai-mookata-buffet";
const buffetPattayaSource = "https://www.thailandaddict.com/en/pattaya-buffet-restaurants";
const buffetBangkokSource = "https://feedmii.com/buffet/bangkok";
const mookataPhuketSource = "https://www.phuket101.net/the-cafe-mookata/";
const regionalMookataSource = "https://www.youtube.com/watch?v=xaFxTDCuTaQ";

const rows = [];
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const normalize = (value) => clean(value).toLocaleLowerCase("th").replace(/[^\p{L}\p{N}]/gu, "");
const toMap = (name, province) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${province}`)}`;

for (let page = 1; page <= 11; page += 1) {
  const pageUrl = page === 1 ? michelinBase : `${michelinBase}/page/${page}`;
  const html = process.env.MICHELIN_CACHE_DIR
    ? await readFile(path.join(process.env.MICHELIN_CACHE_DIR, `page-${page}.html`), "utf8")
    : await (async () => {
        const response = await fetch(pageUrl, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36" } });
        if (!response.ok) throw new Error(`MICHELIN page ${page} returned ${response.status}`);
        return response.text();
      })();
  const cardLink = /<a(?=[^>]*href="(?<url>\/th\/en\/[^" ]+\/restaurant\/[^" ]+)")(?=[^>]*aria-label="Open (?<name>[^"]+)")[^>]*>/g;
  const seenOnPage = new Set();
  for (const match of html.matchAll(cardLink)) {
    const url = new URL(match.groups.url, "https://guide.michelin.com").toString();
    if (seenOnPage.has(url)) continue;
    seenOnPage.add(url);
    const restaurant = clean(match.groups.name.replaceAll("&#39;", "'").replaceAll("&amp;", "&").replaceAll("&quot;", '"'));
    const segments = new URL(url).pathname.split("/");
    const placeSlug = segments[4];
    const province = provinceBySlug.get(provinceSlugAliases.get(placeSlug) ?? placeSlug);
    if (!province) {
      console.warn(`Skipping unknown MICHELIN province slug: ${placeSlug} (${restaurant})`);
      continue;
    }
    rows.push({
      name: restaurant,
      province: province.name_th,
      categories: ["michelin"],
      source: url,
      sourceName: "MICHELIN Guide Thailand 2027",
      mapsUrl: toMap(restaurant, province.name_th),
      sourceDate: "2026-11",
    });
  }
  console.log(`MICHELIN page ${page}: ${seenOnPage.size} candidates`);
}

const localRestaurants = [
  ["Khanom Wong Mae Prapai", "Sukhothai"], ["Mai Klang Krung Restaurant", "Sukhothai"], ["Je Hae Sukhothai Noodles", "Sukhothai"], ["Mee Khao Pan Pak", "Sukhothai"], ["Jay Pao Restaurant", "Sukhothai"],
  ["Monlablae", "Uttaradit"], ["Khaw Phan Phak Indy", "Uttaradit"], ["Pom Khaw Pan Pak", "Uttaradit"], ["Khanom Thian Sawoey Chidduang Kanokmanee", "Uttaradit"], ["Pa Wang Mee Phan Laplae", "Uttaradit"],
  ["Kuay Teow Moo Pla Pho Luk Song", "Nakhon Phanom"], ["Sri Thep Vietnamese Dumplings", "Nakhon Phanom"], ["Vietnamese Kitchen", "Nakhon Phanom"], ["Khanom Jeen Pisamai", "Nakhon Phanom"], ["Yat Larb Ped", "Nakhon Phanom"],
  ["Kalamae Sikhoraphum", "Surin"], ["Rian Niang Nit Ang Kaeb Bob", "Surin"], ["Pak Mor Je Nang Surin", "Surin"], ["Som-Tam Jay-Took Restaurant", "Surin"], ["Baan Na Garden Restaurant", "Surin"],
  ["Mae Bouy", "Suphan Buri"], ["Phai Khwang", "Suphan Buri"], ["Khua Rim Klong Song Phi Nong", "Suphan Buri"], ["Rice Field Restaurant", "Suphan Buri"], ["Ruean Phae Khua Suphan", "Suphan Buri"],
  ["Mai Na Aroi Restaurant", "Nakhon Nayok"], ["Krua Look Pla Restaurant", "Nakhon Nayok"], ["Pla Doo Kru Lord", "Nakhon Nayok"], ["Chaluay Phochana", "Nakhon Nayok"], ["Hydro Kitchen", "Nakhon Nayok"],
  ["Ban Phuk Pouk", "Chumphon"], ["Yai Puad", "Chumphon"], ["Kua Luang Pod", "Chumphon"], ["Grandma's Rice Noodles", "Chumphon"], ["Thamsing Cafe", "Chumphon"],
  ["Sam Phi Nong", "Satun"], ["Mameng Herbal Rice", "Satun"], ["Salad Fish Curry Shop (Tom Mae Curry House No. 35)", "Satun"], ["Bara Roti", "Satun"], ["Madee Satun", "Satun"],
  ["Pak Nam Pho Boat Noodles", "Nakhon Sawan"], ["Mae Pranom Crab Curry Rice Noodles", "Surat Thani"], ["Nai Hoi Barbecue", "Chiang Mai"], ["Mae Aoi Spicy Crab Papaya Salad", "Khon Kaen"], ["Mae Pranom Vietnamese Crepes", "Nakhon Phanom"],
];
for (const [name, provinceEn] of localRestaurants) {
  const province = pages.find((item) => item.name_en === provinceEn);
  if (!province) throw new Error(`Unknown province: ${provinceEn}`);
  rows.push({ name, province: province.name_th, categories: ["local"], source: foodieMapSource, sourceName: "Thai Foodie Map 2.0 · TAT + Booking.com", mapsUrl: toMap(name, province.name_th), sourceDate: "2024-10" });
}

const specialRestaurants = [
  // Bangkok and nearby mookata and buffet picks.
  ["Thai Moo Kata Premium Thai BBQ", "Bangkok", ["mookata"], mookataBangkokSource],
  ["Taweechok Mookata · Banthat Thong", "Bangkok", ["mookata"], mookataBangkokSource],
  ["Nak-La Mookata · MBK", "Bangkok", ["mookata", "buffet"], mookataBangkokSource],
  ["Suki Teenoi · MBK", "Bangkok", ["mookata", "buffet"], mookataBangkokSource],
  ["Nai Phran Moo Kata", "Nonthaburi", ["mookata", "buffet"], mookataBangkokSource],
  ["Khun Ple Mookata", "Bangkok", ["mookata"], mookataBangkokSource],
  ["Chuankin Mookrata", "Bangkok", ["mookata", "buffet"], mookataBangkokSource],
  ["Heng Heng Heng", "Bangkok", ["mookata"], mookataBangkokSource],
  ["Rim Nam Mookata · Phra Pinklao", "Bangkok", ["mookata", "buffet"], buffetBangkokSource],
  ["Best Beef · On Nut", "Bangkok", ["buffet"], buffetBangkokSource],
  ["Mo-Mo-Paradise · One Bangkok", "Bangkok", ["buffet"], buffetBangkokSource],
  ["Shabushi · One Bangkok", "Bangkok", ["buffet"], buffetBangkokSource],
  ["Oishi Eaterium · Samyan Mitrtown", "Bangkok", ["buffet"], buffetBangkokSource],
  ["Sukishi Korean Charcoal Grill · Central Ladprao", "Bangkok", ["buffet"], buffetBangkokSource],
  ["Baiyoke Sky Hotel Buffet", "Bangkok", ["buffet"], buffetBangkokSource],
  ["Espresso · InterContinental Bangkok", "Bangkok", ["buffet"], buffetBangkokSource],
  ["Goji Kitchen + Bar", "Bangkok", ["buffet"], buffetBangkokSource],
  ["Kodtalay The Riverfront Seafood Buffet", "Bangkok", ["buffet"], buffetBangkokSource],
  // Chiang Mai mookata selections.
  ["Khun Moo Mookata by Moo Song Chan · Nimman", "Chiang Mai", ["mookata", "buffet"], mookataChiangMaiSource],
  ["Joolong Mookata Buffet · Wat Ket", "Chiang Mai", ["mookata", "buffet"], mookataChiangMaiSource],
  ["Chang Phueak Mookata · San Sai", "Chiang Mai", ["mookata", "buffet"], mookataChiangMaiSource],
  ["Fa Ham Mookata Buffet", "Chiang Mai", ["mookata", "buffet"], mookataChiangMaiSource],
  ["Moo Ood Mookata · Khu Mueang", "Chiang Mai", ["mookata", "buffet"], mookataChiangMaiSource],
  ["Air-Con Mookata by Seichi", "Chiang Mai", ["mookata", "buffet"], mookataChiangMaiSource],
  ["Sukhontha Mookata · Huay Kaew", "Chiang Mai", ["mookata", "buffet"], mookataChiangMaiSource],
  ["Kat Jang Mookata", "Chiang Mai", ["mookata", "buffet"], mookataChiangMaiSource],
  // Pattaya buffet and mookata picks.
  ["Jimmy BBQ & Grill · Grand Palazzo Hotel", "Chonburi", ["buffet"], buffetPattayaSource],
  ["Seafood Buffet · Mövenpick Siam Na Jomtien", "Chonburi", ["buffet"], buffetPattayaSource],
  ["Seafood Buffet · Holiday Inn Pattaya", "Chonburi", ["buffet"], buffetPattayaSource],
  ["International Buffet · OZO North Pattaya", "Chonburi", ["buffet"], buffetPattayaSource],
  ["Waves & Wind Buffet · Grand Centre Point Pattaya", "Chonburi", ["buffet"], buffetPattayaSource],
  ["Sut Khet Talay Phao · Jomtien", "Chonburi", ["buffet"], buffetPattayaSource],
  ["Amporn Seafood Buffet · Pattaya Sai 3", "Chonburi", ["buffet"], buffetPattayaSource],
  ["Ninja Mookata & Talay Phao · North Pattaya", "Chonburi", ["mookata", "buffet"], buffetPattayaSource],
  ["Umami Chill Buffet · Khao Talo", "Chonburi", ["mookata", "buffet"], buffetPattayaSource],
  ["Fuku Yakiniku · Sukhumvit–Pattaya", "Chonburi", ["buffet"], buffetPattayaSource],
  ["AA Mookata · Pattaya", "Chonburi", ["mookata", "buffet"], buffetPattayaSource],
  // Other regional picks.
  ["Khum Kathu Mookata", "Phuket", ["mookata"], "https://www.phuket101.net/best-local-restaurants-phuket/"],
  ["The Café + Mookata · Kathu", "Phuket", ["mookata"], mookataPhuketSource],
  ["Chang Phueak BBQ", "Chiang Mai", ["mookata", "buffet"], regionalMookataSource],
  ["Nai Tong BBQ", "Khon Kaen", ["mookata", "buffet"], regionalMookataSource],
  ["Prik Kee Noo BBQ", "Songkhla", ["mookata", "buffet"], regionalMookataSource],
  ["Colonel Kanit's BBQ", "Bangkok", ["mookata", "buffet"], regionalMookataSource],
];

for (const [name, provinceEn, categories, source] of specialRestaurants) {
  const province = pages.find((item) => item.name_en === provinceEn);
  if (!province) throw new Error(`Unknown province: ${provinceEn}`);
  rows.push({ name, province: province.name_th, categories, source, sourceName: "Regional restaurant guide", mapsUrl: toMap(name, province.name_th), sourceDate: null });
}

const unique = new Map();
for (const row of rows) {
  const key = `${normalize(row.name)}|${row.province}`;
  const current = unique.get(key);
  if (!current) unique.set(key, row);
  else {
    current.categories = [...new Set([...current.categories, ...row.categories])];
    if (row.categories.includes("michelin")) {
      current.source = row.source;
      current.sourceName = row.sourceName;
      current.sourceDate = row.sourceDate;
    }
  }
}

const shops = [...unique.values()].sort((a, b) => a.province.localeCompare(b.province, "th") || a.name.localeCompare(b.name, "th"));
const dataset = {
  meta: {
    generatedAt: new Date().toISOString().slice(0, 10),
    michelinSource,
    michelinEdition: "Thailand 2027",
    foodieMapSource,
    note: "A curated discovery directory, not a complete census of every restaurant. Check each restaurant's latest opening status, hours, price, branch and buffet details before visiting.",
  },
  restaurants: shops,
};
await writeFile(path.join(root, "src/data/food-directory.json"), JSON.stringify(dataset, null, 2) + "\n");
console.log(`Wrote ${shops.length} restaurants (${shops.filter((item) => item.categories.includes("michelin")).length} MICHELIN Guide entries).`);
