import { error, type FunctionContext } from "./_lib";

// Catch-all for unmatched /api/* paths so they return JSON 404 instead of the
// SPA shell. Registered routes (locations, submissions, reports, health) win.
export async function onRequest(context: FunctionContext): Promise<Response> {
  const url = new URL(context.request.url);
  return error("not_found", `No API route matches ${context.request.method} ${url.pathname}`, 404);
}
