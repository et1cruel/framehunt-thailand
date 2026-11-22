import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const root = process.cwd();
const activityPath = path.join(root, "src/data/activity-directory.json");
const coversPath = path.join(root, "src/data/directory-covers.json");
const assetDir = path.join(root, "public/covers/nakhon-pathom");
await fs.mkdir(assetDir, { recursive: true });
const activity = JSON.parse(await fs.readFile(activityPath, "utf8"));
const covers = JSON.parse(await fs.readFile(coversPath, "utf8"));

const newPlaces = [
  {
    name: "วัดดอนขนาก",
    categories: ["temple", "nakhon-pathom"],
    sourceUrl: "https://www.nkppao.go.th/content-18-9615.html",
    image: "https://img.wongnai.com/p/1920x0/2023/07/18/d6898c793cc8429283672dfda6f1bac9.jpg",
    imageSource: "https://www.wongnai.com/listings/nakhonpathom-attraction",
    credit: "Wongnai",
  },
  {
    name: "พิพิธภัณฑ์หุ่นขี้ผึ้งไทย",
    categories: ["art", "nakhon-pathom"],
    sourceUrl: "https://www.thaiwaxmuseum.com/",
    image: "https://ak-d.tripcdn.com/images/1mi5i2224w808j7v41A38_Q90.jpg?proc=source%2Ftrip",
    imageSource: "https://www.trip.com/moments/detail/nakhon-chai-si-121358-119559218?locale=en-SA",
    credit: "Trip.com",
  },
  {
    name: "วัดไร่ขิง",
    categories: ["temple", "nakhon-pathom"],
    sourceUrl: "https://thai.tourismthailand.org/Attraction/วัดไร่ขิง",
    image: "https://s359.thaicdn.net/pagebuilder/a6faddaa-1088-474d-ab85-3368e1acc0fc.jpg",
    imageSource: "https://travel.kapook.com/view291586.html",
    credit: "Kapook Travel",
  },
  {
    name: "พุทธมณฑล",
    categories: ["nature", "temple", "nakhon-pathom"],
    sourceUrl: "https://www.onab.go.th/th/content/category/detail/id/73/iid/3397",
    image: "https://img.wongnai.com/p/1920x0/2019/08/09/a2d9d9831ed44180a4bf4b740a66be15.jpg",
    imageSource: "https://www.wongnai.com/attractions/324395YY-พุทธมณฑล/photos/a2d9d9831ed44180a4bf4b740a66be15",
    credit: "Wongnai",
  },
  {
    name: "อุทยานธรรมชาติวิทยาสิรีรุกขชาติ",
    categories: ["nature", "nakhon-pathom"],
    sourceUrl: "https://sireepark.mahidol.ac.th/",
    image: "https://img.wongnai.com/p/1920x0/2018/07/29/c457026beb374e32bdbf19a1d9e4fdd5.jpg",
    imageSource: "https://www.wongnai.com/attractions/344603bG-อุทยานธรรมชาติวิทยาสิรีรุกขชาติ",
    credit: "Wongnai",
  },
  {
    name: "วัดสามพราน",
    categories: ["temple", "nakhon-pathom"],
    sourceUrl: "https://www.thairath.co.th/lifestyle/travel/thaitravel/1929083",
    image: "https://static.thairath.co.th/media/PZnhTOtr5D3rd9ocJN4w7gVeNs1RuaNxyolNtLUUqBYCNuL.jpg",
    imageSource: "https://www.thairath.co.th/lifestyle/travel/thaitravel/1929083",
    credit: "ไทยรัฐ",
  },
  {
    name: "วัดศีรษะทอง",
    categories: ["temple", "nakhon-pathom"],
    sourceUrl: "https://thai.tourismthailand.org/Attraction/วัดศีรษะทอง",
    image: "https://cms.dmpcdn.com/travel/2024/10/17/13191f50-8c5f-11ef-a8a2-294388f31763_webp_original.webp",
    imageSource: "https://travel.trueid.net/detail/NgZ9RZA6zK5M",
    credit: "TrueID Travel",
  },
];

const repairs = [
  {
    name: "พิพิธภัณฑ์พื้นบ้านวัดสำโรง",
    image: "https://ak-d.tripcdn.com/images/1mi5i2224w808j7v41A38_Q90.jpg?proc=source%2Ftrip",
    imageSource: "https://www.trip.com/moments/detail/nakhon-chai-si-121358-119559218?locale=en-SA",
    credit: "Trip.com",
  },
  {
    name: "สถานีรถไฟวัดสุวรรณาราม",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_7Vw4e6Uqr9.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/3",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "วัดบางช้างใต้",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_kDTImEAVNv.jpg",
    imageSource: "https://xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/26",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
  {
    name: "ศูนย์การเรียนรู้เกษตรอินทรีย์บ้านหัวอ่าว",
    image: "https://assets.xn--72cga3cbo8cg9b4c4etb0g3ef.com/upload/place/09/21/img_place_RQbbE5lDSQ.jpg",
    imageSource: "https://www.xn--72cga3cbo8cg9b4c4etb0g3ef.com/place/detail/23",
    credit: "ท่องเที่ยวชุมชน นครปฐม",
  },
];

async function writeCover(name, imageUrl, source, credit) {
  const province = "นครปฐม";
  const key = `${name}|${province}`;
  const file = `${crypto.createHash("sha256").update(key).digest("hex").slice(0, 16)}.webp`;
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(25000), headers: { "user-agent": "FramehuntThailand/1.0" } });
  if (!response.ok) throw new Error(`${name}: image HTTP ${response.status}`);
  const input = Buffer.from(await response.arrayBuffer());
  if (!response.headers.get("content-type")?.startsWith("image/")) throw new Error(`${name}: response is not an image`);
  const meta = await sharp(input).metadata();
  if (!meta.width || !meta.height || meta.width < 220 || meta.height < 140) throw new Error(`${name}: unsuitable image dimensions ${meta.width}x${meta.height}`);
  const output = await sharp(input).rotate().resize({ width: 1000, height: 700, fit: "cover", position: "attention" }).webp({ quality: 82 }).toBuffer();
  await fs.writeFile(path.join(assetDir, file), output);
  covers[key] = { url: `/covers/nakhon-pathom/${file}`, source, credit };
}

let added = 0;
for (const place of newPlaces) {
  const exists = activity.places.some((item) => item.province === "นครปฐม" && item.name.normalize("NFC") === place.name.normalize("NFC"));
  if (!exists) {
    activity.places.push({ name: place.name, province: "นครปฐม", categories: place.categories, sourceUrl: place.sourceUrl });
    added += 1;
  }
  await writeCover(place.name, place.image, place.imageSource, place.credit);
}

let repaired = 0;
for (const place of repairs) {
  if (covers[`${place.name}|นครปฐม`]) continue;
  await writeCover(place.name, place.image, place.imageSource, place.credit);
  repaired += 1;
}

activity.updated = new Date().toISOString().slice(0, 10);
await fs.writeFile(activityPath, `${JSON.stringify(activity, null, 2)}\n`);
await fs.writeFile(coversPath, `${JSON.stringify(covers, null, 2)}\n`);
console.log(JSON.stringify({ added, repaired, totalNakhon: activity.places.filter((place) => place.province === "นครปฐม").length }, null, 2));
