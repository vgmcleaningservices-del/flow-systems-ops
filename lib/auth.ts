import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { IDENTITY_COOKIE_NAME, verifyIdentityToken } from "@/lib/session";

// Server-only identity helpers voor Server Components / Route Handlers zonder
// een NextRequest bij de hand (die gebruiken getIdentity() uit lib/session.ts).
export async function getMe(): Promise<string | null> {
  return verifyIdentityToken(cookies().get(IDENTITY_COOKIE_NAME)?.value);
}

export function isMatthias(me: string | null): boolean {
  return me === "matthias";
}

// Voor gebruik in een route-group layout die alleen Matthias-only pagina's
// omvat -- redirect gebeurt vóór er data wordt opgehaald of JSX gerenderd,
// dus een niet-Matthias gebruiker ontvangt hier nooit meer de payload van.
export async function requireMatthias(): Promise<string> {
  const me = await getMe();
  if (!isMatthias(me)) redirect("/");
  return me!;
}
