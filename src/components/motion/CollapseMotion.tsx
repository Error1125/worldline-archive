import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/** Utility motion for accordions, drawers and compact admin sections. */
export default function CollapseMotion({ open, children, id }: { open: boolean; children: ReactNode; id?: string }) {
  const reduced = useReducedMotion() ?? false;
  return <AnimatePresence initial={false}>{open && <motion.div id={id} data-motion-owned="collapse" initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }} animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }} exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }} transition={{ duration: reduced ? 0.12 : 0.18, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}>{children}</motion.div>}</AnimatePresence>;
}
