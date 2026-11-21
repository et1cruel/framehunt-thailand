// Add official DNP nature areas and Bangkok public parks to the activity index.
// Run manually: node scripts/expand-activity-nature.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "src/data/activity-directory.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(value);
      value = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

const normalize = (value = "") =>
  value.toLocaleLowerCase("th").replace(/[\s\u200b-\u200d]/g, "").replace(/อุทยานแห่งชาติ|อุทยาน|วนอุทยาน/g, "");
const knownKeys = new Set();
const existingLocations = JSON.parse(fs.readFileSync(path.join(root, "src/data/locations.generated.json"), "utf8")).locations;
const existingKeys = new Set(
  existingLocations.flatMap((place) =>
    [place.name_th, place.name_en].filter(Boolean).map((name) => `${normalize(name)}|${normalize(place.province_th || place.province)}`),
  ),
);
// Remove entries and attraction aliases already represented by the main Framehunt location catalogue.
data.places = data.places.filter((place) => {
  const separator = place.name.lastIndexOf(" · ");
  const placeKey = `${normalize(place.name)}|${normalize(place.province)}`;
  if (existingKeys.has(placeKey)) return false;
  if (separator < 0 || !place.categories.includes("nature") || !place.sourceUrl?.includes("portal.dnp.go.th")) return true;
  return !existingKeys.has(`${normalize(place.name.slice(0, separator))}|${normalize(place.province)}`);
});
for (const place of data.places) knownKeys.add(`${normalize(place.name)}|${normalize(place.province)}`);
let added = 0;
let duplicate = 0;

function add(place) {
  const key = `${normalize(place.name)}|${normalize(place.province)}`;
  if (!place.name || !place.province || knownKeys.has(key) || existingKeys.has(key)) {
    duplicate += 1;
    return;
  }
  knownKeys.add(key);
  data.places.push(place);
  added += 1;
}

// DNP national park register is distributed as a TIS-620 CSV through Thailand's open-data API.
const packageInfo = await fetch("https://data.go.th/api/3/action/package_show?id=gdpublish-nationalparksname").then((response) => response.json());
const nationalParkCsv = packageInfo.result.resources.find((resource) => resource.format.toLowerCase() === "csv");
const nationalBytes = await fetch(nationalParkCsv.url).then((response) => response.arrayBuffer());
const nationalRows = parseCsv(new TextDecoder("windows-874").decode(nationalBytes));
for (const [province, rawName, sourceUrl] of nationalRows.slice(1)) {
  const name = rawName?.trim();
  if (!name || !province) continue;
  const categories = ["nature"];
  if (/(ภู|ดอย|เขา|ผา|ยอดดอย)/u.test(name)) categories.push("mountain");
  if (/(ป่า|พรุ|ป่าชายเลน)/u.test(name)) categories.push("forest");
  const prepared = /เตรียมการ/u.test(name);
  add({ name: `อุทยานแห่งชาติ${name}`, province: province.trim(), categories, sourceUrl: sourceUrl?.trim(), accessNote: prepared ? "อุทยานเตรียมการ · ตรวจสอบการเปิดพื้นที่ก่อนเดินทาง" : undefined });
}

// DNP attraction inventory contains named waterfalls, viewpoints, caves, trails, forests and peaks with coordinates.
const attractionPackage = await fetch("https://data.go.th/api/3/action/package_show?id=gdpublish-typesofattractionsinnp").then((response) => response.json());
const attractionCsv = attractionPackage.result.resources.find((resource) => resource.format.toLowerCase() === "csv");
const attractionBytes = await fetch(attractionCsv.url).then((response) => response.arrayBuffer());
const attractionRows = parseCsv(new TextDecoder("windows-874").decode(attractionBytes));
const parkProvince = new Map(nationalRows.slice(1).map(([province, name]) => [normalize(name), province.trim()]));
const nationalSourceByName = new Map(nationalRows.slice(1).map(([province, name, sourceUrl]) => [normalize(name), sourceUrl?.trim()]));
for (const [, parkName, type, attractionName, rawLat, rawLon] of attractionRows.slice(1)) {
  const name = attractionName?.trim();
  const province = parkProvince.get(normalize(parkName?.trim()));
  if (!name || !province) continue;
  if (existingKeys.has(`${normalize(name)}|${normalize(province)}`)) {
    duplicate += 1;
    continue;
  }
  const categories = ["nature"];
  if (/(ภูเขา|ดอย|ยอด|ผา|หน้าผา|เขา)/u.test(`${type} ${name}`)) categories.push("mountain");
  if (/(ป่า|พรรณไม้|ธรรมชาติ|วนอุทยาน|เส้นทางศึกษาธรรมชาติ)/u.test(`${type} ${name}`)) categories.push("forest");
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  const validCoordinates = Number.isFinite(lat) && lat >= 5 && lat <= 21 && Number.isFinite(lon) && lon >= 97 && lon <= 106;
  add({ name: `${name} · ${parkName.trim()}`, province, categories, lat: validCoordinates ? lat : undefined, lon: validCoordinates ? lon : undefined, sourceUrl: nationalSourceByName.get(normalize(parkName.trim())) });
}

// DNP contact register adds forest parks and protected areas with coordinates.
const contactCsvUrl = "https://catalog.dnp.go.th/dataset/6ed04038-08f9-48c0-b7cc-2d474d79f1a6/resource/26203bfe-28e9-4445-972f-cda9f529a2d5/download/address-catalog-122.csv";
const contactRows = parseCsv(await fetch(contactCsvUrl).then((response) => response.text()));
const contactHeaders = contactRows[0].map((value) => value.replace(/^\uFEFF/, "").trim());
const field = (row, header) => row[contactHeaders.indexOf(header)]?.trim() ?? "";
for (const row of contactRows.slice(1)) {
  const unit = field(row, "หน่วยงาน");
  if (!/(วนอุทยาน|สวนรุกขชาติ|สวนพฤกษศาสตร์)/u.test(unit)) continue;
  const name = field(row, "ชื่อหน่วยงาน");
  const province = field(row, "จังหวัด");
  const lat = Number(field(row, "Lat"));
  const lon = Number(field(row, "Long"));
  const categories = unit.includes("วนอุทยาน") ? ["forest", "nature"] : ["park", "nature"];
  if (/(ภู|ดอย|เขา|ผา|ยอดดอย)/u.test(name)) categories.push("mountain");
  add({ name, province, categories, lat: Number.isFinite(lat) ? lat : undefined, lon: Number.isFinite(lon) ? lon : undefined, sourceUrl: "https://data.go.th/dataset/gdpublish-tel-park" });
}

// Bangkok's official Green Bangkok catalogue includes park name, district and activity tags.
const api = "https://greener.bangkok.go.th/wp-json/wp/v2";
try {
  const [parks, districts] = await Promise.all([
    fetch(`${api}/park?per_page=100`).then((response) => response.json()),
    fetch(`${api}/district?per_page=100`).then((response) => response.json()),
  ]);
  const districtNames = new Map(districts.map((district) => [district.id, district.name.replace(/^เขต/u, "").trim()]));
  for (const park of parks) {
    const name = park.title?.rendered?.trim();
    const tags = park["park-categorie"] ?? [];
    const categories = ["park", "nature"];
    if (tags.some((id) => [36, 120, 35].includes(id))) categories.push("fitness");
    if (tags.some((id) => [118, 117, 221, 25, 116].includes(id))) categories.push("sports");
    if (/สวนป่า|วนธรรม|ป่าชายเลน/u.test(name)) categories.push("forest");
    add({ name, province: "กรุงเทพมหานคร", district: (park.district ?? []).map((id) => districtNames.get(id)).filter(Boolean).join(", "), categories, sourceUrl: park.link });
  }
} catch (error) {
  console.warn(`Bangkok park catalogue temporarily unavailable: ${error.message}`);
}

// Small static fallback mirrors the official BMA public-park pages if its catalogue API is offline.
const bmaParkFallback = [
  ["สวนสาธารณะ เฉลิมพระเกียรติ 6 รอบ พระชนมพรรษา", "บางคอแหลม", ["park", "nature"]],
  ["สวนหลวงพระราม 8", "บางพลัด", ["park", "nature", "fitness"]],
  ["สวนหลวง ร.๙", "ประเวศ", ["park", "nature", "fitness"]],
  ["สวนสาธารณะศูนย์กีฬาบึงหนองบอน", "ประเวศ", ["park", "nature", "fitness", "sports"]],
  ["สวนธนบุรีรมย์", "ทุ่งครุ", ["park", "nature", "forest"]],
  ["สวนเฉลิมพระเกียรติพระบาทสมเด็จพระเจ้าอยู่หัว พระชนมพรรษา 7 รอบ", "บางบอน", ["park", "nature", "fitness"]],
  ["สวนสันติภาพ", "ราชเทวี", ["park", "nature", "forest"]],
  ["อุทยานเบญจสิริ", "คลองเตย", ["park", "nature"]],
  ["สวนเฉลิมพระเกียรติ 80 พรรษา พระบาทสมเด็จพระเจ้าอยู่หัว (สาทร)", "สาทร", ["park", "nature"]],
  ["สวนวนธรรม", "ประเวศ", ["park", "nature", "forest"]],
  ["สวน 50 พรรษา มหาจักรีสิรินธร", "ประเวศ", ["park", "nature", "fitness"]],
  ["สวนบางแคภิรมย์", "บางแค", ["park", "nature", "fitness"]],
  ["สวนป่าประชานิเวศน์ (หมู่บ้านประชานิเวศน์)", "จตุจักร", ["park", "nature", "forest"]],
  ["สนามหลวง", "พระนคร", ["park", "nature"]],
  ["สวนวชิรเบญจทัศ (สวนรถไฟ)", "จตุจักร", ["park", "nature", "fitness"]],
  ["สวนเทียนทะเลพัฒนาพฤกษาภิรมย์", "บางขุนเทียน", ["park", "nature", "forest"]],
  ["สวนรมณีย์ทุ่งสีกัน", "ดอนเมือง", ["park", "nature", "fitness"]],
  ["สวนกีฬารามอินทรา", "บางเขน", ["park", "nature", "forest", "fitness", "sports"]],
  ["สวนรมณีนาถ", "พระนคร", ["park", "nature", "fitness"]],
  ["สวนเสรีไทย", "บึงกุ่ม", ["park", "nature", "fitness"]],
  ["สวนสราญรมย์", "พระนคร", ["park", "nature", "fitness"]],
  ["สวนจตุจักร", "จตุจักร", ["park", "nature"]],
  ["สวนป่าวิภาวดีรังสิต", "ดินแดง", ["park", "nature", "forest"]],
  ["สวนเฉลิมพระเกียรติ 80 พรรษา พระบาทสมเด็จพระเจ้าอยู่หัว (บางกอกน้อย)", "บางกอกน้อย", ["park", "nature"]],
  ["สวนสมเด็จพระนางเจ้าสิริกิติ์ฯ", "จตุจักร", ["park", "nature"]],
  ["สวนลุมพินี", "ปทุมวัน", ["park", "nature", "fitness"]],
  ["สวนเบญจกิติ", "คลองเตย", ["park", "nature", "forest", "fitness"]],
  ["สวนสิรินธราพฤกษาพรรณ", "บางกอกน้อย", ["park", "nature"]],
  ["สวนนวมินทร์ภิรมย์", "บึงกุ่ม", ["park", "nature", "fitness"]],
  ["สวนบึงกระเทียม", "มีนบุรี", ["park", "nature", "fitness"]],
  ["สวนสาธารณะทางต่างระดับถนนพรานนก", "ทวีวัฒนา", ["park", "nature"]],
  ["สวนปิยะภิรมย์", "บางกะปิ", ["park", "nature", "fitness"]],
  ["สวนวัชราภิรมย์", "บางเขน", ["park", "nature", "fitness"]],
  ["สวนสาธารณะบึงน้ำลาดพร้าว 71", "ลาดพร้าว", ["park", "nature", "fitness"]],
  ["สวนพระนคร", "ลาดกระบัง", ["park", "nature", "fitness"]],
  ["สวนพระยาภิรมย์", "มีนบุรี", ["park", "nature", "fitness"]],
  ["สวนวารีภิรมย์", "คลองสามวา", ["park", "nature", "fitness"]],
  ["สวนสิริภิรมย์ (บึงลำไผ่)", "มีนบุรี", ["park", "nature", "fitness"]],
  ["สวนทวีกาญจนาภิเษก", "ทวีวัฒนา", ["park", "nature", "fitness"]],
  ["สวนทวีวนารมย์", "ทวีวัฒนา", ["park", "nature"]],
  ["สวน 60 พรรษา สมเด็จพระบรมราชินีนาถ", "ลาดกระบัง", ["park", "nature", "fitness"]],
  ["สวนสมเด็จย่า 84", "จตุจักร", ["park", "nature", "fitness"]],
  ["สวนป้อมมหากาฬ", "พระนคร", ["park", "nature", "fitness"]],
  ["ลานคนเมือง ศาลาว่าการกรุงเทพมหานคร", "พระนคร", ["park", "nature", "fitness"]],
  ["สวนลอยฟ้าเจ้าพระยา", "พระนคร", ["park", "nature", "fitness"]],
  ["สวนจากภูผาสู่มหานที", "จตุจักร", ["park", "nature", "forest"]],
];
for (const [name, district, categories] of bmaParkFallback) {
  add({ name, province: "กรุงเทพมหานคร", district, categories, sourceUrl: "https://greener.bangkok.go.th/park/" });
}

data.places.sort((a, b) => a.province.localeCompare(b.province, "th") || a.name.localeCompare(b.name, "th"));
data.updated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Added ${added} nature places; skipped ${duplicate} duplicates; total ${data.places.length}.`);
