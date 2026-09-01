import { supabaseAdmin } from "@/lib/supabaseServer";
import { ProgrammasClient } from "./ProgrammasClient";

export const dynamic = "force-dynamic";

export default async function ProgrammasPage() {
  const db = supabaseAdmin();
  const { data: ventures } = await db.from("ventures").select("*");
  return <ProgrammasClient initialVentures={ventures ?? []} />;
}
