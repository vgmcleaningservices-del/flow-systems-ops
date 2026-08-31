"use client";
import { AnimatePresence, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import * as motion from "motion/react-client";
import { useEffect, useState, type CSSProperties, type ElementType, type MouseEvent, type ReactNode } from "react";
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

// Alleen actief op precisie-hover-apparaten (muis) én als de gebruiker geen
// "verminderde beweging" heeft ingesteld -- useReducedMotion() dekt hier iets
// dat MotionConfig(reducedMotion="user") juist NIET dekt: rauwe
// useMotionValue/useTransform-waarden lopen niet via Motion's animate-pad,
// dus zonder deze check zou kantelen gewoon doorgaan voor wie dat uitzette.
function useTiltEnabled() {
  const reducedMotion = useReducedMotion();
  const [fineHover, setFineHover] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFineHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return fineHover && !reducedMotion;
}

// Losse prop-typering i.p.v. ComponentProps<typeof motion.div> -- met een
// vaste tag-keuze (motion.div OF motion.button, bepaald op runtime) kan
// TypeScript geen enkele propvorm meer garanderen die voor beide geldt
// (bv. onSubmit's event-type verschilt tussen de twee), dus dat leidde tot
// een build-fout. `rest` is hier bewust losjes getypeerd; de echte
// call-sites geven alleen className/variants/onClick/style/children door.
type TiltProps = { as?: "div" | "button"; style?: CSSProperties; [key: string]: unknown };

// Drop-in vervanging van de bestaande motion.div/motion.button op kaarten
// (.venture-chip, .crew-card, .app-card, .tile) -- geen extra wrapper, dus
// bestaande props zoals `variants`/`key` blijven gewoon werken. Bewust niet
// gebruikt op tabelrijen (reflowt de hele tabel per frame) of knoppen/nav-
// links (kantelen leest daar als bug, niet als feature).
export function TiltCard({ as = "div", style, ...rest }: TiltProps) {
  const enabled = useTiltEnabled();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-8, 8]);
  const Comp = (as === "button" ? motion.button : motion.div) as ElementType;

  if (!enabled) return <Comp style={style} {...rest} />;

  return (
    <Comp
      style={{ ...style, rotateX, rotateY, transformPerspective: 800 }}
      whileHover={{ y: -1 }}
      onMouseMove={(e: MouseEvent<HTMLElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      {...rest}
    />
  );
}
