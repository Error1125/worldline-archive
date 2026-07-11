import { forwardRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { reducedScenePreset, scenePresets, type MotionScene } from "@/lib/motion/presets";

interface Props {
  scene: MotionScene;
  layoutId: string;
  children: ReactNode;
  className?: string;
}

/**
 * Transform owner for a list item's outer layer. Hover and card visuals must
 * live inside this wrapper so Motion remains the only layout/enter/exit owner.
 */
const MotionItem = forwardRef<HTMLElement, Props>(function MotionItem({ scene, layoutId, children, className }, ref) {
  const reduced = useReducedMotion() ?? false;
  const preset = reduced ? reducedScenePreset(scene) : scenePresets[scene];
  return <motion.article ref={ref} layout layoutId={layoutId} data-motion-owned="layout" className={className} initial={preset.initial} animate={preset.animate} exit={{ ...preset.exit, transition: preset.exitTransition }} transition={preset.transition}>{children}</motion.article>;
});

export default MotionItem;
