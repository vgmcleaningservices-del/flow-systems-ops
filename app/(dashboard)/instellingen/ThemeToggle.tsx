"use client";
import { useEffect, useState } from "react";

type ThemeChoice = "system" | "light" | "dark";
const STORAGE_KEY = "flowsys-theme";

function applyTheme(choice: ThemeChoice) {
  if (choice === "system") {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(STORAGE_KEY);
  } else {
    document.documentElement.dataset.theme = choice;
    localStorage.setItem(STORAGE_KEY, choice);
  }
}

export function ThemeToggle() {
  // "system" is the correct default for both server and first client render --
  // reading localStorage during render would desync SSR from the real stored
  // value and trigger a hydration-mismatch warning. The inline script in
  // layout.tsx already applied the right CSS before paint; this just needs to
  // reflect the right selected state a frame after mount.
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setChoice(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Thema">
      {(["system", "light", "dark"] as const).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={choice === c}
          className={"theme-toggle-btn" + (choice === c ? " active" : "")}
          onClick={() => { setChoice(c); applyTheme(c); }}
        >
          {c === "system" ? "Systeem" : c === "light" ? "Licht" : "Donker"}
        </button>
      ))}
    </div>
  );
}
