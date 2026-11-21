import { error, json, methodNotAllowed, supabaseConfigured, supabaseRequest, type FunctionContext } from "../_lib";

interface LocationListRow {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  province_th: string;
  photo_count?: number;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  similarity?: number;
}

function intParam(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function onRequestGet(context: FunctionContext): Promise<Response> {
  const { request, env } = context;
  if (!supabaseConfigured(env)) {
    return error(
      "not_configured",
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set on this deployment. The site still serves the bundled verified dataset.",
      503,
    );
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const province = (url.searchParams.get("province") ?? "").trim().slice(0, 80) || null;
  const limit = intParam(url.searchParams.get("limit"), 24, 1, 60);
  const offset = intParam(url.searchParams.get("offset"), 0, 0, 10_000);
  const near = url.searchParams.get("near");

  try {
    if (near) {
      const [latRaw, lngRaw] = near.split(",");
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 5 || lat > 21 || lng < 97 || lng > 106) {
        return error("invalid_near", "near must be 'lat,lng' inside Thailand", 400);
      }
      const radius = intParam(url.searchParams.get("radius"), 25, 1, 300);
      const response = await supabaseRequest(env, "rpc/nearby_locations", {
        method: "POST",
        body: JSON.stringify({
          p_lat: lat,
          p_lng: lng,
          p_radius_km: radius,
          p_limit: limit,
        }),
      });
      if (!response.ok) return error("upstream_error", "Location query failed", 502);
      const rows = (await response.json()) as LocationListRow[];
      return json({ items: rows, meta: { mode: "nearby", radiusKm: radius, count: rows.length } });
    }

    const response = await supabaseRequest(env, "rpc/search_locations", {
      method: "POST",
      body: JSON.stringify({
        p_query: q,
        p_province: province,
        p_limit: limit,
        p_offset: offset,
      }),
    });
    if (!response.ok) return error("upstream_error", "Location query failed", 502);
    const rows = (await response.json()) as LocationListRow[];
    return json({
      items: rows,
      meta: { mode: "search", query: q, province, limit, offset, count: rows.length },
    });
  } catch {
    return error("upstream_unreachable", "Could not reach the database", 502);
  }
}

export async function onRequest(context: FunctionContext): Promise<Response> {
  const method = context.request.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return onRequestGet(context);
  return methodNotAllowed(["GET", "HEAD"]);
}
