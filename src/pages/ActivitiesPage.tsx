import { Localized } from "@/i18n/Language";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Dumbbell, MapPin, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui";
import { useSeo } from "@/lib/useSeo";
import activityDirectory from "@/data/activity-directory.json";
import studiosDirectory from "@/data/studios-directory.json";
import { DirectoryCover } from "@/components/DirectoryCover";
import { sceneVenues } from "@/data/live-programs";

type ActivityCategory = "climbing" | "shooting" | "karaoke" | "golf" | "football" | "fitness" | "sports" | "bowling" | "ice" | "park" | "nature" | "forest" | "mountain" | "cave" | "art" | "night" | "temple" | "nakhon-pathom" | "studio";
type ActivityPlace = { name: string; province: string; district?: string; categories: ActivityCategory[]; sourceUrl?: string; lat?: number; lon?: number; accessNote?: string };
const places: ActivityPlace[] = [
  ...(activityDirectory.places as ActivityPlace[]).map((p) => p.name.includes("ถ้ำ") && p.categories.includes("nature") ? { ...p, categories: [...p.categories, "cave" as const] } : p),
  ...sceneVenues.map((venue) => ({ name: venue.name, province: "กรุงเทพมหานคร", district: venue.area, categories: ["night" as const], sourceUrl: venue.source })),
  ...studiosDirectory.studios.map((studio) => ({ name: studio.name, province: studio.province, district: studio.district, categories: ["studio" as const], sourceUrl: studio.sourceUrl })),
];
const categories: Array<"all" | ActivityCategory> = ["all", "studio", "temple", "nakhon-pathom", "cave", "art", "night", "park", "nature", "forest", "mountain", "climbing", "shooting", "karaoke", "golf", "football", "fitness", "sports", "bowling", "ice"];
const categoryNames: Record<(typeof categories)[number], string> = {
  all: "กิจกรรมทั้งหมด", studio: "ห้องซ้อมดนตรี", temple: "วัด", "nakhon-pathom": "เที่ยวนครปฐม", cave: "ถ้ำ", art: "พื้นที่ศิลปะ", night: "พื้นที่ดนตรีกลางคืน", park: "สวนสาธารณะ / สวนออกกำลังกาย", nature: "อุทยาน / ธรรมชาติ", forest: "ป่า / วนอุทยาน", mountain: "ภูเขา / ดอย", climbing: "ปีนผา", shooting: "สนามยิงปืน", karaoke: "คาราโอเกะ", golf: "กอล์ฟ", football: "ฟุตบอล / ฟุตซอล", fitness: "ยิม / ฟิตเนส", sports: "สนามกีฬา / กีฬาอื่น ๆ", bowling: "โบว์ลิ่ง", ice: "สเก็ตน้ำแข็ง",
};

export default function ActivitiesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>(() => {
    const requested = new URLSearchParams(window.location.search).get("category");
    return categories.find((item) => item === requested) ?? "all";
  });
  const [province, setProvince] = useState("");
  useSeo({
    title: "กิจกรรม กีฬา สวน และธรรมชาติทั่วไทย",
    description: "ค้นหาสถานที่ทำกิจกรรมทั่วไทย ทั้งปีนผา ยิงปืน คาราโอเกะ กอล์ฟ ฟุตบอล ฟิตเนส สวนสาธารณะ ป่า ภูเขา และอุทยาน พร้อมแผนที่",
  });

  const provinces = useMemo(() => [...new Set(places.map((place) => place.province))].sort((a, b) => a.localeCompare(b, "th")), []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("th");
    return places.filter((place) => {
      const matchesText = !needle || `${place.name} ${place.province} ${place.categories.map((item) => categoryNames[item]).join(" ")}`.toLocaleLowerCase("th").includes(needle);
      return matchesText && (category === "all" || place.categories.includes(category)) && (!province || place.province === province);
    });
  }, [category, province, query]);

  return (
    <div className="container-x py-10 md:py-16">
      <section className="glass-panel bg-lilac/40 p-6 sm:p-9">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#315b50]"><Dumbbell className="h-4 w-4" aria-hidden /> FRAMEHUNT ACTIVITIES · THAILAND</div>
        <h1 className="display mt-3 text-4xl md:text-6xl">ออกไปทำอะไร<span className="text-burnt">.</span></h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-concrete sm:text-base">รวมที่ไปขยับตัวและออกไปอยู่กับธรรมชาติ ตั้งแต่สวนวิ่งในเมือง สวนป่าและสวนพฤกษศาสตร์ ไปจนถึงวนอุทยาน ภูเขา และอุทยานแห่งชาติทั่วประเทศ รวมถึงยิม ปีนผา กอล์ฟ สนามบอล และกิจกรรมในร่ม</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-concrete">
          <span className="clay-control border border-white bg-white/70 px-3 py-2">{places.length} จุดกิจกรรมในไดเรกทอรี</span>
          <span className="clay-control border border-white bg-white/70 px-3 py-2">{provinces.length} <Localized text="จังหวัด" /> </span>
          <Link to="/studios" className="clay-control border border-white bg-white/90 px-3 py-2 font-semibold text-[#315b50] hover:bg-[#315b50] hover:text-white">รวมห้องซ้อมดนตรี กทม.-ปริมณฑล →</Link>
        </div>
      </section>

      <section className="clay-panel my-6 grid gap-3 p-4 md:grid-cols-[1fr_14rem_14rem]" aria-label="ตัวกรองสถานที่ทำกิจกรรม">
        <label className="relative"><span className="sr-only">ค้นหาสถานที่หรือจังหวัด</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-concrete" aria-hidden /><Input type="search" className="pl-9" placeholder="ค้นหาชื่อสถานที่หรือจังหวัด" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label><span className="sr-only">ประเภทกิจกรรม</span><select className="clay-control h-11 w-full border border-white bg-white/80 px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}>{categories.map((item) => <option key={item} value={item}>{categoryNames[item]}</option>)}</select></label>
        <label><span className="sr-only"> <Localized text="จังหวัด" /> </span><select className="clay-control h-11 w-full border border-white bg-white/80 px-3 text-sm" value={province} onChange={(event) => setProvince(event.target.value)}><option value=""> <Localized text="ทุกจังหวัด" /> </option>{provinces.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </section>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><h2 className="text-lg font-bold">สถานที่ทำกิจกรรมทั่วไทย</h2><p className="text-xs text-concrete"> <Localized text="แสดง" /> {filtered.length} <Localized text="จาก" /> {places.length} แห่ง</p></div>
      {filtered.length === 0 ? <div className="clay-panel p-8 text-center text-concrete">ไม่พบสถานที่ ลองเปลี่ยนคำค้นหาหรือตัวกรอง</div> : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((place, index) => (
            <li key={`${place.name}-${place.province}-${index}`}>
              <article className="clay-panel flex h-full min-h-44 flex-col justify-between gap-5 p-5 transition-transform hover:-translate-y-0.5">
                <DirectoryCover name={place.name} province={place.province} />
                <div><div className="mb-3 flex flex-wrap gap-1.5">{place.categories.map((item) => <span key={item} className="rounded-full border border-white bg-lilac/60 px-2.5 py-1 text-[0.68rem] font-semibold text-[#315b50]">{categoryNames[item]}</span>)}</div><h3 className="font-bold leading-snug">{place.name}</h3><p className="mt-2 flex items-center gap-1.5 text-sm text-concrete"><MapPin className="h-3.5 w-3.5" aria-hidden />{place.district ? `${place.district} · ` : ""}{place.province}</p>{place.accessNote && <p className="mt-2 text-xs font-medium text-burnt">{place.accessNote}</p>}</div>
                <div className="flex flex-wrap gap-2"><a className="clay-control inline-flex w-fit items-center gap-1.5 border border-white bg-white/80 px-3 py-2 text-xs font-semibold text-[#315b50] hover:bg-[#315b50] hover:text-white" href={place.lat && place.lon ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.province} Thailand`)}`} target="_blank" rel="noreferrer"> <Localized text="แผนที่" /> <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></a>{place.sourceUrl && <a className="clay-control inline-flex w-fit items-center gap-1.5 border border-white bg-white/80 px-3 py-2 text-xs font-semibold text-[#315b50] hover:bg-[#315b50] hover:text-white" href={place.sourceUrl} target="_blank" rel="noreferrer"> <Localized text="ข้อมูลต้นทาง" /> <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></a>}</div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <aside className="mt-8 rounded-2xl border border-white/80 bg-white/55 p-4 text-xs leading-relaxed text-concrete">
        <p className="flex items-center gap-2 font-semibold text-[#315b50]"><Sparkles className="h-4 w-4" aria-hidden /> <Localized text="เกี่ยวกับข้อมูลในหน้านี้" /> </p>
        <p className="mt-2">รายชื่อสวนและพื้นที่อนุรักษ์มาจากทะเบียนกรมอุทยานฯ ชุดรายชื่ออุทยานปี 2567 และชุดพิกัดแหล่งท่องเที่ยวภายในอุทยานปี 2566 รวมถึงแค็ตตาล็อกสวนสาธารณะ กทม. รายการเป็นจุดเริ่มต้นสำหรับค้นหา ไม่ใช่การยืนยันว่าเปิดเข้าชมได้ทุกวัน บางแห่งมีฤดูกาลปิดหรือเงื่อนไขการเข้าพื้นที่ โปรดตรวจประกาศและสถานะล่าสุดก่อนออกเดินทาง</p>
        <p className="mt-2">แหล่งข้อมูลอ้างอิง: <a className="underline decoration-sage underline-offset-2" href="https://data.go.th/dataset/gdpublish-nationalparksname" target="_blank" rel="noreferrer">ทะเบียนอุทยานแห่งชาติ กรมอุทยานฯ</a> · <a className="underline decoration-sage underline-offset-2" href="https://data.go.th/dataset/gdpublish-typesofattractionsinnp" target="_blank" rel="noreferrer">พิกัดแหล่งท่องเที่ยวในอุทยานฯ</a> · <a className="underline decoration-sage underline-offset-2" href="https://data.go.th/dataset/gdpublish-tel-park" target="_blank" rel="noreferrer">ที่ติดต่ออุทยานและวนอุทยาน</a> · <a className="underline decoration-sage underline-offset-2" href="https://greener.bangkok.go.th/park/" target="_blank" rel="noreferrer">สวนสาธารณะ Greener Bangkok</a> · <a className="underline decoration-sage underline-offset-2" href="https://www.tsca.or.th/th/climbing-clubs" target="_blank" rel="noreferrer">สมาคมกีฬาปีนหน้าผาแห่งประเทศไทย</a> · <a className="underline decoration-sage underline-offset-2" href="https://www.thailandtourismdirectory.go.th/en/attraction/4887" target="_blank" rel="noreferrer">Thailand Tourism Directory: Pattaya Shooting Park</a> · <a className="underline decoration-sage underline-offset-2" href="https://invest.bangkok.go.th/sport/" target="_blank" rel="noreferrer">ศูนย์กีฬากรุงเทพมหานคร</a> · <a className="underline decoration-sage underline-offset-2" href="https://www.thailandgolfcourses.com/" target="_blank" rel="noreferrer">Thailand Golf Courses</a> · <a className="underline decoration-sage underline-offset-2" href="https://www.bluofriends.com/contact/" target="_blank" rel="noreferrer">Blu-O: สาขาและข้อมูลสนาม</a> · <a className="underline decoration-sage underline-offset-2" href="https://www.jetts.co.th/club/" target="_blank" rel="noreferrer">Jetts Thailand: รายชื่อสาขา</a></p>
      </aside>
    </div>
  );
}
