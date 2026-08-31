"use client";
import Link from "next/link";
import { TiltCard } from "../_components/motion";

// Losse client-component nodig omdat TiltCard hooks gebruikt -- de rest van
// deze pagina blijft een Server Component.
export function BeheerShortcuts() {
  return (
    <div className="telemetry cols-2">
      <TiltCard className="app-card" style={{ padding: 0 }}>
        <Link href="/squad" style={{ display: "block", padding: "15px 16px", textDecoration: "none" }}>
          <span className="app-name">Squad Status →</span>
        </Link>
      </TiltCard>
      <TiltCard className="app-card" style={{ padding: 0 }}>
        <Link href="/tools" style={{ display: "block", padding: "15px 16px", textDecoration: "none" }}>
          <span className="app-name">Tools &amp; Abonnementen →</span>
        </Link>
      </TiltCard>
    </div>
  );
}
