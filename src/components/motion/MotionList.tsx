import type { ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { layoutSpring, type MotionScene } from "@/lib/motion/presets";
import MotionItem from "@/components/motion/MotionItem";
import MotionPresence from "@/components/motion/MotionPresence";

interface Props<T> {
  id: string;
  scene: MotionScene;
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className?: string;
}

/** Shared pop-layout list shell: exiting items leave layout immediately while staying items spring into place. */
export default function MotionList<T>({ id, scene, items, getKey, renderItem, className }: Props<T>) {
  const reduced = useReducedMotion() ?? false;
  return <LayoutGroup id={id}><motion.div layout transition={reduced ? { duration: 0.12 } : layoutSpring} className={className}><MotionPresence>{items.map((item) => <MotionItem key={getKey(item)} scene={scene} layoutId={`${id}:${getKey(item)}`}>{renderItem(item)}</MotionItem>)}</MotionPresence></motion.div></LayoutGroup>;
}
