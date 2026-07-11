import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { scenePresets, type MotionScene } from "@/lib/motion/presets";

/** Page-local narrative entrance. It is deliberately never used around a MotionList item. */
export default function SceneMotion({ scene, children, className }: { scene: MotionScene; children: ReactNode; className?: string }) {
  const reduced = useReducedMotion() ?? false;
  const preset = scenePresets[scene];
  return <motion.div data-motion-owned="scene" className={className} initial={reduced ? { opacity: 0 } : preset.initial} animate={preset.animate} transition={reduced ? { duration: 0.12 } : preset.transition}>{children}</motion.div>;
}
