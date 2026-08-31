// Vertaalt ruwe Git-commit-berichten naar een korte samenvatting in doodgewone
// ("jip-en-janneke") taal, voor wie niets met de code zelf kan -- Matthias las
// hier letterlijk niks van af. Best-effort: geen API key, netwerkfout, of een
// niet-2xx-antwoord levert gewoon null op, nooit een gegooide error -- de
// webhook die dit aanroept mag hier nooit op stuklopen.
export async function summarizeCommitsPlainDutch(
  ventureName: string | null,
  commits: { message: string; author: string; passTo: string | null }[]
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || commits.length === 0) return null;

  const lines = commits
    .map((c) => `- ${c.author}: ${c.message}${c.passTo ? ` (droeg dit over aan ${c.passTo})` : ""}`)
    .join("\n");
  const prompt = `Dit zijn ruwe Git-commit-berichten van het team${ventureName ? ` op de venture "${ventureName}"` : ""}:\n${lines}\n\nSchrijf hier één korte samenvatting van (max. 2 zinnen) in doodgewone, jip-en-janneke Nederlandse taal, voor iemand die geen programmeur is. Geen codetermen of jargon, geen commit-berichten letterlijk overnemen -- vertel gewoon in mensentaal wat er is gebeurd.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}
