import { Localized, useLanguage } from "@/i18n/Language";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, MapPin } from "lucide-react";
import { DirectoryCover } from "@/components/DirectoryCover";
import { hasDirectoryCover, useDirectoryCovers } from "@/services/directoryCovers";
import { LocationCard } from "@/components/location/LocationCard";
import { useLocationCatalog } from "@/services/catalogContext";
import { collectionItems, type CollectionKind } from "@/services/discoveryCollections";
import { useSeo } from "@/lib/useSeo";
import { useVisibleItems } from "@/lib/useVisibleItems";
import { LoadMoreButton } from "@/components/LoadMoreButton";

export default function CollectionPage() {
  const { kind } = useParams();
  const category: CollectionKind = kind === "art" || kind === "temple" || kind === "nakhon-pathom" ? kind : "cave";
  const title = category === "art" ? "พื้นที่ศิลปะ" : category === "temple" ? "วัดทั่วไทย" : category === "nakhon-pathom" ? "เที่ยวนครปฐม" : "ถ้ำทั่วไทย";
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const { data: coverIndex } = useDirectoryCovers();
  const { publishedLocations } = useLocationCatalog();
  const { locations, leads, count } = collectionItems(category, publishedLocations());
  const needle = query.trim().toLocaleLowerCase("th");
  const filteredLocations = useMemo(() => locations.filter((p) => `${p.name_th} ${p.name_en} ${p.province_th}`.toLocaleLowerCase("th").includes(needle)), [locations, needle]);
  const filteredLeads = useMemo(() => {
    const matches = leads.filter((place) =>
      `${place.name} ${place.province} ${place.district ?? ""}`.toLocaleLowerCase("th").includes(needle),
    );
    if (category === "nakhon-pathom") {
      matches.sort((a, b) => Number(hasDirectoryCover(coverIndex, b.name, b.province, b.sourceUrl)) - Number(hasDirectoryCover(coverIndex, a.name, a.province, a.sourceUrl)));
    }
    return matches;
  }, [category, coverIndex, leads, needle]);
  const { visibleItems: visibleLocations, remaining: remainingLocations, showMore: showMoreLocations } = useVisibleItems(filteredLocations, 48, `${category}|${needle}`);
  const { visibleItems: visibleLeads, remaining: remainingLeads, showMore: showMoreLeads } = useVisibleItems(filteredLeads, 48, `${category}|${needle}`);
  useSeo({ title, description: `ค้นหา${title} พร้อมแผนที่และแหล่งข้อมูล` });
  return <div className="container-x py-10 md:py-16">
    <section className="glass-panel bg-lilac/40 p-6 sm:p-9"><p className="text-sm font-semibold text-[#315b50]">FRAMEHUNT · COLLECTION</p><h1 className="display mt-3 text-4xl md:text-6xl"><Localized text={title} /><span className="text-burnt">.</span></h1><p className="mt-3 text-sm leading-relaxed text-concrete"><Localized text="รวมจุดค้นพบจากไดเรกทอรีและแหล่งข้อมูลสาธารณะ ตรวจสอบเงื่อนไขการเข้าชมก่อนเดินทาง" /> · {count}</p><input aria-label={t("ค้นหาชื่อสถานที่ จังหวัด หรืออำเภอ")} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("ค้นหาชื่อสถานที่ จังหวัด หรืออำเภอ เช่น กำแพงแสน")} className="clay-control mt-5 h-11 w-full max-w-xl border border-white bg-white/80 px-4 text-sm" /></section>
    <p className="my-6 text-sm text-concrete"> <Localized text="แสดง" /> {filteredLocations.length + filteredLeads.length} <Localized text="จาก" /> {count} <Localized text="แห่ง" /></p>
    {filteredLocations.length > 0 && <section><h2 className="mb-4 text-lg font-bold"><Localized text="โลเคชันพร้อมภาพ" /></h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleLocations.map((location) => <LocationCard key={location.id} location={location} />)}</div><LoadMoreButton remaining={remainingLocations} onClick={showMoreLocations} /></section>}
    {filteredLeads.length > 0 && <section className="mt-10"><h2 className="mb-2 text-lg font-bold"><Localized text="สถานที่เพิ่มเติม" /></h2><p className="mb-4 text-sm text-concrete"><Localized text="รายชื่อจากแหล่งข้อมูลสาธารณะ โปรดเช็กการเปิดและเงื่อนไขการเข้าชมกับสถานที่ก่อนเดินทาง" /></p><ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleLeads.map((place) => <li key={`${place.name}-${place.province}`}><article className="clay-panel flex h-full flex-col gap-4 p-5"><DirectoryCover name={place.name} province={place.province} source={place.sourceUrl} /><h3 className="font-bold">{place.name}</h3><p className="flex items-center gap-2 text-sm text-concrete"><MapPin className="h-4 w-4" aria-hidden />{place.province}</p><div className="mt-auto flex flex-wrap gap-2"><a className="clay-control bg-white/80 px-3 py-2 text-xs font-semibold text-[#315b50]" href={place.lat && place.lon ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.province}`)}`} target="_blank" rel="noreferrer"> <Localized text="แผนที่" /> <ArrowUpRight className="inline h-3 w-3" /></a>{place.sourceUrl && <a className="clay-control bg-white/80 px-3 py-2 text-xs font-semibold text-[#315b50]" href={place.sourceUrl} target="_blank" rel="noreferrer"> <Localized text="แหล่งข้อมูล" /> <ArrowUpRight className="inline h-3 w-3" /></a>}</div></article></li>)}</ul><LoadMoreButton remaining={remainingLeads} onClick={showMoreLeads} /></section>}
    {filteredLocations.length + filteredLeads.length === 0 && <p className="clay-panel p-8 text-center text-concrete"><Localized text="ไม่พบสถานที่ ลองเปลี่ยนคำค้นหา" /></p>}
    <Link to="/" className="mt-8 inline-block font-semibold text-[#315b50]"><Localized text="กลับหน้าแรก" /></Link>
  </div>;
}
