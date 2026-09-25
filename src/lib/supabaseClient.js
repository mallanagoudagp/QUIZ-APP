import { createClient } from "@supabase/supabase-js";

// Optional. Leave VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY unset in .env
// and the whole app runs in guest mode (progress kept in localStorage only,
// no sign-in UI shown). Set them to enable accounts and cross-device sync
// of the learner profile (per-topic accuracy/level).
//
// The anon key is meant to be public — it's safe to ship in the browser.
// Row Level Security policies (see supabase/schema.sql) are what actually
// keep one user's data private from another's.
let rawUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const match = rawUrl.match(/project\/([a-z0-9_-]+)/i);
if (match) {
  rawUrl = `https://${match[1]}.supabase.co`;
}
const url = rawUrl;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const supabaseEnabled = Boolean(url && anonKey);
export const supabase = supabaseEnabled ? createClient(url, anonKey) : null;
