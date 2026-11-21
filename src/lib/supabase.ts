import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * The anon key is public by design; every table is protected by RLS.
 * The service-role key must never appear in this bundle.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const isSupabaseConfigured = Boolean(supabase);
export const allowLocalAuth = !supabase && import.meta.env.VITE_ALLOW_LOCAL_MODE !== "false";
