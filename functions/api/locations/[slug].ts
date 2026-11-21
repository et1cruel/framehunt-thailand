import { error, json, methodNotAllowed, supabaseConfigured, supabaseRequest, type FunctionContext } from "../_lib";

export async function onRequestGet(context: FunctionContext): Promise<Response> {
  const { env, params } = context;
  const slugParam = params.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return error("invalid_slug", "Slug format is invalid", 400);
  }

  if (!supabaseConfigured(env)) {
    return error(
      "not_configured",
      "Database is not configured. The app serves this location from the bundled verified dataset instead.",
      503,
    );
  }

  const query = [
    "select=*,location_photos(*),location_sources(*),location_categories(category_slug),location_moods(mood_slug,relevance_score)",
    `slug=eq.${encodeURIComponent(slug)}`,
    "status=eq.published",
    "location_photos.is_verified=eq.true",
    "limit=1",
  ].join("&");

  try {
    const response = await supabaseRequest(env, `locations?${query}`);
    if (!response.ok) return error("upstream_error", "Location lookup failed", 502);
    const rows = (await response.json()) as unknown[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return error("not_found", "No published location with that slug", 404);
    }
    return json({ location: rows[0] });
  } catch {
    return error("upstream_unreachable", "Could not reach the database", 502);
  }
}

export async function onRequest(context: FunctionContext): Promise<Response> {
  const method = context.request.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return onRequestGet(context);
  return methodNotAllowed(["GET", "HEAD"]);
}
