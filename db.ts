import { createClient, SupabaseClient } from "@supabase/supabase-js";

const URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Single client instance; JWT is set after initData validation
export const supabase: SupabaseClient = createClient(URL, ANON, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Call once after receiving JWT from /auth/telegram */
export function setSupabaseJwt(jwt: string) {
  supabase.realtime.setAuth(jwt);
  // Override the Authorization header for all subsequent requests
  (supabase as any).rest.headers["Authorization"] = `Bearer ${jwt}`;
}
