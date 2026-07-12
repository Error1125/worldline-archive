/**
 * Worldline Loader 主题（v5.4.1 Hotfix-03）。
 *
 * 单一来源：SiteLayout.astro 的 pre-hydration 静态占位帧与
 * WorldlineLoader.tsx（React 岛）都从这里读取，保证「首帧即世界线 Loader、
 * React 挂载后无缝接管」时 tag / 行文案完全一致。
 *
 * 主题的选取发生在 SiteLayout 的 head 内联脚本（paint 前），
 * 写入 <html data-wl-loader-theme="i">；静态帧用 CSS 选中对应 tag，
 * React 侧读取同一属性，两边永远是同一个主题。
 */

export interface WorldlineLoaderTheme {
  tag: string;
  lines: string[];
}

export const LOADER_THEMES: WorldlineLoaderTheme[] = [
  {
    tag: "WORLDLINE SHIFT",
    lines: ["checking divergence...", "worldline locked."],
  },
  {
    tag: "ARCHIVE BOOT",
    lines: ["mounting archive...", "loading memory fragments...", "observer connected."],
  },
  {
    tag: "SIGNAL DISPATCH",
    lines: ["sending signal...", "synchronizing records...", "archive stable."],
  },
];

/** 读取 head 脚本选好的主题下标（非法 / 缺失时回退 0，保证与静态帧一致）。 */
export function pickLoaderThemeIndex(raw: string | undefined): number {
  const i = Number(raw);
  return Number.isInteger(i) && i >= 0 && i < LOADER_THEMES.length ? i : 0;
}
