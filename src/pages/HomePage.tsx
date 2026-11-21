import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Dices, MapPin, Camera, ShieldCheck, Compass } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { LocationCard, PhotoImage } from "@/components/location/LocationCard";
import { MapCanvas } from "@/components/map/MapCanvas";
import { Button } from "@/components/ui";
import { QUICK_CATEGORIES, REGION_LABELS, categories, moods } from "@/data/taxonomy";
import { collectionItems } from "@/services/discoveryCollections";
import { useLocationCatalog } from "@/services/catalogContext";
import type { LocationRecord } from "@/data/types";
import { useSeo } from "@/lib/useSeo";

function pickImage(loc: LocationRecord | undefined) {
  return loc?.photos.find((p) => p.is_cover) ?? loc?.photos[0];
}

export default function HomePage() {
  const { findMyVibe, locationStats, publishedLocations, randomLocation } = useLocationCatalog();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [vibeMoods, setVibeMoods] = useState<string[]>(["dark", "cinematic"]);

  const published = publishedLocations();
  const stats = locationStats();

  const hero = useMemo(
    () =>
      published.find((l) => l.slug === "wat-arun") ?? [...published].sort((a, b) => b.photo_count - a.photo_count)[0],
    [published],
  );
  const heroPhoto = pickImage(hero);

  const featured = useMemo(() => published.filter((l) => l.slug !== hero?.slug).slice(0, 4), [published, hero?.slug]);

  const recent = useMemo(
    () =>
      [...published]
        .sort(
          (a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "") || a.name_en.localeCompare(b.name_en),
        )
        .slice(0, 5),
    [published],
  );

  const vibeMatches = useMemo(() => findMyVibe(vibeMoods, null, 3), [findMyVibe, vibeMoods]);

  const regionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of published) map.set(l.region, (map.get(l.region) ?? 0) + 1);
    return map;
  }, [published]);

  useSeo({
    title: "FRAMEHUNT THAILAND — Find your next frame.",
    description: "ค้นหาโลเคชันถ่าย MV ภาพยนตร์ และแฟชั่นทั่วประเทศไทย พร้อมภาพถ่ายจริงที่ตรวจสอบสิทธิ์ แผนที่ และข้อมูลการขออนุญาต",
    image: heroPhoto?.image_url,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "FRAMEHUNT THAILAND",
      url: "https://framehunt.co/",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://framehunt.co/explore?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  });

  if (!hero) {
    return (
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="display text-5xl">NO VERIFIED LOCATIONS YET</h1>
        <p className="mt-4 max-w-md font-sans text-sm text-concrete">
          ยังไม่มีสถานที่ที่ผ่านเกณฑ์ภาพถ่ายจริง 5 ภาพ — ตรวจสอบรายงานการนำเข้าข้อมูลหรือเพิ่มสถานที่ผ่านหน้า Admin
        </p>
        <Link to="/admin" className="mt-6">
          <Button>เปิด Admin</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <section className="container-x pt-5 sm:pt-8 lg:pt-10">
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[0.88fr_1.12fr] lg:gap-5">
          <div className="glass-panel relative z-10 flex min-w-0 flex-col justify-center px-5 py-6 sm:px-9 sm:py-11 lg:px-10 xl:px-12">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white bg-sage/75 px-3 py-1.5 text-sm font-medium text-acid sm:mb-6">
              <Camera className="h-4 w-4" aria-hidden /> ฐานข้อมูลโลเคชันถ่ายทำ
            </div>
            <h1 className="display max-w-[12ch] text-[clamp(2.65rem,5.1vw,5.4rem)]">Find your next frame.</h1>
            <p className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-concrete sm:text-base">
              หาโลเคชันสำหรับมิวสิกวิดีโอ หนัง และงานภาพทั่วไทย ค้นจากสถานที่หรือบรรยากาศ พร้อมภาพจริง มุมกล้อง และพิกัด
            </p>
            <div className="mt-5 sm:mt-7">
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={(v) => navigate(v ? "/explore?q=" + encodeURIComponent(v) : "/explore")}
                size="lg"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1 sm:mt-4 sm:gap-2">
              <Link
                to="/explore"
                className="clay-control inline-flex min-h-11 items-center gap-2 border border-white bg-sage px-4 text-sm font-semibold text-acid hover:bg-sage/75"
              >
                ดูทุกโลเคชัน <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/map"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-paper hover:bg-white/75 sm:px-3"
              >
                <MapPin className="h-4 w-4 text-acid" /> เปิดแผนที่
              </Link>
              <Button
                variant="ghost"
                className="gap-1.5 px-2 sm:px-4"
                onClick={() => {
                  const result = randomLocation(hero.slug);
                  if (result) navigate("/locations/" + result.slug);
                }}
              >
                <Dices className="h-4 w-4 text-acid" /> สุ่มให้หน่อย
              </Button>
            </div>
          </div>

          <figure className="relative isolate min-h-[18rem] overflow-hidden rounded-[1.65rem] border border-white/85 shadow-glass sm:min-h-[23rem] lg:min-h-[32rem]">
            {heroPhoto && (
              <img
                src={heroPhoto.image_url}
                srcSet={heroPhoto.thumb_url + " 500w, " + heroPhoto.image_url + " 1920w"}
                sizes="(max-width: 1023px) 94vw, 53vw"
                alt={hero.name_th + " — " + heroPhoto.title}
                className="absolute inset-0 h-full w-full object-cover"
                fetchPriority="high"
              />
            )}
            <figcaption className="home-hero-caption absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:inset-x-5 sm:bottom-5 sm:px-5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-acid">{hero.province_th}</p>
                <Link
                  to={"/locations/" + hero.slug}
                  className="block text-base font-bold leading-snug text-paper hover:text-acid sm:text-lg"
                >
                  {hero.name_th}
                </Link>
                {heroPhoto && (
                  <a
                    href={heroPhoto.source_page_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs text-concrete hover:underline"
                  >
                    {heroPhoto.photographer} · {heroPhoto.license}
                  </a>
                )}
              </div>
              <Link
                to={"/locations/" + hero.slug}
                aria-label={"เปิดหน้า " + hero.name_th}
                className="clay-control grid h-11 w-11 shrink-0 place-items-center bg-white text-acid hover:bg-sage"
              >
                <ArrowUpRight className="h-5 w-5" />
              </Link>
            </figcaption>
          </figure>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
          {[
            { label: "โลเคชันที่ตรวจสอบแล้ว", value: stats.published, icon: Compass, tone: "bg-lilac/85" },
            { label: "ภาพถ่ายจริง", value: stats.verifiedPhotos, icon: Camera, tone: "bg-peach/85" },
            { label: "จังหวัด", value: stats.provincesCovered, icon: MapPin, tone: "bg-sage/85" },
            { label: "ช่างภาพที่ให้เครดิต", value: stats.photographers, icon: ShieldCheck, tone: "bg-lilac/85" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div
              key={label}
              className="clay-panel flex min-w-0 flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4"
            >
              <div
                className={"clay-control grid h-9 w-9 shrink-0 place-items-center text-acid sm:h-11 sm:w-11 " + tone}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <dt className="text-xs font-medium text-concrete sm:text-sm">{label}</dt>
                <dd className="font-display text-2xl font-bold leading-tight">{value.toLocaleString("en")}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {/* ── QUICK CATEGORIES ─────────────────────────────────────────────── */}
      <section className="container-x py-12 md:py-16">
        <SectionHeading
          title="เลือกโลเคชันตามบรรยากาศ"
          description="รวมสถานที่ตามภาพที่คุณอยากได้ ตั้งแต่เมืองยามค่ำไปจนถึงพื้นที่ศิลปะ"
          href="/explore"
        />
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-[#315b50]">
          <Link className="clay-control border border-white bg-white/80 px-3 py-2" to="/collections/cave">สำรวจถ้ำทั้งหมด</Link>
          <Link className="clay-control border border-white bg-white/80 px-3 py-2" to="/collections/art">พื้นที่ศิลปะทั้งหมด</Link>
          <Link className="clay-control border border-white bg-white/80 px-3 py-2" to="/collections/nakhon-pathom">เที่ยวนครปฐม · กำแพงแสน</Link>
          <Link className="clay-control border border-white bg-white/80 px-3 py-2" to="/activities?category=night">พื้นที่ดนตรีกลางคืน</Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
          {QUICK_CATEGORIES.map((cat) => {
            const focusSlug =
              cat.key === "art" ? "bangkok-art-and-culture-centre" : cat.key === "hidden" ? "saphan-han" : cat.key === "temple" ? "doi-suthep" : null;
            const matches = published.filter((location) =>
              cat.slugs.some((slug) => location.categories.includes(slug)),
            );
            const match = matches.find((location) => location.slug === focusSlug) ?? matches[0];
            const collection = cat.key === "cave" || cat.key === "art" || cat.key === "temple" ? cat.key : null;
            return (
              <Link
                key={cat.key}
                to={collection ? `/collections/${collection}` : "/explore?categories=" + cat.slugs.join(",")}
                className="clay-panel group block min-w-0 p-2"
              >
                <div className="relative aspect-[5/3] overflow-hidden rounded-[1rem] bg-ink-2">
                  <PhotoImage
                    photo={pickImage(match)}
                    sizes="(max-width: 768px) 46vw, 23vw"
                    className="h-full w-full object-cover frame-img"
                  />
                  <span className="absolute right-2 top-2 rounded-full bg-ink/95 px-2.5 py-1 text-xs font-semibold text-paper">
                    {collection ? collectionItems(collection, published).count : matches.length}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 px-2 pb-2 pt-3 sm:px-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold group-hover:text-acid sm:text-base">{cat.th}</h3>
                    <p className="mt-0.5 text-xs text-concrete">{cat.label}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-acid" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── FEATURED ─────────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-ink py-16 md:py-24">
        <div className="container-x">
          <SectionHeading
            title={
              <>
                FEATURED <span className="text-outline">LOCATIONS.</span>
              </>
            }
            description="สถานที่ที่ทีมคัดเลือกจากภาพถ่ายที่ตรวจสอบแล้ว — ใช้เป็นจุดเริ่มต้นของทรีตเมนต์ได้ทันที"
            href="/explore"
            hrefLabel="ดูทั้งหมด"
          />
          <div className="mt-10 grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((loc, i) => (
              <LocationCard key={loc.id} location={loc} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── REGIONS ──────────────────────────────────────────────────────── */}
      <section className="border-y border-white/80 bg-lilac/40 py-12 md:py-16">
        <div className="container-x">
          <SectionHeading
            title={<>ค้นหาตามภูมิภาค</>}
            description="จากกรุงเทพฯ สู่ภาคเหนือ ภาคอีสาน ภาคใต้ และชายฝั่งตะวันออก — ค้นตามพื้นที่ถ่ายทำจริง"
            href="/map"
            hrefLabel="เปิดแผนที่"
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(REGION_LABELS).map(([key, label], i) => {
              const count = regionCounts.get(key) ?? 0;
              const sample = published.find((l) => l.region === key);
              const photo = pickImage(sample);
              const isBangkok = key === "Bangkok";
              return (
                <Link
                  key={key}
                  to={isBangkok ? "/explore?region=Bangkok" : `/explore?region=${key}`}
                  className={`media-inverse group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-2xl border border-white/75 p-5 shadow-clay ${i === 0 ? "sm:col-span-2 sm:min-h-56 lg:col-span-2" : ""}`}
                >
                  {photo && (
                    <>
                      <PhotoImage
                        photo={photo}
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="absolute inset-0 h-full w-full object-cover frame-img"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/30" />
                    </>
                  )}
                  <div className="relative flex items-start justify-between">
                    <span className="font-mono text-xs tracking-normal text-concrete">{count} LOCATIONS</span>
                  </div>
                  <div className="relative">
                    <h3 className="font-display text-2xl font-extrabold tracking-tight text-paper md:text-3xl">
                      {label.en.replace(" Thailand", "")}
                    </h3>
                    <p className="mt-0.5 font-sans text-xs text-concrete">{label.th}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FIND BY MOOD ─────────────────────────────────────────────────── */}
      <section className="border-t border-line py-16 md:py-24">
        <div className="container-x">
          <SectionHeading
            title={
              <>
                FIND BY <span className="text-outline">MOOD.</span>
              </>
            }
            description="เลือกบรรยากาศของเพลง แล้วให้ระบบจัดอันดับโลเคชันจาก Mood Tags, สภาพแวดล้อม และข้อมูลที่ตรวจสอบแล้ว"
            href="/find-my-vibe"
            hrefLabel="Find My Vibe"
          />

          <div className="mt-8 flex flex-wrap gap-2">
            {moods.map((m) => {
              const on = vibeMoods.includes(m.slug);
              return (
                <button
                  key={m.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setVibeMoods((prev) =>
                      prev.includes(m.slug) ? prev.filter((s) => s !== m.slug) : [...prev, m.slug],
                    )
                  }
                  className={`border px-3 py-2 font-mono text-xs tracking-normal transition-colors ${
                    on
                      ? "border-acid bg-acid text-ink"
                      : "border-paper/20 text-concrete hover:border-paper/60 hover:text-paper"
                  }`}
                >
                  {m.name_en}
                </button>
              );
            })}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {vibeMatches.map((match, i) => (
              <Link
                key={match.location.id}
                to={`/locations/${match.location.slug}`}
                className="media-inverse group relative flex min-h-72 flex-col justify-end overflow-hidden rounded-2xl border border-white/80 p-5 shadow-clay"
              >
                <PhotoImage
                  photo={pickImage(match.location)}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="absolute inset-0 h-full w-full object-cover opacity-65 transition-all duration-700 group-hover:scale-105 group-hover:opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/10" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs tracking-normal text-acid">
                      MATCH {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-xs text-concrete">{Math.round(match.score * 100)} PTS</span>
                  </div>
                  <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight">{match.location.name_th}</h3>
                  <p className="mt-1 font-sans text-xs text-concrete">{match.reasons[0]}</p>
                  <p className="mt-1 font-mono text-xs tracking-normal text-concrete">
                    {match.location.province_th} · {match.location.photo_count} PHOTOS
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAP PREVIEW ──────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-ink py-16 md:py-24">
        <div className="container-x">
          <SectionHeading
            title={
              <>
                MAP <span className="text-outline">EXPLORER.</span>
              </>
            }
            description="เปิดแผนที่จริง คลัสเตอร์หมุดตามพื้นที่ กรองตามหมวดและจังหวัด แล้วเปิดเส้นทางไปยังสถานที่ได้ทันที"
            href="/map"
            hrefLabel="เปิดแผนที่เต็ม"
          />
          <div className="relative mt-10">
            <MapCanvas locations={published} height="clamp(360px, 52vh, 560px)" interactive={false} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-ink to-transparent p-5">
              <div>
                <p className="label-mono text-acid">THAILAND · {stats.published} PUBLISHED</p>
                <p className="mt-1 font-sans text-xs text-concrete">
                  หมุดสี: อุตสาหกรรม/เมือง = ส้ม · ศิลปะ = ม่วง · ธรรมชาติ = เขียว · โบราณสถาน = ทอง
                </p>
              </div>
              <Link to="/map" className="pointer-events-auto hidden sm:block">
                <Button variant="paper" size="sm">
                  เปิดแผนที่ <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── RECENT + MANIFESTO ───────────────────────────────────────────── */}
      <section className="border-t border-line py-16 md:py-24">
        <div className="container-x grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="min-w-0 lg:col-span-7">
            <SectionHeading title="RECENTLY VERIFIED" href="/explore?sort=recent" />
            <div className="mt-6">
              {recent.map((loc) => (
                <LocationCard key={loc.id} location={loc} variant="compact" />
              ))}
            </div>
          </div>

          <div className="min-w-0 lg:col-span-5">
            <div className="glass-panel p-6 md:p-8">
              <p className="label-mono text-burnt">OUR RULE</p>
              <h3 className="mt-4 font-display text-3xl font-extrabold leading-[0.95] tracking-tight md:text-4xl">
                REAL PLACES.
                <br />
                REAL PHOTOS.
                <br />
                <span className="text-outline">NO FILLER.</span>
              </h3>
              <ul className="mt-7 space-y-4 font-sans text-sm leading-relaxed text-concrete">
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-acid" />
                  ภาพสถานที่มีเครดิตและข้อมูลใบอนุญาตประกอบ
                </li>
                <li className="flex gap-3">
                  <Camera className="mt-0.5 h-4 w-4 shrink-0 text-acid" />
                  ทุกภาพมีเครดิต ผู้ถ่าย ใบอนุญาต และลิงก์ต้นทาง — ไม่ใช้ภาพ AI แทนสถานที่จริง
                </li>
                <li className="flex gap-3">
                  <Compass className="mt-0.5 h-4 w-4 shrink-0 text-acid" />
                  เราไม่สรุปว่าถ่ายเชิงพาณิชย์ได้ เพราะสถานที่เปิดให้ท่องเที่ยว — ต้องตรวจสอบกับหน่วยงานทุกครั้ง
                </li>
              </ul>
              <div className="mt-7 flex flex-wrap gap-2 border-t border-line pt-5">
                <Link to="/about">
                  <Button variant="outline" size="sm">
                    นโยบายข้อมูล
                  </Button>
                </Link>
                <Link to="/submit">
                  <Button variant="ghost" size="sm">
                    เสนอสถานที่ →
                  </Button>
                </Link>
              </div>
            </div>

            <div className="clay-panel mt-4 p-6">
              <p className="label-mono text-concrete">BUILD A BOARD</p>
              <p className="mt-2 font-sans text-sm text-concrete">
                รวมโลเคชันที่ชอบไว้ในโปรเจกต์ MV เดียวกัน จัดลำดับ เพิ่มโน้ต แล้วส่งลิงก์ให้ทีมได้ทันที
              </p>
              <Link to="/boards" className="mt-4 inline-block">
                <Button variant="primary" size="sm">
                  สร้างบอร์ดแรก <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-line bg-acid py-16 text-ink md:py-20">
        <div className="container-x relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="max-w-2xl text-3xl font-bold md:text-5xl">เริ่มโปรเจกต์จากโลเคชันที่ใช่</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/find-my-vibe">
              <Button variant="ink" size="lg">
                FIND MY VIBE <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/explore">
              <Button variant="outlineInk" size="lg">
                BROWSE ALL
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="border-t border-line py-4">
        <div className="container-x flex flex-wrap items-center justify-between gap-3">
          <p className="label-mono text-concrete">
            {stats.published} PLACES · {stats.verifiedPhotos} PHOTOS · {categories.length} CATEGORIES · {moods.length}{" "}
            MOODS
          </p>
        </div>
      </div>
    </div>
  );
}
