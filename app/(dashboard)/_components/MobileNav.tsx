"use client";
import { useState } from "react";
import { NavLinks } from "./NavLinks";

export function MobileNav({ isMatthias }: { isMatthias: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="mobile-nav-btn" onClick={() => setOpen((o) => !o)} aria-label="Navigatie">☰</button>
      {open && (
        <div className="mobile-nav-popover">
          <NavLinks isMatthias={isMatthias} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
