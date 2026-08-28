# Flow Systems — Command Center (live webapp)

Dit is de "echte" versie van het Command Center: een gehoste website die automatisch
bijwerkt zodra iemand een commit pusht met `[PASS:NAAM]` erin. Geen Claude-artifact
sandbox meer, dus geen klik-om-te-updaten — GitHub → webhook → database → dashboard,
zonder mensenhand.

Stack: Next.js (App Router) op Vercel + Supabase (database, auth-loos, met Realtime)
+ een GitHub-webhook per dochterbedrijf-repo. Alles hieronder is gratis-tier.

Reken op **30-45 minuten** voor de eerste keer, éénmalig. Volg de stappen in volgorde.

---

## 0. Wat je nodig hebt

- Een GitHub-account (jullie hebben dit al voor de dochterbedrijf-repo's)
- Een gratis Supabase-account: https://supabase.com
- Een gratis Vercel-account: https://vercel.com (kan inloggen met je GitHub-account)

## 1. Supabase — database opzetten

1. Ga naar https://supabase.com/dashboard → **New project**. Kies een naam (bv. `flow-systems-ops`) en een wachtwoord (bewaar dat, niet nodig hierna maar Supabase vraagt het).
2. Zodra het project klaar is: ga naar **SQL Editor** → **New query**.
3. Open [supabase/schema.sql](supabase/schema.sql) uit deze map, kopieer de volledige inhoud, plak in de SQL Editor, klik **Run**.
   Dit maakt alle tabellen aan (`crew`, `pipeline`, `commits`, `directives`, `telemetry`), zet de standaard-data erin (Laurens/Seba/Runar/Zende, SupplierSync/Tendertox/CartRescue/DisputeNuke), en schakelt Realtime in.
4. Ga naar **Project Settings → API**. Je hebt straks drie waarden nodig:
   - `Project URL` → dit wordt `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → dit wordt `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (klik "Reveal") → dit wordt `SUPABASE_SERVICE_ROLE_KEY` — **dit is een geheime sleutel, deel hem nooit publiek en zet hem nooit in een `NEXT_PUBLIC_`-variabele.**

## 2. Code naar GitHub

Deze map (`03-Ops-Webapp`) is al een lokale git-repo met één commit erin — op zichzelf
staand, hoort niet bij een eventuele vault-repo. Nog te doen: een lege repo op GitHub
aanmaken en pushen.

Maak op GitHub een nieuwe, **private** repo (bv. `flow-systems-ops`), zonder README/`.gitignore`
(die heb je al), en volg de instructies die GitHub toont onder "…or push an existing repository":

```bash
git remote add origin https://github.com/<jouw-org>/flow-systems-ops.git
git branch -M main
git push -u origin main
```

## 3. Vercel — deployen

1. Ga naar https://vercel.com/new, kies **Import Git Repository**, selecteer `flow-systems-ops`.
2. Bij **Environment Variables**, voeg toe (uit stap 1 en zelf te verzinnen):

   | Naam | Waarde |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | uit Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | uit Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | uit Supabase (geheim) |
   | `TEAM_ACCESS_CODE` | een code die je hele team gebruikt om in te loggen, bv. `flowsystems2026` |
   | `SESSION_SECRET` | een lange willekeurige string — genereer er een met `openssl rand -hex 32`, of typ zelf 40+ willekeurige tekens |
   | `GITHUB_WEBHOOK_SECRET` | nog een willekeurige string — deze plak je zo dadelijk óók in elke GitHub-webhook |

3. Klik **Deploy**. Na ~1 minuut krijg je een URL zoals `https://flow-systems-ops.vercel.app`.

## 4. GitHub-usernames koppelen (voor commit-attributie)

Zodat een commit van Laurens ook echt zijn kaart bijwerkt, moet Supabase weten welk
GitHub-account bij welke naam hoort.

1. Supabase-dashboard → **Table Editor** → tabel `crew`.
2. Vul per rij de kolom `github_username` in met het GitHub-account (kleine letters, zonder `@`)
   van Laurens, Seba, Runar en Zende.

Zonder dit werkt de webhook nog steeds (commits worden gelogd), maar de "wie is de
eigenaar"-status wordt dan alleen bijgewerkt via het `[PASS:NAAM]`-doel, niet via wie
er pushte.

## 5. De webhook — per dochterbedrijf-repo

Doe dit voor elke repo waarvan je de commits wil volgen (begin met SupplierSync):

1. Ga in die repo naar **Settings → Webhooks → Add webhook**.
2. **Payload URL**: `https://<jouw-vercel-domein>/api/github-webhook`
3. **Content type**: `application/json`
4. **Secret**: exact dezelfde string als `GITHUB_WEBHOOK_SECRET` in Vercel (stap 3).
5. **Which events**: kies "Just the push event."
6. Save. GitHub stuurt meteen een test-ping — die wordt genegeerd door de app (alleen `push`-events tellen), dat is normaal.

## 6. Inloggen

Ga naar je Vercel-URL, log in met de `TEAM_ACCESS_CODE`, en kies je naam rechtsboven.
Stuur de URL en de code naar Laurens, Runar, Seba en Zende.

## Hoe de automatische kant werkt

Zet in een commit-message een tag zoals:

```
git commit -m "webhook logic voor Make.com sync [PASS:SEBA]"
git push
```

Zodra dat gepusht wordt:

- De commit verschijnt meteen onderaan bij "Recente Git-activiteit" (voor iedereen, live, geen refresh nodig).
- De persoon die pushte gaat op **Wachtend** met een PASS-notitie.
- **Seba** (het `[PASS:...]`-doel) wordt automatisch de nieuwe **Active Bottleneck** — de rode "Huidige code-eigenaar"-balk bovenaan wijst voortaan naar hem.

Push je zonder `[PASS:...]`-tag, dan wordt alleen de pusher op **Actief** gezet met de
commit-boodschap als taak — geen eigenaarswissel.

Alles wat niet via Git gaat (MRR, sprint-klok, pipeline-fases, VETO's) blijft handmatig
bewerkbaar in het dashboard zelf, met dezelfde knoppen als voorheen.

## Lokaal ontwikkelen (optioneel)

Node.js was niet geïnstalleerd op deze laptop tijdens het bouwen, dus dit is niet
getest met een echte `npm run build`. Als je lokaal wil testen voordat je pusht:

```bash
npm install
cp .env.example .env.local   # vul in met dezelfde waarden als in Vercel
npm run dev
```

## Eerlijkheid over de scope

- **Login is één gedeelde teamcode**, geen individuele accounts. Prima voor een team
  van vier-vijf mensen die elkaar vertrouwen; niet iets om uit te breiden naar klanten
  of externe partijen zonder een echt auth-systeem (bv. Supabase Auth met magic links).
- **RLS staat op "iedereen met de anon-key mag lezen."** Schrijven kan alleen via de
  API-routes met de service-role key, die achter de teamcode-cookie zitten. Voor
  interne bedrijfscijfers is dat een redelijke afweging; het is geen bank-grade setup.
- Elke dochterbedrijf-repo heeft zijn **eigen** webhook naar dezelfde Vercel-app — dat
  past bij de Exit Isolatie-regel (1 repo per app blijft 1 repo), het dashboard is
  gewoon de plek waar alle seintjes samenkomen.
