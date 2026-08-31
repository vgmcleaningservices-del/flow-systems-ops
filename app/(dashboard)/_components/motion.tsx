"use client";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";
import type { ReactNode } from "react";
import type { Variants } from "motion/react";

// Toegepast op bestaande containers/elementen zelf (tag omgezet naar
// motion.X, variants erop gespreid) -- geen extra wrapper-element, want
// sommige items (bv. .venture-chip) leunen op flex-sizing/scroll-snap als
// *direct* kind van hun container; een tussen-wrapper zou dat breken.
export const staggerContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

// Vervangt de instant {open && (...)} -blokken bij Pipeline/Taken/Wiki/Tools.
// `layout` zorgt dat een modus-wissel (view -> bewerken, andere hoogte) ook
// ná de open-animatie soepel opnieuw meet i.p.v. te knippen. Geen
// margin/padding/border hier -- die blijven op het bestaande .detail-inner-
// kind staan, dit element regelt alleen hoogte/opacity/overflow.
export function AnimatedDisclosure({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          layout
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
