import {
  cleanText,
  error,
  isEmail,
  json,
  methodNotAllowed,
  rateLimit,
  readJson,
  supabaseConfigured,
  supabaseRequest,
  type FunctionContext,
} from "./_lib";

export async function onRequestPost(context: FunctionContext): Promise<Response> {
  const { request, env } = context;

  const limit = await rateLimit(env, request, "report", 10, 600);
  if (limit.limited) {
    return error("rate_limited", "Too many reports from this address. Try again later.", 429);
  }

  const body = await readJson(request);
  if (!body) return error("invalid_body", "Expected a JSON object body", 400);

  if (cleanText(body.trap, 200) !== "") {
    return json({ ok: true, id: null }, 202);
  }

  const locationSlug = cleanText(body.locationSlug, 120);
  const reason = cleanText(body.reason, 300);
  const detail = cleanText(body.detail, 4000);
  const email = cleanText(body.email, 200);

  const details: Record<string, string> = {};
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationSlug)) details.locationSlug = "invalid slug";
  if (reason.length < 3) details.reason = "reason is required";
  if (!isEmail(email)) details.email = "email is invalid";
  if (Object.keys(details).length > 0) {
    return error("validation_failed", "Some fields need attention", 422, details);
  }

  if (!supabaseConfigured(env)) {
    return error(
      "not_configured",
      "Reports require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on this deployment. Nothing was stored.",
      503,
    );
  }

  try {
    const check = await supabaseRequest(
      env,
      `locations?select=id&slug=eq.${encodeURIComponent(locationSlug)}&status=eq.published&limit=1`,
    );
    if (!check.ok) return error("upstream_error", "Location lookup failed", 502);
    const found = (await check.json()) as unknown[];
    if (!Array.isArray(found) || found.length === 0) {
      return error("not_found", "No published location with that slug", 404);
    }

    const response = await supabaseRequest(env, "content_reports", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        location_slug: locationSlug,
        reason,
        detail: detail || "",
        reporter_email: email || null,
        status: "open",
      }),
    });
    if (!response.ok) return error("upstream_error", "Report could not be stored", 502);
    const rows = (await response.json()) as Array<{ id?: string }>;
    return json({ ok: true, id: rows[0]?.id ?? null }, 202);
  } catch {
    return error("upstream_unreachable", "Could not reach the database", 502);
  }
}

export async function onRequest(context: FunctionContext): Promise<Response> {
  const method = context.request.method.toUpperCase();
  if (method === "POST") return onRequestPost(context);
  return methodNotAllowed(["POST"]);
}
