import { requireMatthias } from "@/lib/auth";

// Bewaakt /prestaties, /uitbetalingen, /veto, /tools in één plek -- de
// redirect gebeurt hier, vóór enige data-fetch of JSX van de onderliggende
// pagina draait, dus een niet-Matthias gebruiker ontvangt nooit meer de
// payload van deze routes (i.t.t. de oude client-side JSX-verberging).
export default async function MatthiasOnlyLayout({ children }: { children: React.ReactNode }) {
  await requireMatthias();
  return <>{children}</>;
}
