import { useEffect, useRef } from "react";
import { danmakuTheme } from "@/config/theme";
import { danmakuMessages } from "@/config/danmaku";

/**
 * 背景弹幕（DOM 命令式生成，动画由 global.css 的 .danmaku-item 驱动）
 * - 低透明度，只做氛围，pointer-events: none 不影响操作
 * - 移动端同屏数量减少；标签页隐藏时暂停生成
 * - prefers-reduced-motion 时整层不渲染
 */
export default function DanmakuBackground() {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const max = isMobile ? danmakuTheme.maxOnScreen.mobile : danmakuTheme.maxOnScreen.desktop;

    let alive = 0;
    let timer = 0;
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const pick = <T,>(arr: readonly T[]): T => arr[(Math.random() * arr.length) | 0];

    function spawn() {
      if (document.hidden || alive >= max || !layer) return;
      const el = document.createElement("span");
      el.className = "danmaku-item";
      el.textContent = pick(danmakuMessages);

      const dur = rand(danmakuTheme.durationRange[0], danmakuTheme.durationRange[1]);
      const op = rand(danmakuTheme.opacityRange[0], danmakuTheme.opacityRange[1]);
      const size = rand(danmakuTheme.fontSizeRange[0], danmakuTheme.fontSizeRange[1]);
      const color = pick(danmakuTheme.colors);

      // 竖直位置：避开顶部 header 与底部导航
      const top = rand(8, 82);
      el.style.top = top + "vh";
      el.style.setProperty("--dm-duration", dur + "s");
      el.style.setProperty("--dm-opacity", op.toFixed(2));
      el.style.setProperty("--dm-size", size.toFixed(2));
      el.style.setProperty("--dm-color", color);

      alive++;
      el.addEventListener(
        "animationend",
        () => {
          el.remove();
          alive--;
        },
        { once: true }
      );
      layer.appendChild(el);
    }

    function loop() {
      spawn();
      timer = window.setTimeout(loop, rand(danmakuTheme.spawnEvery[0], danmakuTheme.spawnEvery[1]));
    }

    // 起步先撒几条，避免开局空荡
    spawn();
    timer = window.setTimeout(loop, 1200);

    const onVisibility = () => {
      if (!document.hidden) {
        // 恢复时补一条
        spawn();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (layer) layer.innerHTML = "";
    };
  }, []);

  return <div ref={layerRef} className="danmaku-layer" aria-hidden="true" />;
}
