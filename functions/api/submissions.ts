import {
  cleanText,
  error,
  isEmail,
  isHttpUrl,
  json,
  methodNotAllowed,
  parseThaiCoordinates,
  rateLimit,
  readJson,
  supabaseConfigured,
  supabaseRequest,
  type FunctionContext,
} from "./_lib";

const TYPES = new Set(["new-location", "correction", "permission-doc"]);

export async function onRequestPost(context: FunctionContext): Promise<Response> {
  const { request, env } = context;

  const limit = await rateLimit(env, request, "submission", 5, 600);
  if (limit.limited) {
    return error("rate_limited", "Too many submissions from this address. Try again later.", 429, {
      retryAfterSeconds: 600,
    });
  }

  const body = await readJson(request);
  if (!body) return error("invalid_body", "Expected a JSON object body", 400);

  // Honeypot: real users never fill this hidden field.
  if (cleanText(body.trap, 200) !== "") {
    return json({ ok: true, id: null }, 202);
  }

  const type = cleanText(body.type, 40) || "new-location";
  const name = cleanText(body.name, 200);
  const province = cleanText(body.province, 80);
  const description = cleanText(body.description, 4000);
  const coordinates = cleanText(body.coordinates, 80);
  const sourceUrl = cleanText(body.sourceUrl, 500);
  const contact = cleanText(body.contact, 300);
  const photoNote = cleanText(body.photoNote, 4000);
  const permissionNote = cleanText(body.permissionNote, 4000);
  const email = cleanText(body.email, 200);

  const details: Record<string, string> = {};
  if (!TYPES.has(type)) details.type = "unknown submission type";
  if (name.length < 2) details.name = "name must be at least 2 characters";
  if (province.length === 0) details.province = "province is required";
  if (description.length < 30) details.description = "description must be at least 30 characters";
  if (!isHttpUrl(sourceUrl)) details.sourceUrl = "sourceUrl must be http(s)";
  if (!isEmail(email)) details.email = "email is invalid";
  if (coordinates && !parseThaiCoordinates(coordinates)) {
    details.coordinates = "coordinates must be 'lat,lng' inside Thailand";
  }
  if (Object.keys(details).length > 0) {
    return error("validation_failed", "Some fields need attention", 422, details);
  }

  if (!supabaseConfigured(env)) {
    return error(
      "not_configured",
      "Submissions require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on this deployment. Nothing was stored.",
      503,
    );
  }

  try {
    const response = await supabaseRequest(env, "location_submissions", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        type,
        name,
        province,
        description,
        coordinates: coordinates || null,
        source_url: sourceUrl || null,
        contact: contact || null,
        photo_note: photoNote || null,
        permission_note: permissionNote || null,
        submitter_email: email || null,
        status: "pending",
      }),
    });

    if (!response.ok) {
      return error("upstream_error", "Submission could not be stored", 502);
    }
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
