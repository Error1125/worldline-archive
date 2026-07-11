import type { ReactNode } from "react";
import { AnimatePresence, useReducedMotion } from "motion/react";

interface Props { children: ReactNode; initial?: boolean; }

/**
 * One presence policy for all data lists. `popLayout` removes departing items
 * from document flow immediately while their visual exit completes above it.
 */
export default function MotionPresence({ children, initial }: Props) {
  const reduced = useReducedMotion() ?? false;
  return <AnimatePresence mode="popLayout" initial={initial ?? !reduced}>{children}</AnimatePresence>;
}
