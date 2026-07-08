/**
 * 主题参数：给 canvas / JS 特效层使用的颜色与密度配置。
 * Theme params consumed by the canvas / JS effect layers.
 */
export const starfieldTheme = {
  /** 星星颜色池：大部分冷白，少量青/粉点缀 */
  starColors: ["#dfe8ff", "#dfe8ff", "#dfe8ff", "#9fd4ff", "#4df0dd", "#ff9fd6"],
  meteorColor: "125, 181, 255",
  /** 桌面端三层星星数量（近 → 远），移动端自动乘以 mobileFactor */
  layerCounts: [26, 60, 110] as const,
  mobileFactor: 0.45,
  parallaxStrength: 14,
  /** 流星出现间隔（毫秒，随机区间） */
  meteorInterval: [7000, 16000] as const,
} as const;

export const danmakuTheme = {
  opacityRange: [0.1, 0.2] as const,
  durationRange: [20, 34] as const,
  fontSizeRange: [0.72, 0.95] as const,
  colors: ["#7db5ff", "#c08bff", "#4df0dd", "#93a0c8", "#ff9fd6"],
  /** 桌面端同时存在的最大弹幕数 / 移动端 */
  maxOnScreen: { desktop: 7, mobile: 3 },
  spawnEvery: [2600, 4800] as const,
} as const;

export const cursorTheme = {
  dotSize: 6,
  ringSize: 34,
  ringHoverScale: 1.6,
  lerp: 0.16,
} as const;

export const sparkTheme = {
  count: { desktop: 9, mobile: 6 },
  colors: ["#7db5ff", "#c08bff", "#4df0dd", "#ffd9ef"],
  life: 620,
} as const;
