"use client";
import { useMemo, useRef, useState, type MouseEvent } from "react";
import type { MrrSnapshot, Venture } from "@/lib/dashboard-types";
import { fmtEUR } from "@/lib/dashboard-format";

// Vaste, thema-onafhankelijke kleuren voor per-venture lijnen -- dataviz-kleuren
// horen geen CSS-variabelen te zijn, die moeten juist in beide thema's even
// goed leesbaar blijven. Gematigde lichtheid zodat ze op zowel licht als donker
// overeind blijven.
const PALETTE = ["#3b82f6", "#f97316", "#10b981", "#a855f7", "#ec4899", "#eab308", "#14b8a6", "#ef4444"];

const W = 720, H = 260, PAD = { top: 16, right: 16, bottom: 26, left: 56 };

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "short" });
}

export function RevenueChart({ snapshots, ventures }: { snapshots: MrrSnapshot[]; ventures: Venture[] }) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { days, series, totals, maxY } = useMemo(() => {
    const byDay = new Map<string, Map<string, number>>();
    for (const s of [...snapshots].sort((a, b) => (a.captured_at < b.captured_at ? -1 : 1))) {
      const day = s.captured_at.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, new Map());
      byDay.get(day)!.set(s.venture_id, s.mrr);
    }
    const days = [...byDay.keys()].sort();
    const series = ventures.map((v, i) => {
      const points: (number | null)[] = days.map((d) => byDay.get(d)?.get(v.id) ?? null);
      let last: number | null = null;
      for (let j = 0; j < points.length; j++) {
        if (points[j] === null) points[j] = last;
        else last = points[j];
      }
      return { id: v.id, name: v.name, color: PALETTE[i % PALETTE.length], points };
    });
    const totals = days.map((_, i) => series.reduce((sum, s) => sum + (s.points[i] ?? 0), 0));
    const maxY = Math.max(1, ...totals);
    return { days, series, totals, maxY };
  }, [snapshots, ventures]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const xFor = (i: number) => PAD.left + (days.length > 1 ? (i / (days.length - 1)) * plotW : plotW / 2);
  const yFor = (v: number) => PAD.top + plotH - (v / maxY) * plotH;
  const linePath = (points: (number | null)[]) =>
    points.map((p, i) => (p === null ? null : `${i === 0 || points[i - 1] === null ? "M" : "L"}${xFor(i)},${yFor(p)}`)).filter(Boolean).join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));

  function handleMove(e: MouseEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg || days.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const xInViewBox = ((e.clientX - rect.left) / rect.width) * W;
    const frac = Math.min(1, Math.max(0, (xInViewBox - PAD.left) / plotW));
    setHoverIdx(Math.round(frac * (days.length - 1)));
  }

  function toggleVenture(id: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (days.length === 0) {
    return <div className="revenue-chart-empty">Nog geen omzetdata verzameld — komt vanaf de eerstvolgende dagelijkse sync of MRR-wijziging.</div>;
  }

  return (
    <div className="revenue-chart">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="revenue-chart-svg">
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yFor(t)} y2={yFor(t)} className="revenue-chart-grid" />
            <text x={PAD.left - 8} y={yFor(t)} textAnchor="end" dominantBaseline="middle" className="revenue-chart-axis">{fmtEUR(t)}</text>
          </g>
        ))}
        {[0, days.length - 1].map((i) => (
          <text key={i} x={xFor(i)} y={H - 6} textAnchor={i === 0 ? "start" : "end"} className="revenue-chart-axis">{fmtDay(days[i])}</text>
        ))}
        {series.map((s) =>
          hiddenIds.has(s.id) ? null : <path key={s.id} d={linePath(s.points)} fill="none" stroke={s.color} strokeWidth={1.75} opacity={0.85} />
        )}
        <path d={linePath(totals)} fill="none" className="revenue-chart-total" strokeWidth={2.5} />
        {hoverIdx !== null && (
          <>
            <line x1={xFor(hoverIdx)} x2={xFor(hoverIdx)} y1={PAD.top} y2={H - PAD.bottom} className="revenue-chart-hover-line" />
            <circle cx={xFor(hoverIdx)} cy={yFor(totals[hoverIdx])} r={3.5} className="revenue-chart-hover-dot" />
          </>
        )}
        <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="transparent" onMouseMove={handleMove} onMouseLeave={() => setHoverIdx(null)} />
      </svg>
      {hoverIdx !== null && (
        <div className="revenue-chart-tooltip" style={{ left: `${(xFor(hoverIdx) / W) * 100}%` }}>
          <div className="revenue-chart-tooltip-date">{fmtDay(days[hoverIdx])}</div>
          <div className="revenue-chart-tooltip-row"><span className="revenue-chart-tooltip-dot" style={{ background: "var(--accent)" }} />Totaal<b>{fmtEUR(totals[hoverIdx])}</b></div>
          {series.filter((s) => !hiddenIds.has(s.id)).map((s) => (
            <div className="revenue-chart-tooltip-row" key={s.id}><span className="revenue-chart-tooltip-dot" style={{ background: s.color }} />{s.name}<b>{fmtEUR(s.points[hoverIdx] ?? 0)}</b></div>
          ))}
        </div>
      )}
      <div className="revenue-chart-legend">
        <button className="revenue-chart-legend-item" disabled style={{ opacity: 1 }}>
          <span className="revenue-chart-legend-dot" style={{ background: "var(--accent)" }} />Totaal
        </button>
        {series.map((s) => (
          <button key={s.id} className="revenue-chart-legend-item" onClick={() => toggleVenture(s.id)} style={{ opacity: hiddenIds.has(s.id) ? 0.4 : 1 }}>
            <span className="revenue-chart-legend-dot" style={{ background: s.color }} />{s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
