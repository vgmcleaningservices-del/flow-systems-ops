import { supabaseAdmin } from "@/lib/supabaseServer";
import { ToolsClient } from "./ToolsClient";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const db = supabaseAdmin();
  const { data: tools } = await db.from("tools").select("*").order("name", { ascending: true });
  return <ToolsClient initialTools={tools ?? []} />;
}
