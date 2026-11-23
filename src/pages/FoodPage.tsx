import { Localized, useLanguage } from "@/i18n/Language";
import { useMemo, useState } from "react";
import { ArrowUpRight, ForkKnife, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui";
import { useSeo } from "@/lib/useSeo";
import foodDirectory from "@/data/food-directory.json";
import { DirectoryCover } from "@/components/DirectoryCover";
import { hasDirectoryCover, useDirectoryCovers } from "@/services/directoryCovers";
import { useVisibleItems } from "@/lib/useVisibleItems";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { provinceLabel } from "@/lib/provinceLabel";

type FoodCategory = "michelin" | "local" | "mookata" | "buffet";
type Restaurant = {
  name: string;
  province: string;
  categories: FoodCategory[];
  source: string;
  sourceName: string;
  mapsUrl: string;
  sourceDate: string | null;
};

const restaurants = foodDirectory.restaurants as Restaurant[];
const categoryLabels: Record<FoodCategory, string> = {
  michelin: "MICHELIN Guide",
  local: "ร้านอาหารถิ่น",
  mookata: "หมูกระทะ",
  buffet: "บุฟเฟต์",
};
const categories: Array<"all" | FoodCategory> = ["all", "mookata", "buffet", "local", "michelin"];
const categoryNames: Record<(typeof categories)[number], string> = {
  all: "ร้านทั้งหมด",
  mookata: "หมูกระทะ",
  buffet: "บุฟเฟต์",
  local: "ร้านอาหารถิ่น",
  michelin: "MICHELIN Guide",
};

export default function FoodPage() {
  const { data: coverIndex } = useDirectoryCovers();
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("all");
  const [province, setProvince] = useState("");
  useSeo({
    title: "ร้านอร่อย หมูกระทะ บุฟเฟต์ และอาหารถิ่นทั่วไทย",
    description: "ค้นหาร้านอาหารแนะนำทั่วไทย ทั้งหมูกระทะ บุฟเฟต์ ร้านอาหารถิ่น และร้านใน MICHELIN Guide พร้อมลิงก์แผนที่และแหล่งข้อมูล",
  });

  const provinces = useMemo(() => [...new Set(restaurants.map((restaurant) => restaurant.province))].sort((a, b) => a.localeCompare(b, "th")), []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("th");
    return restaurants.filter((restaurant) => {
      const matchesText = !needle || `${restaurant.name} ${restaurant.province} ${restaurant.sourceName}`.toLocaleLowerCase("th").includes(needle);
      const matchesCategory = category === "all" || restaurant.categories.includes(category);
      return matchesText && matchesCategory && (!province || restaurant.province === province);
    }).sort((a, b) => Number(hasDirectoryCover(coverIndex, b.name, b.province, b.source)) - Number(hasDirectoryCover(coverIndex, a.name, a.province, a.source)));
  }, [category, coverIndex, province, query]);
  const { visibleItems, remaining, showMore } = useVisibleItems(filtered, 48, `${query}|${category}|${province}`);
  const michelinCount = restaurants.filter((restaurant) => restaurant.categories.includes("michelin")).length;

  return (
    <div className="container-x py-10 md:py-16">
      <section className="glass-panel bg-lilac/40 p-6 sm:p-9">
        <div className="flex items-center gap-2 text-sm font-semibold text-acid">
          <ForkKnife className="h-4 w-4" aria-hidden />
          FRAMEHUNT FOOD · THAILAND
        </div>
        <h1 className="display mt-3 text-4xl md:text-6xl"> <Localized text="กินทั่วไทย" /> <span className="text-burnt">.</span>
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-concrete sm:text-base">
          <Localized text="จากหมูกระทะบุฟเฟต์มื้อดึก ไปจนถึงร้านอาหารถิ่นและร้านแนะนำทั่วประเทศ รวมไว้ให้ค้นหาตามชื่อ ประเภท และจังหวัด" />
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-concrete">
          <span className="clay-control border border-white bg-white/70 px-3 py-2">MICHELIN Guide Thailand 2027 · {michelinCount} <Localized text="ร้าน" /></span>
          <span className="clay-control border border-white bg-white/70 px-3 py-2"><Localized text="ร้านอาหารถิ่นและร้านหมูกระทะ / บุฟเฟต์เพิ่มจากไกด์เฉพาะพื้นที่" /></span>
        </div>
      </section>

      <section className="clay-panel my-6 grid gap-3 p-4 md:grid-cols-[1fr_14rem_14rem]" aria-label={t("ตัวกรองร้านอาหาร")}>
        <label className="relative">
          <span className="sr-only"> <Localized text="ค้นหาชื่อร้านหรือจังหวัด" /> </span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-concrete" aria-hidden />
          <Input type="search" className="pl-9" placeholder={t("ค้นหาชื่อร้านหรือจังหวัด")} value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          <span className="sr-only"><Localized text="ประเภทอาหาร" /></span>
          <select className="clay-control h-11 w-full border border-white bg-white/80 px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}>
            {categories.map((item) => <option key={item} value={item}>{t(categoryNames[item])}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only"> <Localized text="จังหวัด" /> </span>
          <select className="clay-control h-11 w-full border border-white bg-white/80 px-3 text-sm" value={province} onChange={(event) => setProvince(event.target.value)}>
            <option value=""> <Localized text="ทุกจังหวัด" /> </option>
            {provinces.map((item) => <option key={item} value={item}>{provinceLabel(item, language)}</option>)}
          </select>
        </label>
      </section>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-bold"><Localized text="ร้านอาหารแนะนำทั่วไทย" /></h2>
        <p className="text-xs text-concrete"> <Localized text="แสดง" /> {filtered.length} <Localized text="จาก" /> {restaurants.length} <Localized text="ร้าน · เช็กสาขาและเวลาเปิดกับร้านก่อนเดินทาง" /></p>
      </div>

      {filtered.length === 0 ? (
        <div className="clay-panel p-8 text-center text-concrete"> <Localized text="ไม่พบร้าน ลองเปลี่ยนคำค้นหาหรือตัวกรอง" /> </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((restaurant, index) => (
            <li key={`${restaurant.name}-${restaurant.province}-${index}`}>
              <article className="clay-panel flex h-full min-h-48 flex-col justify-between gap-5 p-5 transition-transform hover:-translate-y-0.5">
                <div>
                  <DirectoryCover name={restaurant.name} province={restaurant.province} source={restaurant.source} />
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {restaurant.categories.map((item) => (
                      <span key={item} className="rounded-full border border-white bg-lilac/60 px-2.5 py-1 text-[0.68rem] font-semibold text-acid">{<Localized text={categoryLabels[item]} />}</span>
                    ))}
                  </div>
                  <h3 className="font-bold leading-snug">{restaurant.name}</h3>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-concrete"><MapPin className="h-3.5 w-3.5" aria-hidden />{provinceLabel(restaurant.province, language)}</p>
                  <p className="mt-2 text-xs text-concrete"><Localized text="แหล่งข้อมูล:" /> {restaurant.sourceName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a className="clay-control inline-flex items-center gap-1.5 border border-white bg-white/80 px-3 py-2 text-xs font-semibold text-acid hover:bg-sage" href={restaurant.mapsUrl} target="_blank" rel="noreferrer"> <Localized text="แผนที่" /> <MapPin className="h-3.5 w-3.5" aria-hidden />
                  </a>
                  <a className="clay-control inline-flex items-center gap-1.5 border border-white bg-white/80 px-3 py-2 text-xs font-semibold text-acid hover:bg-sage" href={restaurant.source} target="_blank" rel="noreferrer"> <Localized text="รายละเอียด / แหล่งที่มา" /> <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      <LoadMoreButton remaining={remaining} onClick={showMore} />

      <p className="mt-8 rounded-2xl border border-white/80 bg-white/55 p-4 text-xs leading-relaxed text-concrete">
        <Localized text="รายชื่อ MICHELIN อ้างอิงจากฉบับ Thailand 2027 ส่วนร้านอาหารถิ่นคัดจาก Thai Foodie Map โดย ททท. และ Booking.com และหมูกระทะ/บุฟเฟต์จากไกด์เฉพาะพื้นที่ รายการนี้เป็นสารบบสำหรับค้นพบร้าน ไม่ใช่รายชื่อครบทุกกิจการในไทย สาขา เวลาเปิด ราคา และรายการบุฟเฟต์เปลี่ยนได้ โปรดตรวจสอบกับร้านก่อนเดินทาง" />
      </p>
    </div>
  );
}
