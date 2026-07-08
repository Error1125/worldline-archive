export interface SceneBackgroundItem {
  src: string;
  alt: string;
  mood: "night" | "city" | "rain" | "terminal" | "abstract" | "sakura" | "dawn";
  accent?: string;
}

export const sceneBackgrounds: SceneBackgroundItem[] = [
  {
    src: "/images/backgrounds/bg-worldline-01.svg",
    alt: "deep night worldline observatory",
    mood: "night",
    accent: "#7db5ff",
  },
  {
    src: "/images/backgrounds/bg-worldline-02.svg",
    alt: "city lights under a night sky",
    mood: "city",
    accent: "#c08bff",
  },
  {
    src: "/images/backgrounds/bg-worldline-03.svg",
    alt: "rainy night archive signal",
    mood: "rain",
    accent: "#4df0dd",
  },
  {
    src: "/images/backgrounds/bg-worldline-04.svg",
    alt: "abstract worldline grid",
    mood: "abstract",
    accent: "#ff9fd6",
  },
];

export const daySceneBackgrounds: SceneBackgroundItem[] = [
  {
    src: "/images/backgrounds/bg-sakura-soft-01.svg",
    alt: "soft sakura dawn background",
    mood: "sakura",
    accent: "#ff75b7",
  },
  {
    src: "/images/backgrounds/bg-sakura-soft-02.svg",
    alt: "soft sakura afternoon background",
    mood: "dawn",
    accent: "#7b6dff",
  },
];

export const SCENE_CYCLE_MS = 14000;
