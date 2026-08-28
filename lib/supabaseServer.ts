import { createClient } from "@supabase/supabase-js";

// Service-role client — server-side only, never import this from a Client Component.
// It bypasses RLS, so every route that uses it must sit behind requireSession().
//
// The custom `fetch` forces every request this client makes to bypass Next.js's
// Data Cache. Without this, Next.js caches the underlying fetch() calls that
// supabase-js makes indefinitely — `export const dynamic = "force-dynamic"` on
// the page is not enough to stop that for a third-party client's own fetches.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}
