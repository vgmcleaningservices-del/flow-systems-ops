import { getMe, isMatthias } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";
import { BeheerShortcuts } from "./BeheerShortcuts";

export const dynamic = "force-dynamic";

export default async function InstellingenPage() {
  const me = await getMe();
  const matthias = isMatthias(me);

  return (
    <>
      <div className="section-head"><span className="section-title">Instellingen</span></div>
      <p className="section-sub">Persoonlijke voorkeuren voor dit Command Center</p>

      <div className="app-card" style={{ maxWidth: 420 }}>
        <div className="app-name" style={{ marginBottom: 10 }}>Thema</div>
        <ThemeToggle />
        <p className="section-sub" style={{ marginTop: 10, marginBottom: 0 }}>
          &quot;Systeem&quot; volgt de donker/licht-instelling van je apparaat.
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
