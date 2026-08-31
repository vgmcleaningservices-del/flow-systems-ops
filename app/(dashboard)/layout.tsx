import { getMe, isMatthias as checkIsMatthias } from "@/lib/auth";
import { PEOPLE_NAME } from "@/lib/dashboard-constants";
import { Sidebar } from "./_components/Sidebar";
import { NavLinks } from "./_components/NavLinks";
import { LogoutButton } from "./_components/LogoutButton";
import { PageTransition } from "./_components/PageTransition";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  const meName = me ? (PEOPLE_NAME[me] ?? me) : "";
  const matthias = checkIsMatthias(me);

  return (
    <div className="wrap app-shell">
      <Sidebar isMatthias={matthias} />
      <div className="app-main">
        <div className="topbar">
          <div className="topbar-main">
            <div className="brand">
              <span className="brand-badge">FS</span>
              <span className="brand-text"><span className="brand-mark">FLOW SYSTEMS</span><span className="brand-sub">// Command Center</span></span>
            </div>
            <div className="topbar-right">
              <span className="status-pulse"><span className="dot" /> Live</span>
              <span className="topbar-divider" />
              <span className="identity">
                <span className="avatar">{meName ? meName[0].toUpperCase() : "?"}</span>
                Ingelogd als <b>{meName}</b>
              </span>
              <LogoutButton />
            </div>
          </div>
          <NavLinks isMatthias={matthias} scope="topbar" variant="horizontal" />
        </div>
        <PageTransition>{children}</PageTransition>
        <footer>FLOW SYSTEMS B.V. — INTERN GEBRUIK — NIET DELEN BUITEN KERNTEAM</footer>
      </div>
    </div>
  );
}
