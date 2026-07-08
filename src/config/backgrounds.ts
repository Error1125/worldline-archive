/**
 * 首页 / 全站背景图轮播配置。
 *
 * 约定：
 * - src 一律写「不带 base 的站内路径」（/images/backgrounds/xxx），
 *   渲染方（SceneBackground）会统一通过 withBase() 补上 GitHub Pages base；
 * - 外部 URL（http/https）不会被加 base（withBase 已处理）；
 * - 数组为空、或图片全部加载失败时，SceneBackground 什么都不渲染，
 *   自动回退到现有的星云渐变 + 星空 canvas 兜底。
 *
 * 想换成真实照片：把图片放进 public/images/backgrounds/，
 * 然后在下面的数组里增删条目即可，其他代码不用动。
 */

export interface SceneBackgroundItem {
  /** 站内路径（不带 base）或外部完整 URL */
  src: string;
  alt: string;
  mood: "night" | "city" | "rain" | "terminal" | "abstract";
  /** 该场景的点缀色（预留给未来按场景调整 UI 强调色） */
  accent?: string;
}

export const sceneBackgrounds: SceneBackgroundItem[] = [
  {
    src: "/images/backgrounds/bg-worldline-01.svg",
    alt: "深夜观测室——穹顶与月辉",
    mood: "night",
    accent: "#7db5ff",
  },
  {
    src: "/images/backgrounds/bg-worldline-02.svg",
    alt: "都市夜景——亮着灯的天际线",
    mood: "city",
    accent: "#c08bff",
  },
  {
    src: "/images/backgrounds/bg-worldline-03.svg",
    alt: "雨夜街道——雨丝与霓虹光斑",
    mood: "rain",
    accent: "#4df0dd",
  },
  {
    src: "/images/backgrounds/bg-worldline-04.svg",
    alt: "抽象世界线网格——分歧与收束",
    mood: "abstract",
    accent: "#ff9fd6",
  },
];

/** 轮播间隔（毫秒），规范要求 12s～18s */
export const SCENE_CYCLE_MS = 14000;
