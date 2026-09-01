import { getMe, isMatthias } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { PEOPLE_NAME } from "@/lib/dashboard-constants";
import type { Crew } from "@/lib/dashboard-types";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationSettings } from "./NotificationSettings";
import { BeheerShortcuts } from "./BeheerShortcuts";
import { LogoutButton } from "../_components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function InstellingenPage() {
  const me = await getMe();
  const matthias = isMatthias(me);
  const meName = me ? (PEOPLE_NAME[me] ?? me) : "";

  const db = supabaseAdmin();
  const { data: crewRow } = me ? await db.from("crew").select("*").eq("id", me).maybeSingle() : { data: null };
  const crew = crewRow as Crew | null;
  const subtitle = crew ? `${crew.role} · ${crew.rank}` : matthias ? "CEO — Flow Systems" : "";

  return (
    <>
      <div className="section-head"><span className="section-title">Instellingen</span></div>
      <p className="section-sub">Persoonlijke voorkeuren voor dit Command Center</p>

      <div className="app-card" style={{ maxWidth: 420 }}>
        <div className="app-name" style={{ marginBottom: 10 }}>Profiel</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="avatar avatar-lg">{meName ? meName[0].toUpperCase() : "?"}</span>
          <div>
            <div style={{ fontWeight: 650, color: "var(--text)" }}>{meName}</div>
            {subtitle && <div className="section-sub" style={{ margin: 0 }}>{subtitle}</div>}
          </div>
        </div>
      </div>

      <div className="app-card" style={{ maxWidth: 420 }}>
        <div className="app-name" style={{ marginBottom: 10 }}>Thema</div>
        <ThemeToggle />
        <p className="section-sub" style={{ marginTop: 10, marginBottom: 0 }}>
          &quot;Systeem&quot; volgt de donker/licht-instelling van je apparaat.
        </p>
      </div>

      <div className="app-card" style={{ maxWidth: 420 }}>
        <div className="app-name" style={{ marginBottom: 10 }}>Notificaties</div>
        <NotificationSettings />
      </div>

      <div className="app-card" style={{ maxWidth: 420 }}>
        <div className="app-name" style={{ marginBottom: 10 }}>Sessie</div>
        <p className="section-sub" style={{ margin: "0 0 12px" }}>Je blijft 30 dagen ingelogd op dit apparaat, tenzij je zelf uitlogt.</p>
        <LogoutButton />
      </div>

      <div className="app-card" style={{ maxWidth: 420 }}>
        <div className="app-name" style={{ marginBottom: 6 }}>Over</div>
        <p className="section-sub" style={{ margin: 0 }}>
          Flow Systems Command Center — intern dashboard voor pipeline, taken, chat en financieel overzicht van alle ventures.
        </p>
      </div>

      {matthias && (
        <>
          <div className="section-head"><span className="section-title">Beheer</span></div>
          <p className="section-sub">Kortpaden naar de onderdelen die je het vaakst beheert</p>
          <BeheerShortcuts />
        </>
      )}
    </>
  );
}
