import fs from "node:fs";
const file = "src/data/activity-directory.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const published = JSON.parse(fs.readFileSync("src/data/locations.generated.json", "utf8")).locations;
const norm = (s) => (s || "").toLocaleLowerCase("th").replace(/[^\p{L}\p{N}]/gu, "");
const known = new Set([...data.places.map((p) => `${norm(p.name)}|${norm(p.province)}`), ...published.flatMap((p) => [p.name_th, p.name_en].filter(Boolean).map((n) => `${norm(n)}|${norm(p.province_th)}`))]);
const tat = "https://api.tat.or.th/upload/live/multimedia/9068/T_Nakhonpathom.pdf";
const community = "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/index.php";
const pao = "https://www.nkppao.go.th/content-18-9618.html";
const bangkok = "https://thai.tourismthailand.org/Destinations/Provinces/bangkok/219";
const rows = [
  ["นครปฐม", "กำแพงแสน", pao, "วัดปลักไม้ลาย|สวนป่าสมุนไพรวัดปลักไม้ลาย|สวนแสนปาล์ม มหาวิทยาลัยเกษตรศาสตร์ กำแพงแสน|สวนพฤกษศาสตร์ มหาวิทยาลัยเกษตรศาสตร์ กำแพงแสน|เมืองเก่ากำแพงแสน|โรงเรียนการบินกำแพงแสน|อุทยานแมลงเฉลิมพระเกียรติ กำแพงแสน|อุโมงค์ชมพูพันธุ์ทิพย์ มหาวิทยาลัยเกษตรศาสตร์ กำแพงแสน|คาวบอยแลนด์"],
  ["นครปฐม", "กำแพงแสน", community, "วัดท่าเสา|ฟาร์มกุ้งลุงเอก|The Ugly Duckling Learning Farm"],
  ["นครปฐม", "กำแพงแสน", "https://www.nuac.nu.ac.th/?p=4205", "วัดโพธิ์งาม|วัดไผ่รื่นรมย์|ถนนปรีดียาธร มหาวิทยาลัยเกษตรศาสตร์ กำแพงแสน"],
  ["นครปฐม", "กำแพงแสน", "https://th.trip.com/travel-guide/attraction/nakhon-pathom-province-24521/tourist-attractions/", "วัดไร่แตงทอง"],
  ["นครปฐม", "เมืองนครปฐม", tat, "วัดพระเมรุ|วัดไผ่ล้อม|วัดพระประโทณเจดีย์|พระประโทณเจดีย์|พระราชวังสนามจันทร์|พิพิธภัณฑสถานแห่งชาติ พระปฐมเจดีย์|วัดธรรมศาลา|วัดโพรงมะเดื่อ|วัดสระกระเทียม|วัดเกาะวังไทร|วัดใหม่ปิ่นเกลียว"],
  ["นครปฐม", "ดอนตูม", tat, "พิพิธภัณฑ์วิถีชีวิตไทยทรงดำ บ้านหัวถนน|พิพิธภัณฑ์ท้องถิ่นชาติพันธุ์ลาวครั่ง วัดทุ่งผักกูด|วัดทัพพระ|ศาลพระแม่กวนอิมมหาโพธิสัตว์ บ้านทุ่งพิชัย|วัดห้วยพระ|วัดสุขวราราม วัดดอนรวก"],
  ["นครปฐม", "นครชัยศรี", tat, "วัดกลางบางแก้ว|วัดบางพระ|วัดศรีษะทอง|ตลาดเก่าท่านา|ตลาดน้ำวัดกลางคูเวียง|พิพิธภัณฑ์พื้นบ้านวัดสำโรง|วัดลานตากฟ้า|พิพิธภัณฑ์หุ่นขี้ผึ้งไทย|เจษฎา เทคนิค มิวเซียม|วู้ดแลนด์ เมืองไม้"],
  ["นครปฐม", "พุทธมณฑล", community, "ตลาดน้ำบ้านศาลาดิน|วัดสุวรรณาราม พุทธมณฑล|สถานีรถไฟวัดสุวรรณาราม"],
  ["นครปฐม", "บางเลน", tat, "ตลาดน้ำวัดลำพญา|ตลาดโบราณบางหลวง ร.ศ. ๑๒๒|ชุมชนเกาะแรด|ตลาดน้ำทุ่งบัวแดง ณ บางเลน|แอร์ออร์คิดส์"],
  ["นครปฐม", "สามพราน", community, "วัดบางช้างใต้|วัดไร่ขิง|ไร่แสนรักษ์|ศูนย์การเรียนรู้เกษตรอินทรีย์บ้านหัวอ่าว|ตลาดน้ำดอนหวาย|สวนสามพราน"],
  ["กรุงเทพมหานคร", "", bangkok, "วัดพระศรีรัตนศาสดาราม|วัดพระเชตุพนวิมลมังคลาราม|วัดอรุณราชวราราม|วัดสระเกศราชวรมหาวิหาร|วัดราชนัดดาราม|วัดไตรมิตรวิทยาราม|วัดเบญจมบพิตรดุสิตวนาราม|วัดบวรนิเวศวิหาร|วัดสุทัศนเทพวราราม"],
  ["กรุงเทพมหานคร", "", "https://www.tourismthailand.org/Attraction/wat-ratchabophit-sathitmahasimaram", "วัดราชบพิธสถิตมหาสีมาราม"],
];
let added = 0;
for (const [province, district, sourceUrl, names] of rows) for (const name of names.split("|")) {
  const key = `${norm(name)}|${norm(province)}`;
  if (known.has(key)) continue;
  known.add(key);
  data.places.push({ name, province, district, categories: [...(name.startsWith("วัด") ? ["temple"] : []), ...(province === "นครปฐม" ? ["nakhon-pathom"] : [])], sourceUrl, accessNote: "ตรวจสอบวันเปิดและการเข้าชมกับสถานที่ก่อนเดินทาง" });
  added++;
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Added ${added} places`);
