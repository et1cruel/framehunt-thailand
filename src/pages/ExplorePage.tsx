import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Bookmark, Grid2X2, List, LocateFixed, Map as MapIcon, X } from "lucide-react";
import type { SearchFilters } from "@/data/types";
import { emptyFilters, radiusFromParam } from "@/data/types";
import { provinces } from "@/data/taxonomy";
import { useLocationCatalog } from "@/services/catalogContext";
import { LocationCard } from "@/components/location/LocationCard";
import { MapCanvas } from "@/components/map/MapCanvas";
import { SearchBar } from "@/components/search/SearchBar";
import { ActiveFilterChips, FilterSheet, FilterSidebar, MobileFilterButton } from "@/components/search/FilterPanel";
import { EmptyState } from "@/components/search/EmptyState";
import { RadiusSelect } from "@/components/search/RadiusSelect";
import { Button } from "@/components/ui";
import { useSeo } from "@/lib/useSeo";

type View = "grid" | "list" | "map";
const PAGE = 12;
const SAVED_KEY = "framehunt:saved-searches";

function filtersFromParams(sp: URLSearchParams): SearchFilters {
  return {
    ...emptyFilters,
    q: sp.get("q") ?? "",
    province: sp.get("province") ?? "",
    region: sp.get("region") ?? "",
    categories: (sp.get("categories") ?? "").split(",").filter(Boolean),
    moods: (sp.get("moods") ?? "").split(",").filter(Boolean),
    permission: sp.get("permission") ?? "",
    radiusKm: radiusFromParam(sp.get("radius")),
    verifiedOnly: sp.get("verified") === "1",
    sort: (sp.get("sort") as SearchFilters["sort"]) || "relevance",
  };
}

export default function ExplorePage() {
  const { searchLocations } = useLocationCatalog();
  const [sp, setSp] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(sp), [sp]);
  const [query, setQuery] = useState(filters.q);
  const [sheet, setSheet] = useState(false);
  const [view, setView] = useState<View>((sp.get("view") as View) || "grid");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [visible, setVisible] = useState(PAGE);
  const [bounds, setBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null);
  const [inArea, setInArea] = useState(false);
  const [saved, setSaved] = useState<{ name: string; query: string }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    } catch {
      return [];
    }
  });
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(filters.q), [filters.q]);

  const effectiveFilters = useMemo<SearchFilters>(() => ({ ...filters, origin }), [filters, origin]);

  const allResults = useMemo(() => searchLocations(effectiveFilters), [effectiveFilters, searchLocations]);

  const results = useMemo(() => {
    if (!inArea || !bounds) return allResults;
    return allResults.filter(
      (r) =>
        r.location.longitude >= bounds.west &&
        r.location.longitude <= bounds.east &&
        r.location.latitude >= bounds.south &&
        r.location.latitude <= bounds.north,
    );
  }, [allResults, inArea, bounds]);

  useEffect(() => setVisible(PAGE), [sp, inArea, bounds]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisible((v) => Math.min(v + PAGE, results.length));
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [results.length]);

  const patch = useCallback(
    (next: Partial<SearchFilters>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams(sp);
      const setOrDelete = (key: string, value: string) => {
        if (value) params.set(key, value);
        else params.delete(key);
      };
      setOrDelete("q", merged.q);
      setOrDelete("province", merged.province);
      setOrDelete("region", merged.region);
      setOrDelete("categories", merged.categories.join(","));
      setOrDelete("moods", merged.moods.join(","));
      setOrDelete("permission", merged.permission);
      setOrDelete("radius", merged.radiusKm ? String(merged.radiusKm) : "");
      setOrDelete("verified", merged.verifiedOnly ? "1" : "");
      setOrDelete("sort", merged.sort === "relevance" ? "" : merged.sort);
      params.set("view", view);
      setSp(params, { replace: true });
    },
    [filters, sp, setSp, view],
  );

  const reset = useCallback(() => {
    setOrigin(null);
    setGeoError(false);
    setInArea(false);
    setSp(view === "grid" ? new URLSearchParams() : new URLSearchParams({ view }), { replace: true });
  }, [setSp, view]);

  function locate() {
    setGeoError(false);
    if (!navigator.geolocation) {
      setGeoError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        patch({ sort: "distance" });
      },
      () => setGeoError(true),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function saveSearch() {
    const label =
      query || (filters.province ? provinces.find((p) => p.slug === filters.province)?.name_th : "") || "การค้นหาของฉัน";
    const next = [{ name: label, query: sp.toString() }, ...saved.filter((s) => s.query !== sp.toString())].slice(0, 6);
    setSaved(next);
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  }

  useSeo({
    title: filters.q ? `ค้นหา “${filters.q}”` : "Explore locations",
    description: "ค้นหาโลเคชันถ่าย MV ทั่วประเทศไทย กรองตามจังหวัด หมวดหมู่ อารมณ์ และสถานะการอนุญาต พร้อมภาพถ่ายจริงที่ตรวจสอบแล้ว",
  });

  const activeCount =
    filters.categories.length + filters.moods.length + (filters.province ? 1 : 0) + (filters.permission ? 1 : 0);

  const provinceLabel = provinces.find((p) => p.slug === filters.province)?.name_th;

  return (
    <div className="container-x py-10 md:py-14">
      <div className="glass-panel flex flex-col gap-5 p-5 sm:p-7 lg:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="label-mono text-acid">LOCATION INDEX · {results.length} RESULTS</p>
            <h1 className="mt-2 display text-4xl md:text-6xl">
              EXPLORE<span className="text-burnt">.</span>
            </h1>
          </div>
          <div className="hidden text-right md:block">
            <p className="label-mono text-concrete">QUERY</p>
            <p className="mt-1 max-w-sm truncate font-sans text-sm text-concrete">
              {filters.q || provinceLabel || "ทุกสถานที่ที่เผยแพร่"}
            </p>
          </div>
        </div>

        <SearchBar
          value={query}
          onChange={(v) => {
            setQuery(v);
            patch({ q: v });
          }}
          onSubmit={(v) => patch({ q: v })}
          size="md"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={locate}
            className="clay-control flex min-h-11 items-center gap-2 border border-white bg-ink/85 px-3 font-mono text-xs tracking-normal text-concrete hover:border-acid hover:text-acid"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {origin ? "ใช้ตำแหน่งของฉันแล้ว" : "ใกล้ฉัน"}
          </button>
          {origin && <RadiusSelect radiusKm={filters.radiusKm} onChange={(radiusKm) => patch({ radiusKm })} />}
          <button
            type="button"
            onClick={saveSearch}
            className="clay-control flex min-h-11 items-center gap-2 border border-white bg-ink/85 px-3 font-mono text-xs tracking-normal text-concrete hover:border-acid hover:text-acid"
          >
            <Bookmark className="h-3.5 w-3.5" /> บันทึกการค้นหา
          </button>
          <div className="flex gap-1 rounded-xl border border-white bg-ink-2/90 p-0.5 sm:ml-auto">
            {(
              [
                { v: "grid", icon: Grid2X2, label: "GRID" },
                { v: "list", icon: List, label: "LIST" },
                { v: "map", icon: MapIcon, label: "MAP" },
              ] as const
            ).map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setView(v);
                  const params = new URLSearchParams(sp);
                  params.set("view", v);
                  setSp(params, { replace: true });
                }}
                aria-pressed={view === v}
                className={`flex h-10 items-center gap-2 px-3 font-mono text-xs tracking-normal transition-colors ${
                  view === v ? "bg-acid text-ink" : "text-concrete hover:text-paper"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
        {geoError && (
          <p role="status" className="text-sm text-burnt">
            ใช้ตำแหน่งปัจจุบันไม่ได้ โปรดตรวจสิทธิ์ตำแหน่งในเบราว์เซอร์
          </p>
        )}

        {saved.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-mono text-concrete">SAVED</span>
            {saved.map((s) => (
              <button
                key={s.query}
                type="button"
                onClick={() => setSp(new URLSearchParams(s.query))}
                className="border border-paper/15 px-2 py-1 font-sans text-xs text-concrete hover:border-acid hover:text-acid"
              >
                {s.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSaved([]);
                localStorage.removeItem(SAVED_KEY);
              }}
              className="text-concrete hover:text-burnt"
              aria-label="ล้างการค้นหาที่บันทึก"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-7 flex gap-6">
        <FilterSidebar filters={filters} onChange={patch} onReset={reset} resultCount={results.length} />

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <MobileFilterButton count={activeCount} onClick={() => setSheet(true)} />
              <span className="font-mono text-xs tracking-normal text-concrete">
                {results.length} LOCATIONS
                {origin && <span className="text-acid"> · DISTANCE SORTED</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {view === "map" && (
                <label className="flex items-center gap-2 font-mono text-xs tracking-normal text-concrete">
                  <input
                    type="checkbox"
                    checked={inArea}
                    onChange={(e) => setInArea(e.target.checked)}
                    className="h-3 w-3 accent-acid"
                  />
                  เฉพาะในพื้นที่แผนที่
                </label>
              )}
              <select
                value={filters.sort}
                onChange={(e) => patch({ sort: e.target.value as SearchFilters["sort"] })}
                aria-label="เรียงลำดับ"
                className="h-9 border border-paper/20 bg-ink px-2 font-mono text-xs tracking-normal text-concrete focus:border-acid focus:outline-none"
              >
                <option value="relevance">RELEVANCE</option>
                <option value="recent">RECENT</option>
                <option value="photos">MOST PHOTOS</option>
                <option value="distance">DISTANCE</option>
              </select>
            </div>
          </div>

          <ActiveFilterChips filters={filters} onChange={patch} onReset={reset} />

          <div className="mt-5">
            {view === "map" ? (
              <div className="space-y-4">
                <MapCanvas locations={results.map((r) => r.location)} height="62vh" onBoundsChange={setBounds} />
                <div className="grid gap-3 sm:grid-cols-2">
                  {results.slice(0, 6).map((r) => (
                    <Link
                      key={r.location.id}
                      to={`/locations/${r.location.slug}`}
                      className="group flex items-center justify-between border border-line p-3 hover:border-paper/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-bold">{r.location.name_th}</p>
                        <p className="font-mono text-xs tracking-normal text-concrete">
                          {r.location.province_th} · {r.location.photo_count} PHOTOS
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-concrete group-hover:text-acid" />
                    </Link>
                  ))}
                </div>
              </div>
            ) : results.length === 0 ? (
              <EmptyState
                onReset={reset}
                suggestions={[
                  { label: "โกดังและพื้นที่อุตสาหกรรม", href: "/explore?categories=warehouse,industrial" },
                  { label: "ถ้ำและหินปูน", href: "/explore?categories=cave,limestone" },
                  { label: "บรรยากาศ Gothic", href: "/explore?moods=gothic" },
                  { label: "Find My Vibe", href: "/find-my-vibe" },
                ]}
              />
            ) : view === "grid" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.slice(0, visible).map((r, i) => (
                    <LocationCard key={r.location.id} location={r.location} index={i} distanceKm={r.distanceKm} />
                  ))}
                </div>
                <div ref={sentinel} className="h-10" />
                {visible < results.length && (
                  <div className="mt-6 flex justify-center">
                    <Button variant="outline" onClick={() => setVisible((v) => v + PAGE)}>
                      โหลดเพิ่ม ({results.length - visible})
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div>
                {results.slice(0, visible).map((r, i) => (
                  <LocationCard
                    key={r.location.id}
                    location={r.location}
                    index={i}
                    variant="list"
                    distanceKm={r.distanceKm}
                  />
                ))}
                {visible < results.length && (
                  <div className="mt-6 flex justify-center">
                    <Button variant="outline" onClick={() => setVisible((v) => v + PAGE)}>
                      โหลดเพิ่ม ({results.length - visible})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-12 border-t border-line pt-5">
            <p className="font-sans text-xs leading-relaxed text-concrete">
              ผลลัพธ์ทั้งหมดอ้างอิงจากฐานข้อมูลที่เผยแพร่จริง · พิกัดจาก Wikidata · ภาพจาก Wikimedia Commons พร้อมเครดิตและใบอนุญาต ·
              สถานะการอนุญาตถ่ายทำที่ระบุ “ยังไม่ยืนยัน” หมายความว่าต้องตรวจสอบกับหน่วยงานก่อนทุกครั้ง
            </p>
          </div>
        </div>
      </div>

      <FilterSheet
        open={sheet}
        onOpenChange={setSheet}
        filters={filters}
        onChange={patch}
        onReset={reset}
        resultCount={results.length}
      />

      {origin && (
        <div className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 border border-acid/40 bg-ink px-4 py-2 font-mono text-xs tracking-normal text-acid shadow-xl">
          ใช้ตำแหน่งของคุณ · {origin.lat.toFixed(3)}, {origin.lng.toFixed(3)}
          <button type="button" onClick={() => setOrigin(null)} className="ml-3 text-concrete hover:text-paper">
            ปิด
          </button>
        </div>
      )}
    </div>
  );
}
