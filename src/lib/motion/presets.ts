import type { Transition } from "motion/react";

export type MotionScene = "moments" | "timeline" | "observation" | "anime" | "projects" | "photos" | "music" | "posts" | "bugs" | "search" | "admin";

export const motionTokens = {
  micro: 0.14,
  exit: 0.18,
  enter: 0.24,
  narrative: 0.56,
  maxStaggeredItems: 8,
  desktopStagger: 0.035,
  mobileStagger: 0.02,
} as const;

/** Shared list layout physics. Individual scene presets may override it only for a semantic reason. */
export const layoutSpring = { type: "spring" as const, stiffness: 165, damping: 24, mass: 0.85 };

export interface ScenePreset {
  initial: { opacity: number; x?: number; y?: number; scale?: number; filter?: string };
  animate: { opacity: number; x?: number; y?: number; scale?: number; filter?: string };
  exit: { opacity: number; x?: number; y?: number; scale?: number; filter?: string };
  transition: Transition;
  exitTransition?: Transition;
}

const enterSpring = { type: "spring" as const, stiffness: 175, damping: 23, mass: 0.82 };

export const scenePresets: Record<MotionScene, ScenePreset> = {
  moments: {
    initial: { opacity: 0, y: 20, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 8, scale: 0.96 },
    transition: { layout: layoutSpring, opacity: { duration: 0.2, ease: [0.22, 1, 0.36, 1] }, y: enterSpring, scale: enterSpring },
    exitTransition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
  timeline: {
    initial: { opacity: 0, y: 12, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 7, scale: 0.97 },
    transition: { layout: layoutSpring, opacity: { duration: motionTokens.enter }, y: enterSpring, scale: enterSpring },
  },
  observation: {
    initial: { opacity: 0.15, filter: "blur(3px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(2px)" },
    transition: { layout: layoutSpring, opacity: { duration: motionTokens.enter }, filter: { duration: motionTokens.enter } },
  },
  anime: {
    initial: { opacity: 0, scale: 0.98 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.97 },
    transition: { layout: layoutSpring, opacity: { duration: motionTokens.enter }, scale: enterSpring },
  },
  projects: {
    initial: { opacity: 0, y: 12, scale: 0.985 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 8, scale: 0.97 },
    transition: { layout: layoutSpring, opacity: { duration: motionTokens.enter }, y: enterSpring, scale: enterSpring },
  },
  photos: {
    initial: { opacity: 0, scale: 0.985 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.97 },
    transition: { layout: layoutSpring, opacity: { duration: motionTokens.enter }, scale: enterSpring },
  },
  music: {
    initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 7 },
    transition: { layout: layoutSpring, opacity: { duration: motionTokens.enter }, y: enterSpring },
  },
  posts: {
    initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 7 },
    transition: { layout: layoutSpring, opacity: { duration: motionTokens.enter }, y: enterSpring },
  },
  bugs: {
    initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 7 },
    transition: { layout: layoutSpring, opacity: { duration: motionTokens.enter }, y: enterSpring },
  },
  search: {
    initial: { opacity: 0.15, filter: "blur(3px)" }, animate: { opacity: 1, filter: "blur(0px)" }, exit: { opacity: 0, filter: "blur(2px)" },
    transition: { layout: layoutSpring, opacity: { duration: motionTokens.enter }, filter: { duration: motionTokens.enter } },
  },
  admin: {
    initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 4 },
    transition: { layout: { type: "spring", stiffness: 190, damping: 28, mass: 0.75 }, opacity: { duration: motionTokens.micro }, y: { duration: motionTokens.micro } },
  },
};

export function reducedScenePreset(scene: MotionScene): ScenePreset {
  const preset = scenePresets[scene];
  return { ...preset, initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 }, exitTransition: { duration: 0.12 } };
}
