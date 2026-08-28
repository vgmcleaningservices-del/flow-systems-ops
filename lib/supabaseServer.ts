import { createClient } from "@supabase/supabase-js";

// Service-role client — server-side only, never import this from a Client Component.
// It bypasses RLS, so every route that uses it must sit behind requireSession().
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
