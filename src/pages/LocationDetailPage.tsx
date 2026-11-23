import { Localized, useLanguage } from "@/i18n/Language";
import { frameNotes } from "@/data/frame-notes";
import frameNotesEnglish from "@/i18n/frame-notes.en.json";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Check,
  CloudSun,
  Copy,
  ExternalLink,
  Flag,
  Heart,
  Info,
  MapPin,
  Navigation,
  Plus,
  Share2,
  ShieldAlert,
  Sparkles,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { useLocationCatalog } from "@/services/catalogContext";
import { useFavorites, boards as boardStore, useBoards } from "@/services/localStore";
import { PhotoGallery } from "@/components/location/PhotoGallery";
import { PhotoImage } from "@/components/location/LocationCard";
import type { LocationPhoto } from "@/data/types";
import { loadPhotoGallery } from "@/services/photoGalleries";
import { LocationCard } from "@/components/location/LocationCard";
import { MapCanvas } from "@/components/map/MapCanvas";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Label,
  PermissionPill,
  Textarea,
} from "@/components/ui";
import { categoryBySlug, moodBySlug } from "@/data/taxonomy";
import { formatCoords, formatLocalizedDate, formatLocalizedKm, haversineKm, uid } from "@/lib/utils";
import { useSeo } from "@/lib/useSeo";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import { provinceLabel } from "@/lib/provinceLabel";

const UNKNOWN = "ยังไม่มีข้อมูลยืนยัน";

function TriRow({ label, value, note }: { label: string; value: string; note?: string }) {
  const { t } = useLanguage();
  const known = value !== "unknown";
  const th = value === "yes" ? "ได้" : value === "no" ? "ไม่ได้" : UNKNOWN;
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-line py-3">
      <div>
        <p className="font-sans text-sm text-concrete">{t(label)}</p>
        {note && <p className="mt-0.5 font-sans text-xs leading-relaxed text-concrete">{t(note)}</p>}
      </div>
      <span className={cn("font-mono text-xs tracking-normal", known ? "text-acid" : "text-concrete")}>{t(th)}</span>
    </div>
  );
}

export default function LocationDetailPage() {
  const { t, language } = useLanguage();
  const { getLocation, nearbyLocations } = useLocationCatalog();
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const location = getLocation(slug);
  const { isFavorite, toggle } = useFavorites();
  const allBoards = useBoards();

  const [boardOpen, setBoardOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [newBoard, setNewBoard] = useState("");
  const [reportText, setReportText] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportError, setReportError] = useState(false);
  const [reportReason, setReportReason] = useState("ข้อมูลไม่ถูกต้อง");
  const [toast, setToast] = useState<string | null>(null);
  const [myDistance, setMyDistance] = useState<number | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<LocationPhoto[]>(location?.photos ?? []);

  useEffect(() => {
    if (!location) {
      setGalleryPhotos([]);
      return;
    }
    let active = true;
    setGalleryPhotos(location.photos);
    if (location.gallery_asset_url) {
      void loadPhotoGallery(location.gallery_asset_url, location.photo_count)
        .then((photos) => { if (active) setGalleryPhotos(photos); })
        .catch(() => undefined);
    }
    return () => { active = false; };
  }, [location?.id, location?.photos, location?.gallery_asset_url, location?.photo_count]);

  const nearby = useMemo(() => (location ? nearbyLocations(location, 4) : []), [location, nearbyLocations]);

  useSeo({
    title: location ? `${language === "en" ? location.name_en || location.name_th : location.name_th} — ${language === "en" ? location.province : location.province_th}` : language === "en" ? "Place not found" : "ไม่พบสถานที่",
    description: language === "en" ? location?.description_en || location?.description_th : location?.description_th,
    image: galleryPhotos[0]?.image_url ?? location?.photos[0]?.image_url,
    canonical: location ? `${window.location.origin}/locations/${location.slug}` : undefined,
    noindex: !location,
    jsonLd: location
      ? {
          "@context": "https://schema.org",
          "@type": "TouristAttraction",
          name: location.name_th,
          alternateName: location.name_en,
          description: location.description_th,
          image: galleryPhotos.map((p) => p.image_url),
          geo: { "@type": "GeoCoordinates", latitude: location.latitude, longitude: location.longitude },
          address: {
            "@type": "PostalAddress",
            addressLocality: location.district ?? undefined,
            addressRegion: location.province_th,
            addressCountry: "TH",
          },
          isAccessibleForFree: location.estimated_cost === "free" ? true : undefined,
        }
      : null,
  });

  if (!location) {
    return (
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="label-mono text-burnt">404 / NOT PUBLISHED</p>
        <h1 className="mt-4 display text-5xl md:text-7xl">FRAME NOT FOUND.</h1>
        <p className="mt-4 max-w-md font-sans text-sm leading-relaxed text-concrete">
          <Localized text={"สถานที่นี้ไม่มีอยู่ในฐานข้อมูลที่เผยแพร่ หรือยังอยู่ระหว่างตรวจสอบข้อมูล"} /></p>
        <div className="mt-7 flex gap-2">
          <Button onClick={() => navigate("/explore")}><Localized text={"กลับไปค้นหา"} /></Button>
          <Button variant="outline" onClick={() => navigate("/map")}> <Localized text="เปิดแผนที่" /> </Button>
        </div>
      </div>
    );
  }

  const cover = location.photos.find((p) => p.is_cover) ?? location.photos[0];
  const frame = frameNotes[location.slug];
  const localizedFrame = language === "en"
    ? (frameNotesEnglish as Record<string, { title: string; direction: string }>)[location.slug] ?? frame
    : frame;
  const framePhoto = frame && galleryPhotos.find((photo) => photo.id === frame.photoId && photo.is_verified);
  const saved = isFavorite(location.id);
  const shareUrl = `${window.location.origin}/locations/${location.slug}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(message);
    } catch {
      flash("คัดลอกไม่สำเร็จ — กรุณาคัดลอกด้วยตนเอง");
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: location!.name_th, url: shareUrl });
        return;
      } catch {
        /* cancelled */
      }
    }
    copy(shareUrl, "คัดลอกลิงก์แล้ว");
  }

  function addToBoard(boardId: string) {
    const ok = boardStore.addItem(boardId, location!.id);
    flash(ok ? "เพิ่มเข้าบอร์ดแล้ว" : "สถานที่นี้อยู่ในบอร์ดแล้ว");
    setBoardOpen(false);
  }

  function createAndAdd() {
    if (!newBoard.trim()) return;
    const board = boardStore.create(newBoard.trim());
    boardStore.addItem(board.id, location!.id);
    setNewBoard("");
    setBoardOpen(false);
    flash("สร้างบอร์ดและเพิ่มสถานที่แล้ว");
  }

  async function submitReport() {
    if (reportSending) return;
    setReportSending(true);
    setReportError(false);
    const payload = {
      locationSlug: location!.slug,
      reason: reportReason,
      detail: reportText,
    };

    try {
      if (isSupabaseConfigured) {
        const response = await fetch("/api/reports", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.status !== 202) {
          setReportError(true);
          return;
        }
      } else {
        const reports = JSON.parse(localStorage.getItem("framehunt:reports") ?? "[]");
        reports.unshift({
          id: uid("report"),
          ...payload,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem("framehunt:reports", JSON.stringify(reports.slice(0, 100)));
      }
    } catch {
      setReportError(true);
      return;
    } finally {
      setReportSending(false);
    }

    setReportOpen(false);
    setReportText("");
    flash(isSupabaseConfigured ? "ส่งรายงานแล้ว ทีมงานจะตรวจสอบ" : "บันทึกรายงานในเครื่องนี้แล้ว");
  }

  const permission = location.permission;

  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="container-x pt-5 sm:pt-8">
        <div className="relative h-[min(60vw,25rem)] min-h-[15rem] overflow-hidden rounded-[1.6rem] border border-white bg-ink-2 shadow-glass">
          {cover && (
            <PhotoImage
              photo={cover}
              location={location}
              fallbackPhotos={galleryPhotos}
              galleryAssetUrl={location.gallery_asset_url}
              expectedPhotoCount={location.photo_count}
              sizes="(max-width: 767px) 90vw, 92vw"
              className="h-full w-full object-cover"
              fetchPriority="high"
              priority
            />
          )}
        </div>

        <div className="glass-panel relative -mt-5 mx-2 px-4 py-5 sm:mx-5 sm:px-6 md:px-8 md:py-7">
          <div className="mb-4 flex flex-wrap items-center gap-2 font-mono text-xs tracking-normal text-concrete">
            <Link to="/explore" className="hover:text-acid">
              EXPLORE
            </Link>
            <span>/</span>
            <Link to={`/explore?province=${location.province_id}`} className="hover:text-acid">
              {location.province.toUpperCase()}
            </Link>
            <span>/</span>
            <span className="text-paper">{language === "en" ? location.name_en || location.name_th : location.name_th}</span>
          </div>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <PermissionPill status={permission.permission_status} />
                <Badge variant="acid">{location.photo_count} VERIFIED PHOTOS</Badge>
                <Badge>{location.zone === "A" ? "BANGKOK" : location.zone === "B" ? "METRO REGION" : "THAILAND"}</Badge>
              </div>
              <h1 className="mt-4 display text-[clamp(1.9rem,4.5vw,4.2rem)]">{language === "en" ? location.name_en || location.name_th : location.name_th}</h1>
              <p className="mt-2 font-sans text-sm text-concrete md:text-base">{location.name_en}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tracking-normal text-concrete">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {location.district ? `${language === "en" ? t(location.district) : location.district}, ` : ""}
                  {language === "en" ? location.province : location.province_th}
                </span>
                <span className="flex items-center gap-1">
                  <Camera className="h-3 w-3" /> {location.photo_count} PHOTOS
                </span>
                <span>{formatCoords(location.latitude, location.longitude)}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={saved ? "primary" : "outline"}
                onClick={() => {
                  const next = toggle(location.id);
                  flash(next ? "บันทึกเป็นรายการโปรดแล้ว" : "นำออกจากรายการโปรดแล้ว");
                }}
              >
                <Heart className={cn("h-4 w-4", saved && "fill-current")} />
                {saved ? "SAVED" : "SAVE"}
              </Button>
              <Button variant="outline" onClick={() => setBoardOpen(true)}>
                <Plus className="h-4 w-4" /> ADD TO BOARD
              </Button>
              <Button variant="outline" onClick={share} aria-label={t("แชร์สถานที่")}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container-x grid grid-cols-1 gap-9 py-8 lg:grid-cols-12 lg:gap-12 lg:py-12">
        {/* ── MAIN ───────────────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-10 lg:col-span-8">
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-3">
              <div>
                <p className="label-mono text-acid">FRAME ARCHIVE</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold"><Localized text={"ภาพถ่ายสถานที่จริง"} /></h2>
              </div>
              <p className="font-mono text-xs tracking-normal text-concrete">
                {location.photo_count} <Localized text={"ภาพ · ตรวจสอบเครดิตแล้ว"} /></p>
            </div>
            <PhotoGallery photos={galleryPhotos.length ? galleryPhotos : location.photos} galleryAssetUrl={location.gallery_asset_url} expectedPhotoCount={location.photo_count} locationName={language === "en" ? location.name_en || location.name_th : location.name_th} />
            {frame && framePhoto && (
              <div className="clay-panel mt-5 p-5">
                <h3 className="text-sm font-bold text-acid"><Localized text={"มุมกล้องที่คัดไว้"} /></h3>
                <p className="mt-2 font-semibold">{localizedFrame?.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-concrete">{localizedFrame?.direction}</p>
                <a
                  className="mt-3 inline-block text-xs text-concrete underline hover:text-acid"
                  href={framePhoto.source_page_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Localized text={"ดูภาพอ้างอิงและเครดิต"} /></a>
              </div>
            )}
          </section>

          <section>
            <div className="border-b border-line pb-3">
              <p className="label-mono text-acid">ABOUT THE PLACE</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold"><Localized text={"เกี่ยวกับสถานที่"} /></h2>
            </div>
            <p className="mt-5 max-w-3xl whitespace-pre-line font-sans text-[15px] leading-[1.9] text-concrete">
              {language === "en" ? location.description_en || location.description_th : location.description_th}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {location.categories.map((c) => (
                <Link
                  key={c}
                  to={`/explore?categories=${c}`}
                  className="border border-paper/20 px-2 py-1 font-mono text-xs tracking-normal text-concrete hover:border-acid hover:text-acid"
                >
                  {categoryBySlug.get(c)?.name_en ?? c}
                </Link>
              ))}
            </div>
            <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <div>
                <p className="label-mono text-concrete">ARCHITECTURE</p>
                <p className="mt-1 font-sans text-sm text-concrete">{location.architectural_style}</p>
              </div>
              <div>
                <p className="label-mono text-concrete">TYPE</p>
                <p className="mt-1 font-sans text-sm capitalize text-concrete">{location.location_type}</p>
              </div>
            </div>
            {location.description_source.type === "wikipedia" && (
              <p className="mt-4 font-mono text-xs tracking-normal text-concrete">
                DESCRIPTION SOURCE ·{" "}
                <a
                  href={location.description_source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-acid"
                >
                  WIKIPEDIA ({location.description_source.lang.toUpperCase()}) · {location.description_source.license}
                </a>
              </p>
            )}
          </section>

          {/* Filming info */}
          <section>
            <div className="border-b border-line pb-3">
              <p className="label-mono text-acid">PRODUCTION NOTES</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold"><Localized text={"ข้อมูลสำหรับกองถ่าย"} /></h2>
            </div>
            <p className="mt-3 max-w-2xl font-sans text-xs leading-relaxed text-concrete">
              <Localized text={"ข้อมูลต่อไปนี้แยกจาก “สถานที่เปิดให้ท่องเที่ยว” อย่างชัดเจน — ช่องที่ยังไม่มีหลักฐานจะแสดงว่า"} />{" "}
              <span className="text-concrete">{t(UNKNOWN)}</span> <Localized text={"และไม่ถูกใช้เป็นข้อสรุปว่าถ่ายเชิงพาณิชย์ได้"} /></p>

            <div className="mt-5 grid gap-x-8 md:grid-cols-2">
              <div>
                <TriRow label={t("ใช้ไฟเสริมได้")} value={location.filming.artificial_light_allowed} />
                <TriRow label={t("อุปกรณ์ขนาดใหญ่")} value={location.filming.large_equipment_allowed} />
                <TriRow label={t("ใช้โดรน")} value={location.filming.drone_allowed} note={location.filming.drone_note} />
                <TriRow label={t("ข้อจำกัดด้านเสียง")} value={location.filming.sound_restrictions} />
              </div>
              <div>
                <TriRow label={t("ห้องแต่งตัว")} value={location.filming.dressing_room} />
                <TriRow label={t("ที่จอดรถ")} value={location.filming.parking} />
                <TriRow label={t("ขนาดทีมที่เหมาะสม")} value={location.filming.crew_size} />
                <TriRow label={t("ช่วงแสงที่แนะนำ")} value={location.filming.best_light_window ? "yes" : "unknown"} />
              </div>
            </div>

            <div className="mt-6 border border-line p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-acid" />
                <p className="label-mono text-concrete">SUGGESTED SHOTS (RULE-BASED)</p>
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {location.creative.shot_types.map((s) => (
                  <li key={s} className="flex gap-2 font-sans text-[13px] text-concrete">
                    <span className="mt-2 h-1 w-1 shrink-0 bg-acid" />
                    {s}
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-mono text-xs tracking-normal text-concrete">
                <Localized text={"คำแนะนำจากหมวดหมู่สถานที่ ไม่ใช่การรับประกันสภาพแสงหน้างาน"} /></p>
            </div>
          </section>

          {/* Permission */}
          <section>
            <div className="border-b border-line pb-3">
              <p className="label-mono text-burnt">ACCESS & PERMISSION</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold"><Localized text={"การเข้าถึงและการขออนุญาต"} /></h2>
            </div>

            <div className="mt-5 border border-burnt/30 bg-burnt/[0.04] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-burnt" />
                <PermissionPill status={permission.permission_status} />
                <span className="font-mono text-xs tracking-normal text-concrete">
                  CHECKED {formatLocalizedDate(permission.verified_at, language)}
                </span>
              </div>
              <p className="mt-3 font-sans text-sm leading-relaxed text-concrete">{t(permission.note)}</p>
              <div className="mt-4 grid gap-4 border-t border-burnt/20 pt-4 sm:grid-cols-2">
                <div>
                  <p className="label-mono text-concrete"><Localized text={"หน่วยงานที่ควรติดต่อ"} /></p>
                  <p className="mt-1 font-sans text-sm text-concrete">{t(permission.contact_details ?? UNKNOWN)}</p>
                </div>
                <div>
                  <p className="label-mono text-concrete"><Localized text={"ค่าธรรมเนียม"} /></p>
                  <p className="mt-1 font-sans text-sm text-concrete">{t(location.estimated_cost ?? UNKNOWN)}</p>
                </div>
              </div>
              <p className="mt-4 font-sans text-xs leading-relaxed text-concrete">
                <Localized text={"การเปิดให้ประชาชนเข้าชมไม่ได้หมายความว่าอนุญาตให้ถ่ายทำเชิงพาณิชย์ โปรดติดต่อเจ้าของพื้นที่หรือหน่วยงานรัฐที่ดูแล และขอหนังสืออนุญาตเป็นลายลักษณ์อักษรก่อนวันถ่าย"} /></p>
            </div>
          </section>

          {/* Map */}
          <section>
            <div className="border-b border-line pb-3">
              <p className="label-mono text-acid">COORDINATES</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold"><Localized text={"แผนที่และเส้นทาง"} /></h2>
            </div>
            <div className="mt-5">
              <MapCanvas
                locations={[location]}
                height="380px"
                focus={{ lat: location.latitude, lng: location.longitude, zoom: 14 }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={directions} target="_blank" rel="noreferrer">
                <Button variant="primary" size="sm">
                  <Navigation className="h-3.5 w-3.5" /> GOOGLE MAPS
                </Button>
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copy(formatCoords(location.latitude, location.longitude), "คัดลอกพิกัดแล้ว")}
              >
                <Copy className="h-3.5 w-3.5" /> COPY COORDINATES
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition((pos) => {
                    setMyDistance(
                      haversineKm(
                        { lat: pos.coords.latitude, lng: pos.coords.longitude },
                        { lat: location.latitude, lng: location.longitude },
                      ),
                    );
                  });
                }}
              >
                <MapPin className="h-3.5 w-3.5" />
                {myDistance != null ? `${t("ห่างจากคุณ")} ${formatLocalizedKm(myDistance, language)}` : t("คำนวณระยะทาง")}
              </Button>
            </div>
            <p className="mt-3 font-mono text-xs tracking-normal text-concrete">
              COORDINATE SOURCE ·{" "}
              <a
                href={location.coordinate_source.url}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-acid"
              >
                {location.coordinate_source.name} / {location.coordinate_source.property}
              </a>{" "}
              · CONFIDENCE {location.coordinate_source.confidence}%
            </p>
          </section>

          {/* Creative */}
          <section>
            <div className="border-b border-line pb-3">
              <p className="label-mono text-acid">CREATIVE DIRECTION</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold"><Localized text={"แนะนำสำหรับ MV"} /></h2>
            </div>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="label-mono text-concrete"><Localized text={"MOOD ที่ตรงที่สุด"} /></p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[...location.moods]
                    .sort((a, b) => b.relevance_score - a.relevance_score)
                    .slice(0, 6)
                    .map((m) => (
                      <span
                        key={m.slug}
                        className="border border-acid/30 bg-acid/5 px-2 py-1 font-mono text-xs tracking-normal text-acid"
                      >
                        {moodBySlug.get(m.slug)?.name_en ?? m.slug} {Math.round(m.relevance_score * 100)}
                      </span>
                    ))}
                </div>
              </div>
              <div>
                <p className="label-mono text-concrete">COLOR PALETTE</p>
                <div className="mt-2 flex gap-1">
                  {location.creative.palette.map((hex) => (
                    <div
                      key={hex}
                      className="group relative h-10 flex-1 border border-paper/10"
                      style={{ background: hex }}
                    >
                      <span className="absolute inset-x-0 -bottom-4 text-center font-mono text-xs text-concrete">
                        {hex}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="border border-line p-4">
                <div className="flex items-center gap-2">
                  <CloudSun className="h-4 w-4 text-acid" />
                  <p className="label-mono text-concrete">LIGHT WINDOW</p>
                </div>
                <p className="mt-2 font-sans text-sm text-concrete">{t(location.creative.light_window_note)}</p>
              </div>
              <div className="border border-line p-4">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-acid" />
                  <p className="label-mono text-concrete">SOUND & CREW</p>
                </div>
                <p className="mt-2 font-sans text-sm text-concrete">
                  <Localized text={"ข้อจำกัดเสียงและขนาดทีม:"} /> {t(UNKNOWN)} <Localized text={"— ควรแจ้งทีมงานล่วงหน้าและขออนุญาตเป็นลายลักษณ์อักษร"} /></p>
              </div>
            </div>
          </section>

          {/* Sources */}
          <section>
            <div className="border-b border-line pb-3">
              <p className="label-mono text-acid">EVIDENCE</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold"><Localized text={"แหล่งข้อมูลและหลักฐาน"} /></h2>
            </div>
            <ul className="mt-4 space-y-2">
              {location.sources.map((s) => (
                <li
                  key={s.source_url}
                  className="flex flex-col justify-between gap-1 border-b border-line py-3 sm:flex-row sm:items-center"
                >
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 font-sans text-sm text-concrete hover:text-acid"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {s.source_type} · {s.field_verified}
                  </a>
                  <span className="font-mono text-xs tracking-normal text-concrete">
                    CHECKED {formatLocalizedDate(s.checked_at, language)}
                  </span>
                </li>
              ))}
            </ul>

            <details className="mt-6 border border-line">
              <summary className="cursor-pointer px-4 py-3 font-mono text-xs tracking-normal text-concrete">
                PHOTO CREDITS ({galleryPhotos.length} / {location.photo_count})
              </summary>
              <ul className="divide-y divide-line border-t border-line">
                {galleryPhotos.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-sans text-xs text-concrete">
                      {String(i + 1).padStart(2, "0")} · © {p.photographer} ·{" "}
                      {p.license_url ? (
                        <a href={p.license_url} target="_blank" rel="noreferrer" className="underline hover:text-acid">
                          {p.license}
                        </a>
                      ) : (
                        p.license
                      )}
                    </span>
                    <a
                      href={p.source_page_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs tracking-normal text-concrete hover:text-acid"
                    >
                      SOURCE ↗
                    </a>
                  </li>
                ))}
              </ul>
            </details>

            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="mt-6 flex items-center gap-2 font-mono text-xs tracking-normal text-concrete hover:text-burnt"
            >
              <Flag className="h-3.5 w-3.5" /> REPORT INCORRECT INFORMATION
            </button>
          </section>
        </div>

        {/* ── SIDEBAR ────────────────────────────────────────────────────── */}
        <aside className="min-w-0 space-y-6 lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <div className="border border-line p-5">
              <p className="label-mono text-concrete">QUICK FACTS</p>
              <dl className="mt-4 space-y-3">
                {[
                  { k: "จังหวัด", v: provinceLabel(location.province_th, language) },
                  { k: "อำเภอ/เขต", v: location.district ?? UNKNOWN },
                  { k: "พิกัด", v: formatCoords(location.latitude, location.longitude) },
                  { k: "ประเภท", v: location.location_type },
                  { k: "ภาพที่ยืนยัน", v: language === "en" ? `${location.photo_count} photos` : `${location.photo_count} ภาพ` },
                  { k: "ตรวจสอบล่าสุด", v: formatLocalizedDate(location.verified_at, language) },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="flex items-start justify-between gap-4 border-b border-line pb-2.5 last:border-0"
                  >
                    <dt className="font-sans text-xs text-concrete">{t(row.k)}</dt>
                    <dd className="text-right font-sans text-xs text-paper/75">{t(row.v)}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={() => copy(shareUrl, "คัดลอกลิงก์แล้ว")}>
                  <Copy className="h-3.5 w-3.5" /> LINK
                </Button>
                <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>
                  <Flag className="h-3.5 w-3.5" /> REPORT
                </Button>
              </div>
            </div>

            <div className="border border-line p-5">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-acid" />
                <p className="label-mono text-concrete">BEFORE YOU SHOOT</p>
              </div>
              <ol className="mt-3 space-y-2.5 font-sans text-[12px] leading-relaxed text-concrete">
                <li>
                  <span className="text-acid">01</span> <Localized text={"ติดต่อเจ้าของพื้นที่/หน่วยงานรัฐ และขออนุญาตเป็นลายลักษณ์อักษร"} /></li>
                <li>
                  <span className="text-acid">02</span> <Localized text={"ตรวจสอบกฎโดรนกับ กสทช./กรมการบินพลเรือน"} /></li>
                <li>
                  <span className="text-acid">03</span> <Localized text={"ตรวจสอบข้อห้ามถ่ายในเขตศาสนสถานหรือพื้นที่หวงห้าม"} /></li>
                <li>
                  <span className="text-acid">04</span> <Localized text={"เตรียมแผนสำรองด้านสภาพอากาศและแสง"} /></li>
              </ol>
            </div>

            <div className="border border-line p-5">
              <p className="label-mono text-concrete">NEARBY FRAMES</p>
              <div className="mt-3">
                {nearby.map(({ location: l, distanceKm }) => (
                  <LocationCard key={l.id} location={l} variant="compact" distanceKm={distanceKm} />
                ))}
              </div>
              <Link
                to="/map"
                className="mt-4 flex items-center gap-1 font-mono text-xs tracking-normal text-acid hover:text-paper"
              >
                OPEN FULL MAP <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="clay-panel p-5">
              <p className="label-mono text-concrete">TEAM WORKFLOW</p>
              <p className="mt-2 font-sans text-xs leading-relaxed text-concrete">
                <Localized text={"เพิ่มสถานที่นี้ลงบอร์ดโปรเจกต์ ใส่โน้ตลำดับความสำคัญ แล้ว export เป็น shortlist สำหรับทีม"} /></p>
              <Button className="mt-3 w-full" size="sm" onClick={() => setBoardOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> ADD TO MV BOARD
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* ── BOARD DIALOG ─────────────────────────────────────────────────── */}
      <Dialog open={boardOpen} onOpenChange={setBoardOpen}>
        <DialogContent>
          <DialogTitle className="display text-3xl">ADD TO BOARD</DialogTitle>
          <p className="mt-2 font-sans text-sm text-concrete"><Localized text={"เลือกบอร์ดโปรเจกต์ หรือสร้างใหม่สำหรับ MV นี้"} /></p>
          <div className="mt-6 space-y-2">
            {allBoards.length === 0 && (
              <p className="border border-dashed border-paper/15 p-4 font-sans text-sm text-concrete">
                <Localized text={"ยังไม่มีบอร์ด — สร้างบอร์ดแรกด้านล่าง"} /></p>
            )}
            {allBoards.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => addToBoard(b.id)}
                className="flex w-full items-center justify-between border border-line p-4 text-left hover:border-acid"
              >
                <span>
                  <span className="block font-display text-lg font-bold">{b.title}</span>
                  <span className="font-mono text-xs tracking-normal text-concrete">{b.items.length} LOCATIONS</span>
                </span>
                <Plus className="h-4 w-4 text-concrete" />
              </button>
            ))}
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <Label htmlFor="new-board"><Localized text={"สร้างบอร์ดใหม่"} /></Label>
            <div className="flex gap-2">
              <Input
                id="new-board"
                value={newBoard}
                onChange={(e) => setNewBoard(e.target.value)}
                placeholder={t("เช่น ET1CRUEL — DARK AMBIENT MV")}
                onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
              />
              <Button onClick={createAndAdd} disabled={!newBoard.trim()}>
                <Localized text={"สร้าง"} /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── REPORT DIALOG ────────────────────────────────────────────────── */}
      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          setReportOpen(open);
          setReportError(false);
        }}
      >
        <DialogContent>
          <DialogTitle className="display text-3xl">REPORT AN ISSUE</DialogTitle>
          <p className="mt-2 font-sans text-sm text-concrete"><Localized text={"ช่วยให้ฐานข้อมูลแม่นยำขึ้น — รายงานจะถูกส่งเข้าคิวตรวจสอบ"} /></p>
          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="report-reason"><Localized text={"ประเภทปัญหา"} /></Label>
              <select
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="h-11 w-full border border-paper/25 bg-ink px-3 font-sans text-sm text-paper focus:border-acid focus:outline-none"
              >
                <option><Localized text={"ข้อมูลไม่ถูกต้อง"} /></option>
                <option><Localized text={"พิกัดผิด"} /></option>
                <option><Localized text={"ภาพไม่ตรงกับสถานที่"} /></option>
                <option><Localized text={"สถานะการอนุญาตเปลี่ยน"} /></option>
                <option><Localized text={"สถานที่ปิดปรับปรุง/เข้าถึงไม่ได้"} /></option>
                <option><Localized text={"อื่น ๆ"} /></option>
              </select>
            </div>
            <div>
              <Label htmlFor="report-detail"><Localized text={"รายละเอียด"} /></Label>
              <Textarea
                id="report-detail"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder={t("อธิบายสิ่งที่พบ พร้อมลิงก์อ้างอิงถ้ามี")}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReportOpen(false)}>
              <Localized text={"ยกเลิก"} /></Button>
            {reportError && (
              <p role="alert" className="text-sm text-burnt">
                <Localized text={"ส่งรายงานไม่สำเร็จ โปรดลองอีกครั้ง"} /></p>
            )}
            <Button onClick={() => void submitReport()} disabled={reportSending}>
              {reportSending ? "กำลังส่ง…" : "ส่งรายงาน"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 border border-acid/50 bg-ink px-4 py-3 text-paper shadow-2xl">
          <Check className="h-4 w-4 text-acid" />
          <span className="font-sans text-sm">{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label={t("ปิด")}>
            <X className="h-3.5 w-3.5 text-concrete" />
          </button>
        </div>
      )}

      <div className="border-t border-line">
        <div className="container-x flex items-center justify-between py-5">
          <Link
            to="/explore"
            className="flex items-center gap-2 font-mono text-xs tracking-normal text-concrete hover:text-acid"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> BACK TO EXPLORE
          </Link>
          <span className="flex items-center gap-1 font-mono text-xs tracking-normal text-concrete">
            <Users className="h-3 w-3" /> SHOT BY THE FRAMEHUNT COMMUNITY
          </span>
        </div>
      </div>
    </div>
  );
}
