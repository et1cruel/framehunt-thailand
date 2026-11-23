import { useEffect, useRef, useState } from "react";
import maplibregl, { type LngLatBoundsLike, type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Crosshair, Loader2 } from "lucide-react";
import type { LocationRecord } from "@/data/types";
import { loadPhotoGallery } from "@/services/photoGalleries";
import { categoryBySlug, GROUP_META } from "@/data/taxonomy";
import { cn } from "@/lib/utils";

const STYLE_URL =
  (import.meta.env.VITE_MAP_STYLE_URL as string | undefined) || "https://tiles.openfreemap.org/styles/liberty";

interface Props {
  locations: LocationRecord[];
  className?: string;
  height?: string;
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void;
  onSelect?: (slug: string) => void;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  interactive?: boolean;
}

function groupColor(categories: string[]) {
  for (const c of categories) {
    const g = categoryBySlug.get(c)?.group;
    if (g && g in GROUP_META) return GROUP_META[g as keyof typeof GROUP_META].marker;
  }
  return "#315c53";
}

export function MapCanvas({
  locations,
  className,
  height = "70vh",
  onBoundsChange,
  onSelect,
  focus,
  interactive = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // Create map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [100.5018, 13.7563],
      zoom: 5.1,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      setReady(true);
      map.addSource("locations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 11,
        clusterRadius: 46,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "locations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#315c53",
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 40, 26],
          "circle-stroke-color": "#f8faff",
          "circle-stroke-width": 2,
          "circle-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "locations",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "points",
        type: "circle",
        source: "locations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 8,
          "circle-stroke-color": "#f8faff",
          "circle-stroke-width": 2,
          "circle-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "point-labels",
        type: "symbol",
        source: "locations",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#243143",
          "text-halo-color": "#f8faff",
          "text-halo-width": 1.4,
        },
      });

      map.on("click", "clusters", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const clusterId = feature.properties?.cluster_id as number;
        const source = map.getSource("locations") as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const [lng, lat] = (feature.geometry as { type: "Point"; coordinates: [number, number] }).coordinates;
          map.easeTo({ center: [lng, lat], zoom });
        });
      });

      map.on("click", "points", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as Record<string, string>;
        const [lng, lat] = (feature.geometry as { type: "Point"; coordinates: [number, number] }).coordinates;

        const el = document.createElement("div");
        el.className = "w-64";
        const img = document.createElement("img");
        img.src = props.image;
        img.alt = props.name;
        img.className = "h-32 w-full object-cover";
        img.loading = "lazy";
        img.onerror = () => {
          img.onerror = null;
          const galleryUrl = props.gallery;
          const expectedCount = Number(props.photoCount);
          void loadPhotoGallery(galleryUrl, expectedCount)
            .then((photos) => {
              const fallback = photos.find((photo) => photo.id !== props.coverId && photo.is_verified);
              if (fallback) img.src = fallback.thumb_url;
              else img.alt = `${props.name} — ภาพโหลดไม่สำเร็จ`;
            })
            .catch(() => { img.alt = `${props.name} — ภาพโหลดไม่สำเร็จ`; });
        };
        const body = document.createElement("div");
        body.className = "p-3";
        const province = document.createElement("p");
        province.className = "font-mono text-xs tracking-normal text-acid";
        province.textContent = props.province;
        const title = document.createElement("p");
        title.className = "mt-1 font-bold text-sm text-paper";
        title.textContent = props.name;
        const meta = document.createElement("p");
        meta.className = "mt-1 font-mono text-xs text-concrete";
        meta.textContent = `${props.photos} PHOTOS · ${props.mood}`;
        const link = document.createElement("a");
        link.href = `/locations/${props.slug}`;
        link.textContent = "เปิดรายละเอียด →";
        link.className =
          "mt-3 inline-block border rounded-lg border-acid px-2 py-1 font-mono text-xs tracking-normal text-acid";
        body.append(province, title, meta, link);
        el.append(img, body);

        new maplibregl.Popup({ offset: 12, maxWidth: "260px" }).setLngLat([lng, lat]).setDOMContent(el).addTo(map);

        if (onSelect) onSelect(props.slug);
      });

      map.on("mouseenter", "points", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "points", () => (map.getCanvas().style.cursor = ""));

      map.on("moveend", () => {
        if (!onBoundsChange) return;
        const b = map.getBounds();
        onBoundsChange({
          west: b.getWest(),
          south: b.getSouth(),
          east: b.getEast(),
          north: b.getNorth(),
        });
      });
    });

    map.on("error", (e) => {
      if (!ready) setError(e.error?.message || "โหลดแผนที่ไม่สำเร็จ");
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync data.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("locations") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const features = locations.map((loc) => {
      const cover = loc.photos.find((p) => p.is_cover) ?? loc.photos[0];
      const topMood = loc.moods[0]?.slug ?? "cinematic";
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [loc.longitude, loc.latitude] },
        properties: {
          slug: loc.slug,
          name: loc.name_th,
          province: loc.province_th,
          photos: loc.photo_count,
          mood: topMood,
          color: groupColor(loc.categories),
          image: cover?.thumb_url ?? "",
          coverId: cover?.id ?? "",
          gallery: loc.gallery_asset_url ?? "",
          photoCount: loc.photo_count,
        },
      };
    });

    source.setData({ type: "FeatureCollection", features });
  }, [locations, ready]);

  // Focus.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focus) return;
    map.flyTo({ center: [focus.lng, focus.lat], zoom: focus.zoom ?? 13, duration: 900 });
  }, [focus, ready]);

  function locateMe() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 12, duration: 1200 });
        const marker = document.createElement("div");
        marker.className = "h-4 w-4 rounded-full border-2 border-white bg-acid";
        new maplibregl.Marker({ element: marker }).setLngLat([longitude, latitude]).addTo(mapRef.current!);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[1.5rem] border border-white/85 bg-ink-2 shadow-glass",
        className,
      )}
      style={{ height }}
    >
      <div ref={containerRef} className="map-viewport" />

      {!ready && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink">
          <div className="flex items-center gap-3 text-concrete">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="label-mono">LOADING MAP</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-ink p-6 text-center">
          <p className="font-display text-xl">MAP TILES UNAVAILABLE</p>
          <p className="max-w-sm font-sans text-xs text-concrete">
            โหลดแผนที่ไม่ได้ในขณะนี้ — รายการสถานที่ยังใช้งานได้ปกติ ตรวจสอบการเชื่อมต่อหรือตั้งค่า{" "}
            <code className="text-acid">VITE_MAP_STYLE_URL</code>
          </p>
        </div>
      )}

      {interactive && (
        <button
          type="button"
          onClick={locateMe}
          className="absolute bottom-6 right-4 z-10 flex rounded-xl shadow-clay h-10 w-10 items-center justify-center border border-line bg-ink/90 text-concrete backdrop-blur transition-colors hover:border-acid hover:text-acid"
          aria-label="ใช้ตำแหน่งปัจจุบันของฉัน"
          title="ใช้ตำแหน่งปัจจุบัน"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

export function boundsToBBox(b: { west: number; south: number; east: number; north: number }): LngLatBoundsLike {
  return [
    [b.west, b.south],
    [b.east, b.north],
  ];
}
