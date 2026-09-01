import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getIdentity } from "@/lib/session";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB -- ruim genoeg voor een foto/korte video, klein genoeg om de gratis Storage-tier niet meteen te vullen

export async function POST(req: NextRequest) {
  const identity = await getIdentity(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const channel = form?.get("channel");
  const file = form?.get("file");
  if (!form || typeof channel !== "string" || !channel || !(file instanceof File)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });

  const db = supabaseAdmin();
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const path = `${channel}/${Date.now()}-${identity}-${safeName}`;
  const { error: uploadError } = await db.storage
    .from("chat-uploads")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicUrl } = db.storage.from("chat-uploads").getPublicUrl(path);
  const { error: insertError } = await db.from("chat_messages").insert({
    channel,
    sender: identity,
    content: "",
    media_url: publicUrl.publicUrl,
    media_type: isImage ? "image" : "video",
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
