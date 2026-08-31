import type { ReactNode } from "react";

export function pad(n: number) { return String(n).padStart(2, "0"); }
export function fmtEUR(n: number) { return "€" + Math.round(n).toLocaleString("nl-BE"); }
export function relTime(iso: string | null) {
  if (!iso) return "nog nooit";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "zonet";
  if (m < 60) return m + " min geleden";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " u geleden";
  return Math.floor(h / 24) + " dagen geleden";
}
// Kleine, zelfgeschreven renderer voor wiki-content -- geen dependency zoals
// react-markdown nodig voor wat 5 mensen aan interne notities bijhouden.
// Ondersteunt: # / ## koppen, **vet**, "- " bullets, auto-linked URLs.
// Rendert als React-nodes (nooit dangerouslySetInnerHTML).
export function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/\S+)/g);
  return parts.filter(Boolean).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (/^https?:\/\//.test(part)) {
      return <a key={`${keyPrefix}-${i}`} href={part} target="_blank" rel="noreferrer">{part}</a>;
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}
export function renderWikiContent(content: string): ReactNode {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    const key = `l${i}`;
    if (line.startsWith("## ")) return <h4 key={key} style={{ margin: "14px 0 4px" }}>{renderInline(line.slice(3), key)}</h4>;
    if (line.startsWith("# ")) return <h3 key={key} style={{ margin: "16px 0 6px" }}>{renderInline(line.slice(2), key)}</h3>;
    if (line.startsWith("- ")) return <div key={key} style={{ paddingLeft: 16 }}>• {renderInline(line.slice(2), key)}</div>;
    if (line.trim() === "") return <br key={key} />;
    return <div key={key}>{renderInline(line, key)}</div>;
  });
}
export function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${pad(week)}`;
}
