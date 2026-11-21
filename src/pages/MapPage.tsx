import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Crosshair, Layers, MapPin, Search, X } from "lucide-react";
import type { SearchFilters } from "@/data/types";
import { emptyFilters, radiusFromParam } from "@/data/types";
import { provinces } from "@/data/taxonomy";
import { MapCanvas } from "@/components/map/MapCanvas";
import { Button, Badge, Select } from "@/components/ui";
import { useSeo } from "@/lib/useSeo";
import { cn } from "@/lib/utils";
import { useLocationCatalog } from "@/services/catalogContext";
import { RadiusSelect } from "@/components/search/RadiusSelect";

const QUICK = [
  { key: "hidden", label: "HIDDEN FRAMES", slugs: ["hidden-frames"] },
  { key: "night", label: "NIGHT CITY", slugs: ["neon-night", "cyberpunk"] },
  { key: "music", label: "LIVE MUSIC", slugs: ["live-music", "underground-music", "hip-hop"] },
  { key: "temple", label: "TEMPLES", slugs: ["temple", "ancient-temple", "pagoda"] },
  { key: "cave", label: "CAVES", slugs: ["cave", "limestone"] },
  { key: "industrial", label: "INDUSTRIAL", slugs: ["industrial", "warehouse", "concrete"] },
  { key: "nature", label: "NATURE", slugs: ["mountain", "waterfall", "forest", "beach"] },
  { key: "art", label: "ART", slugs: ["art-gallery", "contemporary-art", "exhibition-space"] },
  { key: "heritage", label: "HERITAGE", slugs: ["historical-park", "ruins", "palace"] },
];

export default function MapPage() {
  const { locationStats, searchLocations } = useLocationCatalog();
  const [sp, setSp] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(sp.get("selected"));
  const [inView, setInView] = useState(false);
  const [bounds, setBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);

  const filters = useMemo<SearchFilters>(
    () => ({
      ...emptyFilters,
      q: sp.get("q") ?? "",
      province: sp.get("province") ?? "",
      categories: (sp.get("categories") ?? "").split(",").filter(Boolean),
      origin,
      radiusKm: radiusFromParam(sp.get("radius")),
      sort: origin ? "distance" : "relevance",
    }),
    [sp, origin],
  );

  const results = useMemo(() => searchLocations(filters), [searchLocations, filters]);
  const stats = locationStats();

  const visible = useMemo(() => {
    if (!inView || !bounds) return results;
    return results.filter(
      (r) =>
        r.location.longitude >= bounds.west &&
        r.location.longitude <= bounds.east &&
        r.location.latitude >= bounds.south &&
        r.location.latitude <= bounds.north,
    );
  }, [results, inView, bounds]);

  const selectedResult = useMemo(() => visible.find((r) => r.location.slug === selected) ?? null, [visible, selected]);

  function patch(next: { province?: string; categories?: string[]; q?: string; radiusKm?: number | null }) {
    const params = new URLSearchParams(sp);
    if (next.province !== undefined) {
      if (next.province) params.set("province", next.province);
      else params.delete("province");
    }
    if (next.categories !== undefined) {
      if (next.categories.length) params.set("categories", next.categories.join(","));
      else params.delete("categories");
    }
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.radiusKm !== undefined) {
      if (next.radiusKm) params.set("radius", String(next.radiusKm));
      else params.delete("radius");
    }
    setSp(params, { replace: true });
  }

  function toggleCategory(slugs: string[]) {
    const active = slugs.every((s) => filters.categories.includes(s));
    patch({
      categories: active
        ? filters.categories.filter((c) => !slugs.includes(c))
        : [...new Set([...filters.categories, ...slugs])],
    });
  }

  function locate() {
    setGeoError(false);
    if (!navigator.geolocation) {
      setGeoError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError(true),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  useSeo({
    title: "แผนที่โลเคชันถ่าย MV ทั่วประเทศไทย",
    description:
      "แผนที่โลเคชันถ่ายมิวสิกวิดีโอ ภาพยนตร์ และภาพนิ่งทั่วประเทศไทย พร้อมพิกัดที่ตรวจสอบจาก Wikidata และภาพถ่ายจริงจาก Wikimedia Commons",
  });

  const focus = selectedResult
    ? { lat: selectedResult.location.latitude, lng: selectedResult.location.longitude, zoom: 13 }
    : null;

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col">
      <div className="border-b border-line">
        <div className="container-x flex flex-wrap items-end justify-between gap-4 py-8 md:py-10">
          <div>
            <p className="label-mono text-acid">MAP EXPLORER · {stats.published} PUBLISHED LOCATIONS</p>
            <h1 className="mt-2 display text-4xl md:text-6xl">
              THE MAP<span className="text-burnt">.</span>
            </h1>
          </div>
          <p className="max-w-md font-sans text-xs leading-relaxed text-concrete">
            หมุดทุกจุดมาจากพิกัดที่ตรวจสอบแล้ว ไม่ใช่การประมาณจากภาพถ่าย คลิกหมุดเพื่อเปิดการ์ด หรือเลือกจากรายการด้านข้าง
          </p>
        </div>
      </div>

      <div className="container-x flex flex-1 flex-col gap-4 py-4 lg:flex-row">
        <aside className="glass-panel order-2 flex w-full shrink-0 flex-col overflow-hidden lg:order-1 lg:w-[345px]">
          <div className="space-y-3 border-b border-line p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-concrete" />
              <input
                type="search"
                value={filters.q}
                onChange={(e) => patch({ q: e.target.value })}
                placeholder="ค้นหาชื่อสถานที่…"
                aria-label="ค้นหาบนแผนที่"
                className="h-11 w-full rounded-xl border border-line bg-ink pl-9 pr-3 font-sans text-sm text-paper placeholder:text-concrete focus:border-acid focus:outline-none"
              />
            </div>

            <Select
              value={filters.province}
              onChange={(e) => patch({ province: e.target.value })}
              aria-label="กรองตามจังหวัด"
              className="h-10"
            >
              <option value="">ทุกจังหวัด</option>
              {provinces.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name_th} — {p.name_en}
                </option>
              ))}
            </Select>

            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((q) => {
                const on = q.slugs.every((s) => filters.categories.includes(s));
                return (
                  <button
                    key={q.key}
                    type="button"
                    onClick={() => toggleCategory(q.slugs)}
                    aria-pressed={on}
                    className={cn(
                      "border px-2 py-1.5 font-mono text-xs tracking-normal transition-colors",
                      on
                        ? "border-acid bg-acid text-ink"
                        : "border-paper/20 text-concrete hover:border-paper/50 hover:text-paper",
                    )}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={locate}
                className="flex items-center gap-1.5 font-mono text-xs tracking-normal text-concrete hover:text-acid"
              >
                <Crosshair className="h-3.5 w-3.5" />
                {origin ? "ตำแหน่งของฉัน" : "ใกล้ฉัน"}
              </button>
              <label className="flex items-center gap-1.5 font-mono text-xs tracking-normal text-concrete">
                <input
                  type="checkbox"
                  checked={inView}
                  onChange={(e) => setInView(e.target.checked)}
                  className="h-3 w-3 accent-acid"
                />
                ในพื้นที่แผนที่
              </label>
            </div>
            {origin && <RadiusSelect radiusKm={filters.radiusKm} onChange={(radiusKm) => patch({ radiusKm })} />}
            {geoError && (
              <p role="status" className="text-sm text-burnt">
                ใช้ตำแหน่งปัจจุบันไม่ได้ โปรดตรวจสิทธิ์ตำแหน่งในเบราว์เซอร์
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="label-mono text-concrete">{visible.length} RESULTS</span>
            {origin && (
              <button
                type="button"
                onClick={() => setOrigin(null)}
                className="flex items-center gap-1 font-mono text-xs tracking-normal text-acid"
              >
                <X className="h-3 w-3" /> CLEAR GPS
              </button>
            )}
          </div>

          <div className="max-h-[52vh] flex-1 overflow-y-auto lg:max-h-[clamp(14rem,45vh,31rem)]">
            {visible.length === 0 && (
              <div className="p-6 text-center">
                <Layers className="mx-auto h-6 w-6 text-concrete" />
                <p className="mt-3 font-sans text-sm text-concrete">ไม่พบสถานที่ในพื้นที่นี้</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setInView(false)}>
                  แสดงทั้งหมด
                </Button>
              </div>
            )}
            {visible.map((r) => {
              const cover = r.location.photos.find((p) => p.is_cover) ?? r.location.photos[0];
              const active = r.location.slug === selected;
              return (
                <button
                  key={r.location.id}
                  type="button"
                  onClick={() => setSelected(r.location.slug)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-line p-3 text-left transition-colors",
                    active ? "bg-acid/10" : "hover:bg-paper/[0.03]",
                  )}
                >
                  <img
                    src={cover?.thumb_url}
                    alt=""
                    loading="lazy"
                    className="h-16 w-16 shrink-0 border border-line object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-mono text-xs tracking-normal text-acid">
                      <MapPin className="h-2.5 w-2.5" /> {r.location.province_th}
                    </span>
                    <span className="mt-0.5 block truncate font-display text-base font-bold text-paper">
                      {r.location.name_th}
                    </span>
                    <span className="block font-mono text-xs tracking-normal text-concrete">
                      {r.location.photo_count} PHOTOS
                      {r.distanceKm != null ? ` · ${Math.round(r.distanceKm)} KM` : ""}
                    </span>
                  </span>
                  <ArrowUpRight className={cn("h-4 w-4 shrink-0", active ? "text-acid" : "text-concrete")} />
                </button>
              );
            })}
          </div>
        </aside>

        <div className="relative order-1 min-w-0 flex-1 lg:order-2">
          <MapCanvas
            locations={visible.map((r) => r.location)}
            height="clamp(22rem, 65vh, 51rem)"
            onBoundsChange={setBounds}
            focus={focus}
            onSelect={setSelected}
          />

          {selectedResult && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 mx-auto max-w-md lg:left-auto lg:right-6 lg:mx-0">
              <div className="glass-panel pointer-events-auto p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="label-mono text-acid">{selectedResult.location.province_th}</p>
                    <h2 className="mt-1 font-display text-2xl font-extrabold">{selectedResult.location.name_th}</h2>
                    <p className="font-sans text-xs text-concrete">{selectedResult.location.name_en}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label="ปิดการ์ด"
                    className="flex h-8 w-8 shrink-0 items-center justify-center border border-line text-concrete hover:text-acid"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="acid">{selectedResult.location.photo_count} VERIFIED PHOTOS</Badge>
                  <Badge>{selectedResult.location.location_type}</Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link to={`/locations/${selectedResult.location.slug}`} className="min-w-0 flex-1">
                    <Button size="sm" className="w-full">
                      เปิดรายละเอียด <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedResult.location.latitude},${selectedResult.location.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" variant="outline">
                      นำทาง
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
