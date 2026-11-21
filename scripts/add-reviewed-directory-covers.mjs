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
};
Object.assign(covers, entries);
fs.writeFileSync(file, `${JSON.stringify(covers, null, 2)}\n`);
console.log(`Updated ${Object.keys(entries).length} reviewed directory covers.`);
