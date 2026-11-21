import fs from "node:fs";
import { JSDOM } from "jsdom";
const source = "https://www.lovethailand.org/travel/th/17-กรุงเทพมหานคร/16293-50-วัดสวยในกรุงเทพ-2570-วัดดัง-วัดเก่าแก่-พร้อมพิกัด.html";
const response = await fetch(source);
if (!response.ok) throw new Error(`Directory returned ${response.status}`);
const doc = new JSDOM(await response.text()).window.document;
const data = JSON.parse(fs.readFileSync("src/data/activity-directory.json", "utf8"));
const locations = JSON.parse(fs.readFileSync("src/data/locations.generated.json", "utf8")).locations;
const norm = (s) => (s || "").toLowerCase().replace(/\([^)]*\)/g, "").replace(/ราชวรมหาวิหาร|ราชวรวิหาร|วรมหาวิหาร|วรวิหาร/g, "").replace(/[^\p{L}\p{N}]/gu, "");
const known = [...data.places.filter((p) => p.province === "กรุงเทพมหานคร").map((p) => p.name), ...locations.filter((p) => p.province_th === "กรุงเทพมหานคร").map((p) => p.name_th)].map(norm);
const found = new Set();
for (const el of doc.querySelectorAll("div,p,strong,b")) {
  const text = el.textContent.trim();
  const match = text.match(/^([1-9]|[1-4]\d|50)\.\s*(วัด.{3,100})$/u);
  if (!match) continue;
  const name = match[2].trim();
  const key = norm(name);
  if (found.has(key)) continue;
  found.add(key);
  if (known.some((n) => n === key || n.length >= 9 && key.length >= 9 && (n.startsWith(key) || key.startsWith(n)))) continue;
  data.places.push({ name, province: "กรุงเทพมหานคร", categories: ["temple"], sourceUrl: source, accessNote: "ตรวจสอบวันเปิดและการเข้าชมกับสถานที่ก่อนเดินทาง" });
  known.push(key);
}
fs.writeFileSync("src/data/activity-directory.json", `${JSON.stringify(data, null, 2)}\n`);
console.log(`Reviewed ${found.size} Bangkok temple names.`);
