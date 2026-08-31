"use client";
import { useReducedMotion, useScroll, useTransform } from "motion/react";
import * as motion from "motion/react-client";

// Zacht concentrisch-cirkelpatroon, geïnspireerd op wat er achter de
// telefoon-foto op mobit.framer.website staat -- puur decoratief
// (pointer-events:none), dashboard-breed via de gedeelde layout. Onder
// prefers-reduced-motion: geen scroll-koppeling, statische ringen.
export function AmbientBackground() {
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 600], [0, 40]);
  const y2 = useTransform(scrollY, [0, 600], [0, -30]);

  if (reducedMotion) {
    return (
      <div className="ambient-bg" aria-hidden="true">
        <div className="ambient-ring ambient-ring-1" />
        <div className="ambient-ring ambient-ring-2" />
        <div className="ambient-ring ambient-ring-3" />
      </div>
    );
  }

  return (
    <div className="ambient-bg" aria-hidden="true">
      <motion.div className="ambient-ring ambient-ring-1" style={{ y: y1 }} />
      <motion.div className="ambient-ring ambient-ring-2" style={{ y: y2 }} />
      <div className="ambient-ring ambient-ring-3" />
    </div>
  );
}
