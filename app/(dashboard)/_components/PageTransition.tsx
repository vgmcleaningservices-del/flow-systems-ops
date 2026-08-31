"use client";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig } from "motion/react";
import * as motion from "motion/react-client";

// reducedMotion="user" volgt de systeeminstelling prefers-reduced-motion --
// bestaande CSS-keyframes in dit project respecteren die al, Motion-animaties
// doen dat niet automatisch zonder deze wrapper.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
