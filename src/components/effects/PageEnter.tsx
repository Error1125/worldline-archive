import { useEffect } from "react";

/**
 * PageEnter —— 路由切换时的「页面进场扫光」。
 *
 * - 监听 Astro View Transitions 的 `astro:after-swap`，
 *   给 `.page-sweep` 重新触发 `.run` 动画（强制 reflow）。
 * - prefers-reduced-motion 下完全不动。
 * - 自身不渲染任何可见 DOM（扫光条由 SiteLayout 里的 .page-sweep 承载）。
 */
export default function PageEnter() {
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const run = () => {
      const el = document.querySelector<HTMLElement>(".page-sweep");
      if (!el) return;
      el.classList.remove("run");
      // 强制 reflow，让动画可以重新播放
      void el.offsetWidth;
      el.classList.add("run");
    };

    // 首帧也来一次
    document.addEventListener("astro:after-swap", run);
    return () => document.removeEventListener("astro:after-swap", run);
  }, []);

  return null;
}
