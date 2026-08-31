"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Overzicht" },
  { href: "/squad", label: "Squad Status" },
  { href: "/pipeline", label: "App Pipeline" },
  { href: "/taken", label: "Taken" },
  { href: "/wiki", label: "Wiki" },
];
const ADMIN_NAV_ITEMS = [
  { href: "/prestaties", label: "Prestaties" },
  { href: "/uitbetalingen", label: "Uitbetalingen" },
  { href: "/veto", label: "VETO Console" },
  { href: "/tools", label: "Tools & Abonnementen" },
];

export function NavLinks({ isMatthias, onNavigate }: { isMatthias: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const link = (href: string, label: string) => (
    <Link key={href} href={href} onClick={onNavigate} className={pathname === href ? "active" : ""}>{label}</Link>
  );
  return (
    <nav className="sidebar-nav">
      {NAV_ITEMS.map((i) => link(i.href, i.label))}
      {isMatthias && (
        <>
          <div className="sidebar-section-label">Beheer</div>
          {ADMIN_NAV_ITEMS.map((i) => link(i.href, i.label))}
        </>
      )}
      {link("/instellingen", "Instellingen")}
    </nav>
  );
}
