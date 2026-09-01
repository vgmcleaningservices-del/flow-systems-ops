export const WARROOM_CHANNEL = "warroom";

// Alfabetisch sorteren zodat het adres van een 1-op-1 gesprek altijd hetzelfde
// is, ongeacht wie het gesprek start (laurens+seba geeft nooit twee kanalen).
export function dmChannel(a: string, b: string): string {
  return [a, b].sort().join("__");
}
