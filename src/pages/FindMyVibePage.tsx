import { Localized, useLanguage } from "@/i18n/Language";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Copy, Crosshair, Music2, Sparkles, X } from "lucide-react";
import { moods } from "@/data/taxonomy";
import { useLocationCatalog } from "@/services/catalogContext";
import { PhotoImage } from "@/components/location/LocationCard";
import { Button, Badge } from "@/components/ui";
import { useSeo } from "@/lib/useSeo";
import { cn, formatLocalizedKm, haversineKm } from "@/lib/utils";
import type { LocationRecord } from "@/data/types";
import { localizeVibeReason } from "@/i18n/locationText";

const PRESETS: { key: string; label: string; th: string; moods: string[] }[] = [
  { key: "dark-cinema", label: "DARK CINEMA", th: "ดาร์ก · ภาพยนตร์", moods: ["dark", "cinematic", "melancholic"] },
  { key: "ethereal", label: "ETHEREAL NATURE", th: "เหนือจริง · ธรรมชาติ", moods: ["ethereal", "dreamcore", "ambient"] },
  { key: "rage", label: "RAGE / INDUSTRIAL", th: "ดุดัน · อุตสาหกรรม", moods: ["aggressive", "rage", "dystopian"] },
  { key: "nostalgia", label: "NOSTALGIC BANGKOK", th: "คิดถึง · กรุงเทพฯ", moods: ["nostalgic", "romantic", "cinematic"] },
  { key: "surreal", label: "SURREAL POP", th: "เซอร์เรียล · ป็อป", moods: ["surreal", "experimental", "futuristic"] },
  { key: "lonely", label: "LONELY HORROR", th: "เหงา · สยอง", moods: ["lonely", "horror", "gothic"] },
];

function pickCover(loc: LocationRecord) {
  return loc.photos.find((p) => p.is_cover) ?? loc.photos[0];
}

export default function FindMyVibePage() {
  const { language, t } = useLanguage();
  const reduceMotion = useReducedMotion() ?? false;
  const { findMyVibe } = useLocationCatalog();
  const [sp, setSp] = useSearchParams();
  const initial = (sp.get("moods") ?? "dark,cinematic").split(",").filter(Boolean);
  const [selected, setSelected] = useState<string[]>(initial.slice(0, 6));
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [copied, setCopied] = useState(false);

  const matches = useMemo(() => findMyVibe(selected, origin, 12), [findMyVibe, selected, origin]);
  const maxScore = matches[0]?.score ?? 1;

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= 6 ? prev : [...prev, slug];
      const params = new URLSearchParams(sp);
      if (next.length) params.set("moods", next.join(","));
      else params.delete("moods");
      setSp(params, { replace: true });
      return next;
    });
  }

  function applyPreset(list: string[]) {
    setSelected(list);
    const params = new URLSearchParams(sp);
    params.set("moods", list.join(","));
    setSp(params, { replace: true });
  }

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  useSeo({
    title: "Find My Vibe — จับคู่บรรยากาศเพลงกับโลเคชัน",
    description: "เลือกอารมณ์ของเพลง แล้วให้ระบบจัดอันดับโลเคชันถ่าย MV ที่ตรงกับ mood, สภาพแวดล้อม และข้อมูลที่ตรวจสอบแล้วทั่วประเทศไทย",
  });

  return (
    <div>
      <section className="glass-panel relative mx-4 mt-5 overflow-hidden sm:mx-8 lg:mx-12">
        <div className="absolute inset-y-0 right-0 w-3/4 opacity-35 lg:w-3/5">
          {matches[0] && (
            <PhotoImage photo={pickCover(matches[0].location)} location={matches[0].location} fallbackPhotos={matches[0].location.photos} galleryAssetUrl={matches[0].location.gallery_asset_url} expectedPhotoCount={matches[0].location.photo_count} sizes="100vw" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-ink/20" />
        </div>
        <div className="container-x relative z-10 py-14 md:py-20">
          <p className="label-mono text-acid">SOUND → IMAGE · MOOD MATCHING</p>
          <h1 className="mt-3 display text-[clamp(2.6rem,6.5vw,5.7rem)]">
            FIND MY
            <br />
            <span className="text-outline">VIBE.</span>
          </h1>
          <p className="mt-5 max-w-xl font-sans text-sm leading-relaxed text-concrete">
            <Localized text={"บอกบรรยากาศของเพลงที่กำลังทำ — ระบบจะจัดอันดับสถานที่จาก Mood Tags, หมวดหมู่สภาพแวดล้อม, จำนวนภาพที่ตรวจสอบแล้ว และระยะทาง (ถ้าเปิดตำแหน่ง) โดยไม่แต่งเรื่องว่าสถานที่ไหนอนุญาตถ่ายทำ"} /></p>
        </div>
      </section>

      <div className="container-x grid gap-10 py-10 lg:grid-cols-12 lg:py-14">
        <aside className="lg:col-span-4">
          <div className="space-y-6 lg:sticky lg:top-24">
            <div className="glass-panel p-5">
              <div className="flex items-center justify-between">
                <p className="label-mono text-concrete">MOOD PROFILE</p>
                <span className="font-mono text-xs text-acid">{selected.length}/6</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {moods.map((m) => {
                  const on = selected.includes(m.slug);
                  const disabled = !on && selected.length >= 6;
                  return (
                    <button
                      key={m.slug}
                      type="button"
                      onClick={() => toggle(m.slug)}
                      aria-pressed={on}
                      disabled={disabled}
                      className={cn(
                        "border px-2 py-1.5 font-mono text-xs tracking-normal transition-colors",
                        on
                          ? "border-acid bg-acid text-ink"
                          : disabled
                            ? "border-paper/10 text-paper/20"
                            : "border-paper/20 text-concrete hover:border-paper/50 hover:text-paper",
                      )}
                    >
                      {m.name_en}
                    </button>
                  );
                })}
              </div>

              {selected.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="label-mono mb-2 text-concrete">SELECTED</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.map((s) => {
                      const m = moods.find((x) => x.slug === s);
                      return (
                        <span
                          key={s}
                          className="flex items-center gap-1 border border-acid/30 bg-acid/5 px-2 py-1 font-sans text-xs text-acid"
                        >
                          {language === "en" ? m?.name_en ?? s : m?.name_th ?? s}
                          <button type="button" onClick={() => toggle(s)} aria-label={language === "en" ? `Remove ${m?.name_en ?? s}` : `ลบ ${m?.name_th ?? s}`}>
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
                <Button size="sm" variant="outline" onClick={locate}>
                  <Crosshair className="h-3.5 w-3.5" />
                  {locating ? "กำลังหา…" : origin ? "ใช้ตำแหน่งแล้ว" : "ใกล้ฉัน"}
                </Button>
                <Button size="sm" variant="outline" onClick={copyShare}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "คัดลอกแล้ว" : "แชร์ผลลัพธ์"}
                </Button>
              </div>
              {origin && (
                <p className="mt-2 font-mono text-xs tracking-normal text-concrete">
                  GPS {origin.lat.toFixed(3)}, {origin.lng.toFixed(3)} · DISTANCE WEIGHTED
                </p>
              )}
            </div>

            <div className="glass-panel p-5">
              <p className="label-mono text-concrete">STARTING POINTS</p>
              <div className="mt-3 space-y-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.moods)}
                    className="group flex w-full items-center justify-between border border-line px-3 py-2.5 text-left hover:border-acid"
                  >
                    <span>
                      <span className="block font-mono text-xs tracking-normal text-concrete group-hover:text-acid">
                        {p.label}
                      </span>
                      <span className="block font-sans text-xs text-concrete">{p.th}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-concrete group-hover:text-acid" />
                  </button>
                ))}
              </div>
            </div>

            <div className="clay-panel p-4">
              <div className="flex items-center gap-2">
                <Music2 className="h-3.5 w-3.5 text-acid" />
                <p className="label-mono text-concrete">HOW IT WORKS</p>
              </div>
              <p className="mt-2 font-sans text-xs leading-relaxed text-concrete">
                <Localized text={"คะแนนมาจาก mood relevance ที่แก้ไขโดยมนุษย์, ความสอดคล้องของกลุ่มสภาพแวดล้อม, ความสมบูรณ์ของภาพ และระยะทาง — ไม่ใช่การวิเคราะห์เนื้อเพลงอัตโนมัติ"} /></p>
            </div>
          </div>
        </aside>

        <main className="lg:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="label-mono text-acid">MATCHED FRAMES</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold md:text-4xl">
                {matches.length} PLACES FOR THIS SOUND
              </h2>
            </div>
            <p className="font-mono text-xs tracking-normal text-concrete">
              RANKED BY MOOD FIT · NOT A GUARANTEE OF ACCESS
            </p>
          </div>

          {selected.length === 0 ? (
            <div className="mt-10 border border-dashed border-paper/15 p-10 text-center">
              <Sparkles className="mx-auto h-7 w-7 text-concrete" />
              <p className="mt-4 font-display text-2xl font-extrabold"><Localized text={"เลือกอารมณ์ก่อน"} /></p>
              <p className="mt-2 font-sans text-sm text-concrete"><Localized text={"เลือกได้สูงสุด 6 mood — หรือเริ่มจาก preset ด้านซ้าย"} /></p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {matches.map((match, i) => {
                const relative = maxScore > 0 ? match.score / maxScore : 0;
                const cover = pickCover(match.location);
                return (
                  <motion.article
                    key={match.location.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : Math.min(i * 0.04, 0.3) }}
                    className="group grid gap-0 border border-line sm:grid-cols-[220px_1fr]"
                  >
                    <Link
                      to={`/locations/${match.location.slug}`}
                      className="relative block aspect-[4/3] overflow-hidden bg-ink-2 sm:aspect-auto"
                    >
                      <PhotoImage
                        photo={cover}
                        location={match.location}
                        fallbackPhotos={match.location.photos}
                        galleryAssetUrl={match.location.gallery_asset_url}
                        expectedPhotoCount={match.location.photo_count}
                        sizes="(max-width: 640px) 100vw, 220px"
                        className="h-full w-full object-cover frame-img"
                      />
                      <span className="absolute left-2 top-2 bg-ink/85 px-2 py-1 font-mono text-xs tracking-normal text-acid">
                        MATCH {String(i + 1).padStart(2, "0")}
                      </span>
                    </Link>

                    <div className="flex flex-col justify-between gap-3 p-4">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="label-mono text-concrete">{language === "en" ? match.location.province : match.location.province_th}</p>
                            <Link to={`/locations/${match.location.slug}`}>
                              <h3 className="mt-1 font-display text-2xl font-extrabold leading-none tracking-tight group-hover:text-acid">
                                {language === "en" ? match.location.name_en || match.location.name_th : match.location.name_th}
                              </h3>
                            </Link>
                            <p className="mt-1 font-sans text-xs text-concrete">{match.location.name_en}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-display text-2xl font-extrabold text-acid">
                              {Math.round(relative * 100)}
                            </p>
                            <p className="font-mono text-xs tracking-normal text-concrete">FIT SCORE</p>
                          </div>
                        </div>

                        <div className="mt-3 h-1 w-full bg-paper/10">
                          <div
                            className="h-full bg-acid transition-all"
                            style={{ width: `${Math.max(6, relative * 100)}%` }}
                          />
                        </div>

                        <ul className="mt-3 space-y-1">
                          {match.reasons.map((r) => (
                            <li key={r} className="flex gap-2 font-sans text-xs text-concrete">
                              <span className="mt-1.5 h-1 w-1 shrink-0 bg-burnt" />
                              {localizeVibeReason(r, language)}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="acid">{match.location.photo_count} {t("PHOTOS")}</Badge>
                        {origin && (
                          <Badge>
                            {formatLocalizedKm(
                              haversineKm(origin, { lat: match.location.latitude, lng: match.location.longitude }),
                              language,
                            )}
                          </Badge>
                        )}
                        <Link
                          to={`/locations/${match.location.slug}`}
                          className="ml-auto flex items-center gap-1 font-mono text-xs tracking-normal text-concrete hover:text-acid"
                        >
                          OPEN FRAME <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}

          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
            <p className="max-w-lg font-sans text-xs leading-relaxed text-concrete">
              <Localized text={"การจัดอันดับเป็นเครื่องมือเริ่มต้น ไม่ใช่การตัดสินใจแทนทีมครีเอทีฟ — ตรวจสอบภาพ แสง และการอนุญาตหน้างานก่อนทุกครั้ง"} /></p>
            <Link to="/explore">
              <Button variant="outline" size="sm">
                <Localized text={"เปิดตัวกรองละเอียด"} /> <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
