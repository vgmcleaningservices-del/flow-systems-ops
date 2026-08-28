"use client";
import { createClient } from "@supabase/supabase-js";

// Anon-key client for the browser — read-only thanks to the RLS policies in schema.sql.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
