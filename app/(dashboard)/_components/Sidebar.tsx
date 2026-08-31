import { NavLinks } from "./NavLinks";

export function Sidebar({ isMatthias }: { isMatthias: boolean }) {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">FLOW SYSTEMS</span><span className="brand-sub">// Command Center</span></div>
      <NavLinks isMatthias={isMatthias} />
    </aside>
  );
}
