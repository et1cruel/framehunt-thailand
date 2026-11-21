import { useMemo, useState } from "react";
import { ArrowUpRight, MapPin, Search, Shirt, Store } from "lucide-react";
import { Input } from "@/components/ui";
import { useSeo } from "@/lib/useSeo";
import directory from "@/data/secondhand-shops.json";
import { DirectoryCover } from "@/components/DirectoryCover";

type ShopKind = "japan" | "clothing" | "vintage";
type Shop = {
  name: string;
  province: string;
  kind: ShopKind;
  source: string;
  sourceName: string;
  lastObservedAt: string | null;
  mapsUrl: string;
  hours: string | null;
};

const shops = directory.shops as Shop[];
const kindLabels: Record<ShopKind, string> = {
  japan: "โกดัง / ร้านสินค้าญี่ปุ่นมือสอง",
  clothing: "เสื้อผ้ามือสอง / วินเทจ",
  vintage: "วินเทจและของสะสม",
};
const dateFormatter = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });
function observedDate(value: string) {
  const parsed = new Date(`${value}T12:00:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
}

export default function SecondhandPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | ShopKind>("all");
  const [province, setProvince] = useState("");
  useSeo({
    title: "ร้านเสื้อผ้ามือสองและโกดังญี่ปุ่นทั่วไทย",
    description: "รวมโกดังญี่ปุ่นมือสองและร้านเสื้อผ้ามือสองทั่วประเทศไทย ค้นหาตามจังหวัด พร้อมลิงก์แผนที่และหน้าร้าน",
  });

  const provinces = useMemo(() => [...new Set(shops.map((shop) => shop.province))].sort((a, b) => a.localeCompare(b, "th")), []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("th");
    return shops.filter((shop) => {
      const textMatches = !needle || `${shop.name} ${shop.province} ${shop.sourceName}`.toLocaleLowerCase("th").includes(needle);
      return textMatches && (kind === "all" || shop.kind === kind) && (!province || shop.province === province);
    });
  }, [kind, province, query]);

  return (
    <div className="container-x py-10 md:py-16">
      <section className="glass-panel bg-lilac/40 p-6 sm:p-9">
        <div className="flex items-center gap-2 text-sm font-semibold text-sage">
          <Shirt className="h-4 w-4" aria-hidden />
          SECONDHAND FINDS · THAILAND
        </div>
        <h1 className="display mt-3 text-4xl md:text-6xl">
          SECONDHAND<span className="text-burnt">.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-concrete sm:text-base">
          รวมโกดังสินค้าญี่ปุ่นมือสองและแหล่งเสื้อผ้ามือสองจากหลายจังหวัด มีทั้งโกดังให้คุ้ย ร้านวินเทจคัดชิ้น และตลาดนัด
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-concrete">
          <span className="clay-control border border-white bg-white/70 px-3 py-2">โกดังญี่ปุ่น 153 แห่ง · แหล่งข้อมูลรวบรวม 28 ก.ค. 2569</span>
          <span className="clay-control border border-white bg-white/70 px-3 py-2">ร้านวินเทจ / เสื้อผ้ามือสองเพิ่มจากไกด์ท้องถิ่น</span>
        </div>
      </section>

      <section className="clay-panel my-6 grid gap-3 p-4 md:grid-cols-[1fr_14rem_14rem]" aria-label="ตัวกรองร้านมือสอง">
        <label className="relative">
          <span className="sr-only">ค้นหาชื่อร้านหรือจังหวัด</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-concrete" aria-hidden />
          <Input type="search" className="pl-9" placeholder="ค้นหาชื่อร้านหรือจังหวัด" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          <span className="sr-only">ประเภทสถานที่</span>
          <select className="clay-control h-11 w-full border border-white bg-white/80 px-3 text-sm" value={kind} onChange={(event) => setKind(event.target.value as "all" | ShopKind)}>
            <option value="all">ทุกประเภท</option>
            <option value="japan">โกดังสินค้าญี่ปุ่น</option>
            <option value="clothing">เสื้อผ้ามือสอง</option>
            <option value="vintage">วินเทจ / ของสะสม</option>
          </select>
        </label>
        <label>
          <span className="sr-only">จังหวัด</span>
          <select className="clay-control h-11 w-full border border-white bg-white/80 px-3 text-sm" value={province} onChange={(event) => setProvince(event.target.value)}>
            <option value="">ทุกจังหวัด</option>
            {provinces.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </section>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-bold">แหล่งช้อปมือสองทั่วไทย</h2>
        <p className="text-xs text-concrete">แสดง {filtered.length} จาก {shops.length} แห่ง · แนะนำให้เช็กวันเปิดกับร้านก่อนเดินทาง</p>
      </div>
      {filtered.length === 0 ? (
        <div className="clay-panel p-8 text-center text-concrete">ไม่พบร้าน ลองเปลี่ยนคำค้นหาหรือตัวกรอง</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((shop, index) => (
            <li key={`${shop.name}-${shop.province}-${index}`}>
              <article className="clay-panel flex h-full min-h-44 flex-col justify-between gap-5 p-5 transition-transform hover:-translate-y-0.5">
                <div>
                  <DirectoryCover name={shop.name} province={shop.province} />
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-white bg-lilac/60 px-2.5 py-1 text-[0.68rem] font-semibold text-sage">{kindLabels[shop.kind]}</span>
                    <Store className="h-4 w-4 shrink-0 text-sage" aria-hidden />
                  </div>
                  <h3 className="font-bold leading-snug">{shop.name}</h3>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-concrete"><MapPin className="h-3.5 w-3.5" aria-hidden />{shop.province}</p>
                  {shop.lastObservedAt && <p className="mt-2 text-xs text-concrete">บันทึกในแหล่งข้อมูล: {observedDate(shop.lastObservedAt)}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a className="clay-control inline-flex items-center gap-1.5 border border-white bg-white/80 px-3 py-2 text-xs font-semibold text-sage hover:bg-sage hover:text-white" href={shop.mapsUrl} target="_blank" rel="noreferrer">
                    แผนที่ <MapPin className="h-3.5 w-3.5" aria-hidden />
                  </a>
                  <a className="clay-control inline-flex items-center gap-1.5 border border-white bg-white/80 px-3 py-2 text-xs font-semibold text-sage hover:bg-sage hover:text-white" href={shop.source} target="_blank" rel="noreferrer">
                    {shop.kind === "japan" ? "เพจร้าน / แหล่งที่มา" : "ข้อมูลร้าน"} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 rounded-2xl border border-white/80 bg-white/55 p-4 text-xs leading-relaxed text-concrete">
        รายชื่อโกดังญี่ปุ่นมาจากฐานข้อมูลสาธารณะที่ระบุวันที่รวบรวมไว้ 28 กรกฎาคม 2569 ส่วนร้านเสื้อผ้า/วินเทจเพิ่มเติมมาจากไกด์ร้านในกรุงเทพฯ และเชียงใหม่ รายชื่อเป็นจุดเริ่มต้นสำหรับค้นหา ไม่รับรองสถานะกิจการหรือเวลาเปิดปัจจุบัน โปรดตรวจสอบกับร้านก่อนออกเดินทาง
      </p>
    </div>
  );
}
