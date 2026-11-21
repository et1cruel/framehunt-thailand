import { Link } from "react-router-dom";
import { Heart, MapPin, Camera } from "lucide-react";
import type { LocationRecord } from "@/data/types";
import { categoryBySlug, moodBySlug } from "@/data/taxonomy";
import { cn, formatKm } from "@/lib/utils";
import { PermissionPill } from "@/components/ui";
import { useFavorites } from "@/services/localStore";

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
}: {
  photo: LocationRecord["photos"][number] | undefined;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  if (!photo) return <div className={cn("bg-paper/10", className)} aria-hidden />;
  return (
    <img
      src={photo.thumb_url}
      srcSet={`${photo.thumb_url} 500w, ${photo.image_url} 1920w`}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={photo.title}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}

export function LocationCard({ location, variant = "grid", distanceKm, className }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const saved = isFavorite(location.id);
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
          <PhotoImage photo={cover} sizes="96px" className="h-full w-full object-cover frame-img" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="label-mono text-concrete">{location.province_th}</p>
          <h3 className="mt-1 truncate font-display text-lg font-bold tracking-tight group-hover:text-acid">
            {location.name_th}
          </h3>
          <p className="mt-1 font-mono text-xs tracking-normal text-concrete">
            {location.photo_count} PHOTOS
            {distanceKm != null ? ` · ${formatKm(distanceKm)}` : ""}
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
        >
          <PhotoImage
            photo={cover}
            sizes="(max-width: 640px) 100vw, 280px"
            className="h-full w-full object-cover frame-img"
          />
        </Link>
        <div className="flex flex-col justify-between gap-4 px-2 py-2 pr-12 sm:pr-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-mono text-acid">{location.province_th}</span>
              {primaryCat && (
                <span className="label-mono text-concrete">{categoryBySlug.get(primaryCat)?.name_en}</span>
              )}
            </div>
            <Link to={`/locations/${location.slug}`}>
              <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight transition-colors group-hover:text-acid md:text-3xl">
                {location.name_th}
              </h3>
              <p className="mt-1 font-sans text-sm text-concrete">{location.name_en}</p>
            </Link>
            <p className="mt-3 line-clamp-2 max-w-2xl font-sans text-sm leading-relaxed text-concrete">
              {location.description_th}
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
          aria-label={saved ? "นำออกจากรายการโปรด" : "บันทึกเป็นรายการโปรด"}
          aria-pressed={saved}
          className={cn(
            "clay-control absolute right-5 top-5 flex h-11 w-11 items-center justify-center border bg-ink/95 transition-colors",
            saved ? "border-acid bg-acid text-ink" : "border-line text-concrete hover:border-acid hover:text-acid",
          )}
        >
          <Heart className={cn("h-4 w-4", saved && "fill-current")} />
        </button>
      </article>
    );
  }

  return (
    <article className={cn("clay-panel group relative flex min-w-0 flex-col p-2", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-ink-2">
        <Link
          to={"/locations/" + location.slug}
          aria-label={location.name_th}
          className="absolute inset-0 focus-visible:outline-offset-[-3px]"
        >
          <PhotoImage
            photo={cover}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="h-full w-full object-cover frame-img"
          />
        </Link>
        <button
          type="button"
          onClick={() => toggle(location.id)}
          aria-label={saved ? "นำออกจากรายการโปรด" : "บันทึกเป็นรายการโปรด"}
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
          <p className="text-sm font-semibold text-acid">{location.province_th}</p>
          <PermissionPill status={location.permission.permission_status} />
        </div>
        <Link to={"/locations/" + location.slug} className="mt-2 block group-hover:text-acid">
          <h3 className="break-words text-lg font-bold leading-snug md:text-xl">{location.name_th}</h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-concrete">{location.name_en}</p>
        </Link>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-concrete">
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-acid" />
            <span className="truncate">{location.district ?? location.province_th}</span>
            {distanceKm != null && <span className="shrink-0">· {formatKm(distanceKm)}</span>}
          </span>
          <span className="flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5 text-acid" />
            {location.photo_count} ภาพ
          </span>
        </div>
      </div>
    </article>
  );
}
