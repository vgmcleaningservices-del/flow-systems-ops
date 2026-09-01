"use client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { post } from "@/lib/api-client";
import type { ChatMessage, ChatRead, Crew, TaskPriority, Venture } from "@/lib/dashboard-types";
import { PEOPLE_NAME } from "@/lib/dashboard-constants";
import { relTime } from "@/lib/dashboard-format";
import { WARROOM_CHANNEL, dmChannel } from "@/lib/chat";
import { TaskCreateForm } from "../taken/TaskCreateForm";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const AUDIO_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

export function ChatClient(props: {
  me: string; others: { id: string; name: string }[]; initialMessages: ChatMessage[]; initialReads: ChatRead[];
  crew: Crew[]; ventures: Venture[];
}) {
  const { me, others, crew, ventures } = props;
  const [messages, setMessages] = useState(props.initialMessages);
  const [reads, setReads] = useState(props.initialReads);
  const [activeChannel, setActiveChannel] = useState(WARROOM_CHANNEL);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const myChannels = useMemo(() => [WARROOM_CHANNEL, ...others.map((p) => dmChannel(me, p.id))], [me, others]);
  const myReads = useMemo(() => reads.filter((r) => r.person === me), [reads, me]);
  const readMap = useMemo(() => Object.fromEntries(myReads.map((r) => [r.channel, r.last_read_at])), [myReads]);

  // Diepe link vanuit een meldingsklik (?channel=...) -- window.location.search
  // i.p.v. useSearchParams(), zelfde reden als de loginpagina: dat dwingt een
  // Suspense-boundary af die we hier niet willen optuigen voor één query-param.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("channel");
    if (requested && myChannels.includes(requested)) setActiveChannel(requested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refetchMessages = () =>
      supabaseBrowser
        .from("chat_messages")
        .select("*")
        .in("channel", myChannels)
        .order("created_at", { ascending: true })
        .limit(500)
        .then(({ data }) => data && setMessages(data as ChatMessage[]));
    const refetchReads = () =>
      supabaseBrowser
        .from("chat_reads")
        .select("*")
        .in("channel", myChannels)
        .then(({ data }) => data && setReads(data as ChatRead[]));
    const channel = supabaseBrowser
      .channel("flowsys-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, refetchMessages)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reads" }, refetchReads)
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [myChannels]);

  const visible = messages.filter((m) => m.channel === activeChannel);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [visible.length, activeChannel]);

  // Zodra dit kanaal open staat en er berichten in staan: meteen als gelezen
  // markeren, zowel bij het wisselen van kanaal als bij een nieuw binnenkomend
  // bericht terwijl je er al naar kijkt.
  useEffect(() => {
    if (visible.length === 0) return;
    const now = new Date().toISOString();
    setReads((prev) => {
      const next = prev.filter((r) => !(r.channel === activeChannel && r.person === me));
      return [...next, { person: me, channel: activeChannel, last_read_at: now }];
    });
    post("/api/chat/read", { channel: activeChannel });
  }, [activeChannel, visible.length, me]);

  function unreadCount(ch: string) {
    const lastRead = readMap[ch];
    return messages.filter((m) => m.channel === ch && m.sender !== me && (!lastRead || m.created_at > lastRead)).length;
  }

  // Leesbevestiging op mijn eigen verzonden berichten: in een DM simpelweg
  // "Gezien" zodra de ander het kanaal na dit bericht heeft gelezen; in War
  // Room (meerdere ontvangers) een naamlijst, of "Gezien door iedereen" als
  // alle teamleden buiten mezelf het kanaal al zo ver gelezen hebben.
  function seenLabel(m: ChatMessage): string | null {
    if (m.sender !== me) return null;
    const recipients = m.channel === WARROOM_CHANNEL
      ? others
      : others.filter((p) => dmChannel(me, p.id) === m.channel);
    if (recipients.length === 0) return null;
    const seenIds = new Set(
      reads.filter((r) => r.channel === m.channel && r.person !== me && r.last_read_at >= m.created_at).map((r) => r.person)
    );
    const seenRecipients = recipients.filter((p) => seenIds.has(p.id));
    if (seenRecipients.length === 0) return null;
    if (seenRecipients.length === recipients.length) return recipients.length === 1 ? "Gezien" : "Gezien door iedereen";
    return "Gezien door " + seenRecipients.map((p) => p.name).join(", ");
  }

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft("");
    await post("/api/chat", { channel: activeChannel, content });
    setSending(false);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("channel", activeChannel);
    form.append("file", file);
    const res = await fetch("/api/chat/upload", { method: "POST", body: form });
    if (!res.ok) window.alert("Upload mislukt — probeer opnieuw.");
    setUploading(false);
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      window.alert("Alleen foto's en video's kunnen op deze manier geüpload worden.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      window.alert("Bestand is te groot (max 25MB).");
      return;
    }
    await uploadFile(file);
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = AUDIO_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        await uploadFile(new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type }));
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      window.alert("Kon geen toegang krijgen tot de microfoon.");
    }
  }

  async function createTask(body: { venture_id: string; title: string; description: string; assigned_to: string; priority: TaskPriority }) {
    const ok = await post("/api/tasks", body);
    if (ok) setShowTaskForm(false);
    return ok;
  }

  const activeLabel = activeChannel === WARROOM_CHANNEL ? "War Room" : PEOPLE_NAME[others.find((p) => dmChannel(me, p.id) === activeChannel)?.id ?? ""] ?? "Chat";

  return (
    <>
      <div className="section-head"><span className="section-title">Chat</span></div>
      <p className="section-sub">War Room voor iedereen, of een privégesprek met één teamlid</p>
      <div className="chat-layout">
        <div className="chat-sidebar">
          <button className={"chat-channel" + (activeChannel === WARROOM_CHANNEL ? " active" : "")} onClick={() => setActiveChannel(WARROOM_CHANNEL)}>
            🏛 War Room
            {unreadCount(WARROOM_CHANNEL) > 0 && <span className="chat-unread-dot">{unreadCount(WARROOM_CHANNEL)}</span>}
          </button>
          <div className="chat-sidebar-label">Privé</div>
          {others.map((p) => {
            const ch = dmChannel(me, p.id);
            return (
              <button key={p.id} className={"chat-channel" + (activeChannel === ch ? " active" : "")} onClick={() => setActiveChannel(ch)}>
                {p.name}
                {unreadCount(ch) > 0 && <span className="chat-unread-dot">{unreadCount(ch)}</span>}
              </button>
            );
          })}
        </div>
        <div className="chat-main">
          <div className="chat-main-head">
            {activeLabel}
            <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={() => setShowTaskForm((v) => !v)}>📋 Taak</button>
          </div>
          {showTaskForm && (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <TaskCreateForm crew={crew} ventures={ventures} defaultVentureId={null} onSubmit={createTask} />
            </div>
          )}
          <div className="chat-messages" ref={listRef}>
            {visible.length === 0 && <div className="col-empty">Nog geen berichten — stuur het eerste.</div>}
            {visible.map((m) => {
              const isMine = m.sender === me;
              const seen = seenLabel(m);
              return (
                <div className={"chat-bubble" + (isMine ? " mine" : "")} key={m.id}>
                  {!isMine && <div className="chat-bubble-sender">{PEOPLE_NAME[m.sender] ?? m.sender}</div>}
                  {m.media_type === "image" && m.media_url && (
                    <img className="chat-bubble-media" src={m.media_url} alt="" onClick={() => window.open(m.media_url!, "_blank")} />
                  )}
                  {m.media_type === "video" && m.media_url && (
                    <video className="chat-bubble-media" src={m.media_url} controls onClick={() => window.open(m.media_url!, "_blank")} />
                  )}
                  {m.media_type === "audio" && m.media_url && <audio className="chat-bubble-media" src={m.media_url} controls />}
                  {m.content && <div className="chat-bubble-content">{m.content}</div>}
                  <div className="chat-bubble-time">
                    {relTime(m.created_at)}
                    {seen && <span className="chat-bubble-seen"> · {seen}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="chat-composer">
            <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleFile} />
            <button className="icon-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading || recording} aria-label="Foto of video toevoegen">{uploading ? "…" : "📎"}</button>
            <button className={"icon-btn" + (recording ? " recording" : "")} onClick={toggleRecording} disabled={uploading} aria-label={recording ? "Stop opname" : "Voice-bericht opnemen"}>
              {recording ? "⏹" : "🎤"}
            </button>
            <input
              className="field"
              placeholder={`Bericht naar ${activeLabel}...`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            />
            <button className="btn primary" onClick={send} disabled={sending || !draft.trim()}>Stuur</button>
          </div>
        </div>
      </div>
    </>
  );
}
