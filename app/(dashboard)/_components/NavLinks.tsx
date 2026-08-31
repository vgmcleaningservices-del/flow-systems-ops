"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup } from "motion/react";
import * as motion from "motion/react-client";

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

// `scope` namespacet de layoutId van de actieve-pil binnen Motion's
// LayoutGroup -- nodig omdat Sidebar's NavLinks altijd gemount blijft
// (alleen CSS-verborgen onder 880px) terwijl MobileNav's instantie apart
// mount zodra de drawer opent; op mobiel-met-open-drawer staan dus beide
// tegelijk in de DOM en zouden zonder namespacing dezelfde layoutId delen.
export function NavLinks({ isMatthias, onNavigate, scope }: { isMatthias: boolean; onNavigate?: () => void; scope: string }) {
  const pathname = usePathname();
  const link = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link key={href} href={href} onClick={onNavigate} className={"nav-link" + (active ? " active" : "")}>
        {active && (
          <motion.span
            layoutId="nav-pill"
            className="nav-pill"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        <span className="nav-link-label">{label}</span>
      </Link>
    );
  };
  return (
    <LayoutGroup id={scope}>
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
    </LayoutGroup>
  );
}
