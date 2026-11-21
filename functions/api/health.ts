import { json, methodNotAllowed, supabaseConfigured, type FunctionContext } from "./_lib";

export async function onRequestGet(context: FunctionContext): Promise<Response> {
  const { env } = context;
  return json({
    ok: true,
    service: "framehunt-api",
    time: new Date().toISOString(),
    // Booleans only. No URLs, keys, or project identifiers.
    configured: {
      database: supabaseConfigured(env),
      rateLimit: Boolean(env.SUBMISSION_RATE_LIMIT),
    },
    publishGate: {
      minVerifiedPhotos: 5,
      enforcedIn: ["ingest", "client", "database-trigger"],
    },
  });
}

export async function onRequest(context: FunctionContext): Promise<Response> {
  if (context.request.method.toUpperCase() === "GET" || context.request.method.toUpperCase() === "HEAD") {
    return onRequestGet(context);
  }
  return methodNotAllowed(["GET", "HEAD"]);
}
