/**
 * 轻量格式化工具（纯函数，可在 .astro 与 island 中复用）。
 */

const DATE_FMT = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 2025/06/28 形式 */
export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return DATE_FMT.format(date).replace(/-/g, "/");
}

/** 相对时间：几天前 / 几小时前（用于 GitHub 活动等） */
export function formatRelative(d: Date | string, now: Date = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = now.getTime() - date.getTime();
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  if (hr < 24) return `${hr} 小时前`;
  if (day < 30) return `${day} 天前`;
  return formatDate(date);
}

/** 截断到指定字数，补省略号 */
export function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}
