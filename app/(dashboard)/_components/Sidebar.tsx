import { NavLinks } from "./NavLinks";

export function Sidebar({ isMatthias }: { isMatthias: boolean }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-badge">FS</span>
        <span className="brand-mark">FLOW SYSTEMS</span>
      </div>
      <NavLinks isMatthias={isMatthias} scope="sidebar" />
    </aside>
  );
}
