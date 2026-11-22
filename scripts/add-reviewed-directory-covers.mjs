import fs from "node:fs";
const file = "src/data/directory-covers.json";
const covers = JSON.parse(fs.readFileSync(file, "utf8"));
const entries = {
  "ถ้ำเขาไม้แก้ว · หมู่เกาะลันตา|กระบี่": { url: "https://storage.googleapis.com/tripniceday/uploads/places/1626944731694.jpg", source: "https://www.tripniceday.com/place/ถ้ำเขาไม้แก้ว", credit: "TripNiceDay · ถ้ำเขาไม้แก้ว" },
  "ถ้ำผีหัวโต · ธารโบกขรณี|กระบี่": { url: "https://files.thailandtourismdirectory.go.th/assets/upload/2020/07/09/20200709607ee45669c5a0a48ebe73b6c6f835c2144533.jpg", source: "https://www.thailandtourismdirectory.go.th/th/attraction/99174", credit: "Thailand Tourism Directory" },
  "ถ้ำพระนาง · หาดนพรัตน์ธารา - หมู่เกาะพีพี|กระบี่": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Phra_Nang_cave.jpg/500px-Phra_Nang_cave.jpg", source: "https://commons.wikimedia.org/wiki/File:Phra_Nang_cave.jpg", credit: "kallerna · CC BY-SA 3.0 · Wikimedia Commons" },
  "VS Gallery|กรุงเทพมหานคร": { url: "https://media.timeout.com/images/106418420/image.jpg", source: "https://www.timeout.com/bangkok/art/vs-gallery", credit: "VS Gallery · Time Out Bangkok" },
  "Sombat Permpoon Gallery|กรุงเทพมหานคร": { url: "https://static.naewna.com/uploads/news/gallery/source/1278008.jpg", source: "https://www.naewna.com/lady/957819", credit: "แนวหน้า · Sombat Permpoon Gallery" },
  "Chiang Mai University Art and Culture Center|เชียงใหม่": { url: "https://www.chiangmailocator.com/design/photosbiz1/chiang-mai-chiang-mai-university-art-center-10340.jpg", source: "https://chiangmailocator.com/page-chiang-mai-museums-109", credit: "Chiang Mai Locator" },
  "สนามกีฬาแห่งชาติ / สนามศุภชลาศัย|กรุงเทพมหานคร": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Supachalasai_National_Stadium.jpg/960px-Supachalasai_National_Stadium.jpg", source: "https://commons.wikimedia.org/wiki/File:Supachalasai_National_Stadium.jpg", credit: "Lehrmon · CC BY-SA 4.0 · Wikimedia Commons" },
  "ศูนย์กีฬาเบญจกิติ|กรุงเทพมหานคร": { url: "https://urbancreature.co/wp-content/uploads/2023/07/benchakitti-sports-center_web.jpg", source: "https://urbancreature.co/benchakitti-sports-center/", credit: "Urban Creature" },
  "Lifebeat Studio เมกาบางนา|สมุทรปราการ": { url: "https://static.wixstatic.com/media/825461_470555b727b648039f36a60c1b6c9a3f~mv2.jpg/v1/fill/w_676%2Ch_451%2Cal_c%2Cq_80%2Cusm_0.66_1.00_0.01%2Cenc_auto/825461_470555b727b648039f36a60c1b6c9a3f~mv2.jpg", source: "https://www.lifebeatstudio.com/rehearsal-room-detail", credit: "Lifebeat Studio" },
  "STUDIO Encrypt (สตูดิโอ เอ็นคริปท์)|นนทบุรี": { url: "https://www.jrockencryption.com/images/content/original-1687700773629.png", source: "https://www.jrockencryption.com/18060812/reasons", credit: "STUDIO Encrypt" },
  "Goji Kitchen + Bar|กรุงเทพมหานคร": { url: "https://resizer.otstatic.com/v2/photos/large/3/30894800.jpg", source: "https://www.opentable.co.th/r/goji-kitchen-and-bar-klong-toei", credit: "OpenTable · Goji Kitchen + Bar" },
  "Mo-Mo-Paradise · One Bangkok|กรุงเทพมหานคร": { url: "https://img.wongnai.com/p/1920x0/2024/12/21/1764d4deffd649819cdd7fdf5a9e2e13.jpg", source: "https://www.wongnai.com/restaurants/2892565aD-mo-mo-paradise-one-bangkok/photos/1764d4deffd649819cdd7fdf5a9e2e13", credit: "Wongnai · Mo-Mo-Paradise One Bangkok" },
  "Kodtalay The Riverfront Seafood Buffet|กรุงเทพมหานคร": { url: "https://img.wongnai.com/p/400x0/2024/11/25/2d3a5febc5244715a809ba907adf2106.jpg", source: "https://www.wongnai.com/restaurants/2861835Ie-%E0%B9%82%E0%B8%84%E0%B8%95%E0%B8%A3%E0%B8%97%E0%B8%B0%E0%B9%80%E0%B8%A5-kodtalay-seafood-buffet-the-riverfront/photos/2d3a5febc5244715a809ba907adf2106", credit: "Wongnai · Kodtalay The Riverfront" },
  "Chuankin Mookrata|กรุงเทพมหานคร": { url: "https://img.wongnai.com/p/1248x0/2021/05/02/d9417b74739c441f88606c90c2ae7c18.jpg", source: "https://www.wongnai.com/listings/yakiniku-in-banthat-thong", credit: "Wongnai · ChuanKin Mookrata" },
  "Balance Climbing|กรุงเทพมหานคร": { url: "https://framerusercontent.com/assets/1LGbYvu60a0cKsqnKaleMkAFAs.jpg", source: "https://www.balanceclimbing.com/about", credit: "Balance Climbing" },
  "สนามกีฬากลางจังหวัดกระบี่|กระบี่": { url: "https://image.makewebcdn.com/makeweb/m_1920x0/PQWfQz1dy/Krabi/34176.jpg?v=202405291424", source: "https://www.innosystem-1.com/album/4797/%E0%B8%AA%E0%B8%99%E0%B8%B2%E0%B8%A1%E0%B8%81%E0%B8%B5%E0%B8%AC%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%B5%E0%B9%88", credit: "สนามกีฬากระบี่" },
  "ไทย-ญี่ปุ่น ดินแดง|กรุงเทพมหานคร": { url: "https://stadiumdb.com/pictures/stadiums/tha/thai_japanese_stadium/thai_japanese_stadium03.jpg", source: "https://stadiumdb.com/stadiums/tha/thai_japanese_stadium", credit: "StadiumDB · Thai-Japanese Stadium" },
};
Object.assign(covers, entries);
fs.writeFileSync(file, `${JSON.stringify(covers, null, 2)}\n`);
console.log(`Updated ${Object.keys(entries).length} reviewed directory covers.`);
