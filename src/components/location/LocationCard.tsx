import { Localized, useLanguage } from "@/i18n/Language";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Heart, MapPin, Camera, ImageOff } from "lucide-react";
import type { SyntheticEvent } from "react";
import type { LocationPhoto, LocationRecord } from "@/data/types";
import { categoryBySlug, moodBySlug } from "@/data/taxonomy";
import { cn, formatLocalizedKm } from "@/lib/utils";
import { PermissionPill } from "@/components/ui";
import { useFavorites } from "@/services/localStore";
import { loadPhotoGallery } from "@/services/photoGalleries";

interface Props {
  location: LocationRecord;
  index?: number;
  variant?: "grid" | "list" | "compact";
  distanceKm?: number | null;
  className?: string;
}

export function PhotoImage({
  photo,
  sizes,
  className,
  priority,
  fetchPriority,
  fallbackPhotos = [],
  galleryAssetUrl,
  expectedPhotoCount = 0,
}: {
  photo: LocationPhoto | undefined;
  sizes: string;
  className?: string;
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  fallbackPhotos?: LocationPhoto[];
  galleryAssetUrl?: string;
  expectedPhotoCount?: number;
}) {
  const { t } = useLanguage();
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [useOriginal, setUseOriginal] = useState(false);
  const [recoveryPhotos, setRecoveryPhotos] = useState<LocationPhoto[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [attemptedGallery, setAttemptedGallery] = useState(false);
  const [failed, setFailed] = useState(false);
  const primaryId = photo?.id;

  useEffect(() => {
    setCandidateIndex(0);
    setUseOriginal(false);
    setRecoveryPhotos([]);
    setLoadingGallery(false);
    setAttemptedGallery(false);
    setFailed(false);
  }, [primaryId]);

  const candidates = [photo, ...fallbackPhotos, ...recoveryPhotos].filter(
    (item, index, all): item is LocationPhoto => Boolean(item?.is_verified) && all.findIndex((candidate) => candidate?.id === item?.id) === index,
  );
  const current = candidates[candidateIndex];

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (!useOriginal && event.currentTarget.currentSrc !== current?.image_url) {
      setUseOriginal(true);
      return;
    }
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((index) => index + 1);
      setUseOriginal(false);
      return;
    }
    if (galleryAssetUrl && !attemptedGallery && !loadingGallery) {
      setAttemptedGallery(true);
      setLoadingGallery(true);
      void loadPhotoGallery(galleryAssetUrl, expectedPhotoCount)
        .then((gallery) => {
          const nextPhotos = gallery.filter((item) => !candidates.some((candidate) => candidate.id === item.id));
          if (nextPhotos.length) {
            setRecoveryPhotos(nextPhotos);
            setCandidateIndex(candidates.length);
            setUseOriginal(false);
          }
          else setFailed(true);
        })
        .catch(() => setFailed(true))
        .finally(() => setLoadingGallery(false));
      return;
    }
    if (attemptedGallery || !galleryAssetUrl) setFailed(true);
  };

  if (!current || failed) {
    const message = loadingGallery
      ? t("กำลังค้นหารูปสำรอง…")
      : photo
        ? t("ภาพนี้โหลดไม่สำเร็จ")
        : t("ยังไม่มีภาพสถานที่");
    return (
      <div role="img" aria-label={photo ? t("ภาพสถานที่โหลดไม่สำเร็จ") : t("ยังไม่มีภาพสถานที่")} className={cn("flex items-center justify-center gap-2 bg-ink-2 px-3 text-center text-xs text-concrete", className)}>
        <ImageOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <img
      src={useOriginal ? current.image_url : current.thumb_url}
      srcSet={useOriginal ? undefined : `${current.thumb_url} 500w, ${current.image_url} 1920w`}
      sizes={sizes}
      width={current.width}
      height={current.height}
      alt={current.title}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
      decoding="async"
      className={className}
      onError={handleImageError}
    />
  );
}

function HoverPhotos({ location, cover, sizes, focusActive = false }: { location: LocationRecord; cover: LocationRecord["photos"][number] | undefined; sizes: string; focusActive?: boolean }) {
  const { language } = useLanguage();
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [index, setIndex] = useState(0);
  const [galleryPhotos, setGalleryPhotos] = useState(location.photos);
  const previewRef = useRef<HTMLDivElement>(null);
  const active = hovered || focusActive;
  const available = cover ? [cover, ...galleryPhotos.filter((photo) => photo.id !== cover.id && photo.is_verified)] : [];

  useEffect(() => {
    const node = previewRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "40px", threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    setGalleryPhotos(location.photos);
    setIndex(0);
  }, [location.id, location.photos, cover?.id]);
  useEffect(() => {
    if (!active || galleryPhotos.length > 1 || !location.gallery_asset_url) return;
    void loadPhotoGallery(location.gallery_asset_url, location.photo_count)
      .then(setGalleryPhotos)
      .catch(() => undefined);
  }, [active, galleryPhotos.length, location.gallery_asset_url, location.photo_count]);
  useEffect(() => {
    if (!active || !inView || !pageVisible || available.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % available.length), 3500);
    return () => window.clearInterval(timer);
  }, [active, inView, pageVisible, available.length]);
  useEffect(() => {
    if (!active) setIndex(0);
  }, [active]);
  const stop = () => { setHovered(false); setIndex(0); };
  return <div ref={previewRef} className="relative h-full w-full" onMouseEnter={() => setHovered(true)} onMouseLeave={stop}>
    <PhotoImage photo={cover} sizes={sizes} fallbackPhotos={galleryPhotos} galleryAssetUrl={location.gallery_asset_url} expectedPhotoCount={location.photo_count} className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 motion-reduce:transition-none", index === 0 ? "opacity-100" : "opacity-0")} />
    {active && available.slice(1).map((photo, offset) => {
      const position = offset + 1;
      if (position !== index && position !== (index + 1) % available.length && position !== (index - 1 + available.length) % available.length) return null;
      return <PhotoImage key={photo.id} photo={photo} sizes={sizes} fallbackPhotos={available.filter((candidate) => candidate.id !== photo.id)} galleryAssetUrl={location.gallery_asset_url} expectedPhotoCount={location.photo_count} className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 motion-reduce:transition-none", index === position ? "opacity-100" : "opacity-0")} />;
    })}
    {active && available.length > 1 && <span aria-hidden="true" className="photo-preview-count absolute left-2 top-2 rounded-full border border-white/70 bg-ink/90 px-2.5 py-1 font-mono text-[10px] tracking-normal text-paper shadow-sm">{String(index + 1).padStart(2, "0")} / {available.length} {language === "en" ? "photos" : "ภาพ"}</span>}
    {active && available[index] && <span className="absolute bottom-2 left-2 max-w-[85%] rounded bg-black/75 px-2 py-1 text-[10px] text-white">{available[index].attribution_text}</span>}
  </div>;
}

export function LocationCard({ location, variant = "grid", distanceKm, className }: Props) {
  const { language, t } = useLanguage();
  const { isFavorite, toggle } = useFavorites();
  const saved = isFavorite(location.id);
  const [cardFocused, setCardFocused] = useState(false);
  const cover = location.photos.find((p) => p.is_cover) ?? location.photos[0];
  const topMoods = [...location.moods].sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 2);
  const primaryCat = location.categories[0];

  if (variant === "compact") {
    return (
      <Link
        to={`/locations/${location.slug}`}
        className="group flex items-center gap-4 rounded-xl border-b border-line px-2 py-3 hover:bg-ink/85"
      >
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-2">
          <PhotoImage photo={cover} sizes="96px" fallbackPhotos={location.photos} galleryAssetUrl={location.gallery_asset_url} expectedPhotoCount={location.photo_count} className="h-full w-full object-cover frame-img" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="label-mono text-concrete">{language === "en" ? location.province : location.province_th}</p>
          <h3 className="mt-1 truncate font-display text-lg font-bold tracking-tight group-hover:text-acid">
            {language === "en" ? location.name_en || location.name_th : location.name_th}
          </h3>
          <p className="mt-1 font-mono text-xs tracking-normal text-concrete">
            {location.photo_count} PHOTOS
            {distanceKm != null ? ` · ${formatLocalizedKm(distanceKm, language)}` : ""}
          </p>
        </div>
      </Link>
    );
  }

  if (variant === "list") {
    return (
      <article
        className={cn(
          "clay-panel group relative grid gap-5 p-3 sm:grid-cols-[190px_1fr] md:grid-cols-[225px_1fr]",
          className,
        )}
      >
        <Link
          to={`/locations/${location.slug}`}
          className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-ink-2"
          onFocus={() => setCardFocused(true)}
          onBlur={() => setCardFocused(false)}
        >
          <HoverPhotos location={location} cover={cover} sizes="(max-width: 640px) 100vw, 280px" focusActive={cardFocused} />
        </Link>
        <div className="flex flex-col justify-between gap-4 px-2 py-2 pr-12 sm:pr-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-mono text-acid">{language === "en" ? location.province : location.province_th}</span>
              {primaryCat && (
                <span className="label-mono text-concrete">{categoryBySlug.get(primaryCat)?.name_en}</span>
              )}
            </div>
            <Link to={`/locations/${location.slug}`}>
              <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight transition-colors group-hover:text-acid md:text-3xl">
                {language === "en" ? location.name_en || location.name_th : location.name_th}
              </h3>
              <p className="mt-1 font-sans text-sm text-concrete">{location.name_en}</p>
            </Link>
            <p className="mt-3 line-clamp-2 max-w-2xl font-sans text-sm leading-relaxed text-concrete">
              {language === "en" ? location.description_en || location.description_th : location.description_th}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {topMoods.map((m) => (
              <span
                key={m.slug}
                className="border border-paper/20 px-2 py-1 font-mono text-xs tracking-normal text-concrete"
              >
                {moodBySlug.get(m.slug)?.name_en ?? m.slug}
              </span>
            ))}
            <PermissionPill status={location.permission.permission_status} />
            <span className="ml-auto flex items-center gap-1 font-mono text-xs text-concrete">
              <Camera className="h-3 w-3" /> {location.photo_count}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => toggle(location.id)}
          aria-label={t(saved ? "นำออกจากรายการโปรด" : "บันทึกเป็นรายการโปรด")}
          aria-pressed={saved}
          className={cn(
            "clay-control absolute right-5 top-5 flex h-11 w-11 items-center justify-center border bg-ink/95 transition-[color,background-color,transform] active:scale-95",
            saved ? "border-acid bg-acid text-ink" : "border-line text-concrete hover:border-acid hover:text-acid",
          )}
        >
          <Heart className={cn("h-4 w-4 transition-transform duration-150", saved && "scale-110 fill-current")} />
        </button>
      </article>
    );
  }

  return (
    <article className={cn("clay-panel group relative flex min-w-0 flex-col p-2", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-ink-2">
        <Link
          to={"/locations/" + location.slug}
          aria-label={language === "en" ? location.name_en || location.name_th : location.name_th}
          className="absolute inset-0 focus-visible:outline-offset-[-3px]"
          onFocus={() => setCardFocused(true)}
          onBlur={() => setCardFocused(false)}
        >
          <HoverPhotos location={location} cover={cover} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" focusActive={cardFocused} />
        </Link>
        <button
          type="button"
          onClick={() => toggle(location.id)}
          aria-label={t(saved ? "นำออกจากรายการโปรด" : "บันทึกเป็นรายการโปรด")}
          aria-pressed={saved}
          className={cn(
            "clay-control absolute right-2.5 top-2.5 flex h-11 w-11 items-center justify-center border border-white/75 backdrop-blur-md transition-colors",
            saved ? "bg-acid text-ink" : "bg-ink/90 text-paper hover:bg-sage hover:text-acid",
          )}
        >
          <Heart className={cn("h-4 w-4", saved && "fill-current")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-2.5 pb-2 pt-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-acid">{language === "en" ? location.province : location.province_th}</p>
          <PermissionPill status={location.permission.permission_status} />
        </div>
        <Link to={"/locations/" + location.slug} className="mt-2 block group-hover:text-acid">
          <h3 className="break-words text-lg font-bold leading-snug md:text-xl">{language === "en" ? location.name_en || location.name_th : location.name_th}</h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-concrete">{location.name_en}</p>
        </Link>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-concrete">
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-acid" />
            <span className="truncate">{language === "en" ? t(location.district ?? location.province) : location.district ?? location.province_th}</span>
            {distanceKm != null && <span className="shrink-0">· {formatLocalizedKm(distanceKm, language)}</span>}
          </span>
          <span className="flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5 text-acid" />
            {location.photo_count} <Localized text={"ภาพ"} /></span>
        </div>
      </div>
    </article>
  );
}
