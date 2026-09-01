import { NavLinks } from "./NavLinks";

export function Sidebar({ isMatthias, me }: { isMatthias: boolean; me: string }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-badge">FS</span>
        <span className="brand-mark">FLOW SYSTEMS</span>
      </div>
      <NavLinks isMatthias={isMatthias} me={me} scope="sidebar" />
    </aside>
  );
}
