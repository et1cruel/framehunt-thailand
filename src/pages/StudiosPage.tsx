import { Localized } from "@/i18n/Language";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Disc,
  MapPin,
  Music,
  Phone,
  Search,
  Sliders,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Input } from "@/components/ui";
import { useSeo } from "@/lib/useSeo";
import studiosDirectory from "@/data/studios-directory.json";
import { DirectoryCover } from "@/components/DirectoryCover";
import { hasDirectoryCover, useDirectoryCovers } from "@/services/directoryCovers";

export type Studio = {
  id: string;
  name: string;
  province: string;
  district: string;
  address: string;
  rates: string;
  priceHourly: number;
  features: string[];
  equipment: string;
  phone?: string;
  sourceUrl: string;
  mapsUrl: string;
  imageUrl: string;
  imageCredit: string;
  description: string;
};

const studios = studiosDirectory.studios as Studio[];

const PROVINCE_OPTIONS = [
  { id: "all", label: "ทุกจังหวัด" },
  { id: "กรุงเทพมหานคร", label: "กรุงเทพมหานคร" },
  { id: "นนทบุรี", label: "นนทบุรี" },
  { id: "ปทุมธานี", label: "ปทุมธานี (รังสิต)" },
  { id: "สมุทรปราการ", label: "สมุทรปราการ" },
  { id: "นครปฐม", label: "นครปฐม (ศาลายา)" },
  { id: "สมุทรสาคร", label: "สมุทรสาคร (มหาชัย)" },
];

const FEATURE_TAGS = [
  "ทั้งหมด",
  "ห้องอัดเสียง",
  "Live Session",
  "ที่จอดรถ",
  "แอมป์หลอด",
  "ราคาประหยัด",
];

export default function StudiosPage() {
  const { data: coverIndex } = useDirectoryCovers();
  const [query, setQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [selectedFeature, setSelectedFeature] = useState("ทั้งหมด");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  useSeo({
    title: "ห้องซ้อมดนตรี กรุงเทพฯ และปริมณฑล รวมทุกย่านพร้อมภาพถ่ายและอุปกรณ์",
    description:
      "รวบรวมห้องซ้อมดนตรีชั้นนำในกรุงเทพฯ นนทบุรี ปทุมธานี สมุทรปราการ นครปฐม และสมุทรสาคร ครบทุกย่าน อัตราค่าบริการ รายการอุปกรณ์ แอมป์ กลอง คีย์บอร์ด พิกัดแผนที่ และภาพถ่ายจริง",
  });

  const provinceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: studios.length };
    for (const s of studios) {
      counts[s.province] = (counts[s.province] || 0) + 1;
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return studios.filter((studio) => {
      const matchText =
        !q ||
        `${studio.name} ${studio.district} ${studio.province} ${studio.equipment} ${studio.features.join(" ")} ${studio.description}`
          .toLowerCase()
          .includes(q);

      const matchProvince =
        selectedProvince === "all" || studio.province === selectedProvince;

      const matchFeature =
        selectedFeature === "ทั้งหมด" ||
        (selectedFeature === "ราคาประหยัด"
          ? studio.priceHourly <= 200
          : studio.features.some((f) => f.includes(selectedFeature)) ||
            studio.equipment.includes(selectedFeature));

      const matchPrice = !maxPrice || studio.priceHourly <= maxPrice;

      return matchText && matchProvince && matchFeature && matchPrice;
    }).sort((a, b) => Number(hasDirectoryCover(coverIndex, b.name, b.province, b.sourceUrl)) - Number(hasDirectoryCover(coverIndex, a.name, a.province, a.sourceUrl)));
  }, [coverIndex, query, selectedProvince, selectedFeature, maxPrice]);

  return (
    <div className="container-x py-10 md:py-16">
      {/* ── HEADER BANNER ────────────────────────────────────────────── */}
      <section className="glass-panel bg-lilac/40 p-6 sm:p-9">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#315b50]">
          <Music className="h-4 w-4" aria-hidden />
          FRAMEHUNT MUSIC STUDIOS · BANGKOK & METROPOLITAN
        </div>
        <h1 className="display mt-3 text-4xl md:text-6xl"> <Localized text="ห้องซ้อมดนตรี" /> <span className="text-burnt">.</span>
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-concrete sm:text-base">
          รวมห้องซ้อมดนตรี สตูดิโอบันทึกเสียง และห้องซ้อมวงในกรุงเทพฯ และปริมณฑล 
          (นนทบุรี, ปทุมธานี, สมุทรปราการ, นครปฐม, สมุทรสาคร) 
          คัดสรรสตูดิโอที่มีอุปกรณ์ได้มาตรฐาน ทั้งแอมป์หลอด ชุดกลอง คีย์บอร์ด ระบบมอนิเตอร์ 
          พร้อมภาพถ่ายสถานที่จริง พิกัดแผนที่ และอัตราค่าบริการรายชั่วโมง
        </p>

        {/* Quick Highlights */}
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-concrete">
          <span className="clay-control border border-white bg-white/70 px-3 py-2 font-semibold text-acid">
            {studios.length} ห้องซ้อมในระบบ
          </span>
          <span className="clay-control border border-white bg-white/70 px-3 py-2">
            ครอบคลุม 6 จังหวัด (กทม. และ 5 จังหวัดปริมณฑล)
          </span>
          <span className="clay-control border border-white bg-white/70 px-3 py-2">
            ราคาเริ่มต้น ฿150 - ฿400 / ชม.
          </span>
          <Link
            to="/live-music"
            className="clay-control border border-white bg-white/90 px-3 py-2 font-semibold text-[#315b50] hover:bg-[#315b50] hover:text-white"
          >
            ดูงานดนตรีสดและไลฟ์เฮาส์ →
          </Link>
        </div>
      </section>

      {/* ── PROVINCE TABS ────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
        {PROVINCE_OPTIONS.map((item) => {
          const active = selectedProvince === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedProvince(item.id)}
              className={`clay-control inline-flex items-center gap-1.5 whitespace-nowrap border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                active
                  ? "border-[#315b50] bg-[#315b50] text-white shadow-clay"
                  : "border-white bg-white/75 text-concrete hover:bg-white hover:text-acid"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  active ? "bg-white/20 text-white" : "bg-lilac/70 text-ink"
                }`}
              >
                {provinceCounts[item.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── SEARCH & FILTER CONTROLS ─────────────────────────────────── */}
      <section
        className="clay-panel my-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto]"
        aria-label="ตัวกรองห้องซ้อมดนตรี"
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-concrete"
            aria-hidden
          />
          <Input
            type="search"
            className="pl-9"
            placeholder="ค้นหาชื่อห้องซ้อม, ย่าน (เช่น ลาดพร้าว, รังสิต, ศาลายา), ตู้แอมป์, กลอง..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Feature quick filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs font-medium text-concrete">
            <Sliders className="h-3.5 w-3.5" /> ฟีเจอร์:
          </span>
          {FEATURE_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedFeature(tag)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                selectedFeature === tag
                  ? "bg-acid text-ink font-bold"
                  : "bg-white/80 text-concrete hover:bg-white hover:text-ink"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Price filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-concrete">งบ:</span>
          <select
            className="clay-control h-10 border border-white bg-white/80 px-3 text-xs font-semibold text-ink"
            value={maxPrice ?? ""}
            onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">ทุกช่วงราคา</option>
            <option value="200">ไม่เกิน ฿200 / ชม.</option>
            <option value="250">ไม่เกิน ฿250 / ชม.</option>
            <option value="300">ไม่เกิน ฿300 / ชม.</option>
            <option value="400">ไม่เกิน ฿400 / ชม.</option>
          </select>
        </div>
      </section>

      {/* ── RESULTS HEADER ───────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-burnt" />
          รายชื่อห้องซ้อมดนตรี
          {selectedProvince !== "all" && (
            <span className="text-sm font-normal text-concrete">
              ({selectedProvince})
            </span>
          )}
        </h2>
        <p className="text-xs text-concrete"> <Localized text="แสดง" /> {filtered.length} จากทั้งหมด {studios.length} แห่ง
        </p>
      </div>

      {/* ── STUDIOS GRID ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="clay-panel p-10 text-center text-concrete">
          <Disc className="mx-auto h-8 w-8 text-concrete opacity-50 animate-pulse" />
          <p className="mt-3 text-base font-semibold">ไม่พบห้องซ้อมที่ตรงตามเงื่อนไข</p>
          <p className="mt-1 text-xs">ลองล้างคำค้นหาหรือเปลี่ยนตัวกรองจังหวัด</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedProvince("all");
              setSelectedFeature("ทั้งหมด");
              setMaxPrice(null);
            }}
            className="clay-control mt-4 inline-block border border-white bg-white px-4 py-2 text-xs font-semibold text-acid"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((studio) => (
            <li key={studio.id} className="flex">
              <article className="clay-panel flex w-full flex-col justify-between overflow-hidden p-5 transition-transform hover:-translate-y-1">
                <div>
                  {/* Photo with cover component */}
                  <DirectoryCover
                    name={studio.name}
                    province={studio.province}
                    source={studio.sourceUrl}
                  />

                  {/* Header badges: province + price */}
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white bg-[#315b50]/10 px-2.5 py-0.5 text-[0.7rem] font-bold text-[#315b50]">
                      <MapPin className="h-3 w-3" />
                      {studio.district} · {studio.province}
                    </span>
                    <span className="rounded-full bg-acid/25 px-2.5 py-0.5 text-[0.72rem] font-bold text-ink">
                      {studio.rates}
                    </span>
                  </div>

                  {/* Studio name */}
                  <h3 className="font-bold text-base leading-snug sm:text-lg">
                    {studio.name}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 text-xs leading-relaxed text-concrete">
                    {studio.description}
                  </p>

                  {/* Features list */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {studio.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-md border border-white/60 bg-white/70 px-2 py-0.5 text-[0.68rem] font-medium text-concrete"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Equipment highlight box */}
                  <div className="mt-3 rounded-xl border border-white/80 bg-lilac/30 p-2.5 text-[0.72rem] leading-relaxed text-concrete">
                    <span className="font-semibold text-ink flex items-center gap-1 mb-0.5">
                      <Volume2 className="h-3 w-3 text-burnt" /> อุปกรณ์เด่น:
                    </span>
                    {studio.equipment}
                  </div>

                  {/* Address */}
                  <p className="mt-2.5 text-[0.7rem] text-concrete/80 flex items-start gap-1">
                    <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-concrete" />
                    <span>{studio.address}</span>
                  </p>
                </div>

                {/* Footer Buttons */}
                <div className="mt-4 pt-3 border-t border-line/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <a
                      href={studio.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="clay-control inline-flex items-center gap-1 border border-white bg-white/85 px-2.5 py-1.5 text-xs font-semibold text-[#315b50] hover:bg-[#315b50] hover:text-white"
                    > <Localized text="แผนที่" /> <ArrowUpRight className="h-3 w-3" />
                    </a>

                    {studio.sourceUrl && (
                      <a
                        href={studio.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="clay-control inline-flex items-center gap-1 border border-white bg-white/85 px-2.5 py-1.5 text-xs font-semibold text-[#315b50] hover:bg-[#315b50] hover:text-white"
                      >
                        ข้อมูล/ติดต่อ <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {studio.phone && (
                    <a
                      href={`tel:${studio.phone.replace(/[^0-9]/g, "")}`}
                      className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-burnt hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {studio.phone}
                    </a>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {/* ── FOOTER GUIDE / TIPS ──────────────────────────────────────── */}
      <aside className="mt-10 rounded-2xl border border-white/80 bg-white/60 p-5 text-xs leading-relaxed text-concrete">
        <p className="flex items-center gap-2 font-semibold text-[#315b50] text-sm">
          <Sparkles className="h-4 w-4" aria-hidden /> เกร็ดแนะนำสำหรับนักดนตรีในการจองห้องซ้อม
        </p>
        <ul className="mt-2.5 space-y-1.5 list-disc list-inside">
          <li>
            <strong>ควรโทรหรือทักแชทจองคิวล่วงหน้า:</strong> โดยเฉพาะช่วงวันหยุดสุดสัปดาห์ เสาร์-อาทิตย์ และช่วงเย็นหลังเลิกงานหรือเลิกเรียน คิวจะเต็มเร็วมาก
          </li>
          <li>
            <strong>ส่วนลดนักเรียน/นักศึกษา:</strong> ห้องซ้อมใกล้มหาวิทยาลัย (เช่น ม.กรุงเทพ, ม.ศิลปากร, ม.มหิดล, สจล.) มักมีโปรโมชั่นหรือราคาพิเศษเพียงแสดงบัตรนักศึกษา
          </li>
          <li>
            <strong>การบันทึกเสียงและ Live Session:</strong> หากต้องการอัดเสียงแบบ Multi-track หรือบันทึกภาพ แนะนำสตูดิโอที่มี Control Room เช่น Minerva, Polarbear, Vintage Studio, หรือ The Overlook Salaya
          </li>
          <li>
            <strong>เตรียมอุปกรณ์ส่วนตัว:</strong> แนะนำให้นำปิ๊กกีตาร์ ไม้กลอง สายสะพาย และสายแจ็คสำรองของตัวเองไปด้วยเพื่อความคุ้นมือและพร้อมลุย
          </li>
        </ul>
      </aside>
    </div>
  );
}
