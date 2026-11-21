import { methodNotAllowed, type FunctionContext } from "./_lib";

// Applies to every request under /api/*.
export async function onRequest(context: FunctionContext): Promise<Response> {
  const { request } = context;
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { allow: "GET, POST, OPTIONS", "cache-control": "no-store" },
    });
  }

  if (!["GET", "POST", "HEAD"].includes(method)) {
    return methodNotAllowed(["GET", "POST", "HEAD"]);
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-frame-options", "DENY");
  headers.set("permissions-policy", "geolocation=(self), camera=(), microphone=()");
  headers.set("vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
