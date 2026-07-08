import { useEffect, useMemo, useState } from "react";
import { sceneBackgrounds, SCENE_CYCLE_MS } from "@/config/backgrounds";
import { withBase } from "@/lib/paths";

/**
 * SceneBackground —— 背景图轮播层（星空的下层）。
 *
 * 层级（自下而上）：
 *   .ia-nebula (z-0) → SceneBackground (z-0, DOM 靠后) → Starfield (z-1)
 *   → Danmaku (z-2) → 正文 (z-10)
 *
 * 行为：
 * - 预加载配置里的图片，加载失败的直接剔除；
 * - 一张都没有 / 全部失败 → 渲染 null，自动回退到现有星云 + 星空兜底；
 * - 每 SCENE_CYCLE_MS 淡入淡出切换（blur + scale 慢漂移）；
 * - 标签页隐藏时暂停计时；
 * - prefers-reduced-motion：只显示第一张，不轮播、不漂移；
 * - pointer-events: none，永不拦截交互。
 */
export default function SceneBackground() {
  const items = useMemo(
    () => sceneBackgrounds.map((it) => ({ ...it, url: withBase(it.src) })),
    [],
  );

  const [loaded, setLoaded] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  // 预加载 + 剔除失败项
  useEffect(() => {
    if (items.length === 0) return;
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    let alive = true;
    const ok: string[] = [];
    let pending = items.length;

    for (const it of items) {
      const img = new Image();
      img.onload = () => {
        ok.push(it.url);
        if (--pending === 0 && alive) {
          // 保持配置顺序
          setLoaded(items.map((x) => x.url).filter((u) => ok.includes(u)));
        }
      };
      img.onerror = () => {
        if (--pending === 0 && alive) {
          setLoaded(items.map((x) => x.url).filter((u) => ok.includes(u)));
        }
      };
      img.src = it.url;
    }
    return () => {
      alive = false;
    };
  }, [items]);

  // 轮播计时
  useEffect(() => {
    if (reduced || loaded.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % loaded.length);
    }, SCENE_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [reduced, loaded]);

  if (loaded.length === 0) return null; // 星空兜底

  const active = reduced ? 0 : index % loaded.length;

  return (
    <div className="scene-bg" aria-hidden="true">
      {loaded.map((url, i) => {
        const meta = items.find((it) => it.url === url);
        return (
          <img
            key={url}
            src={url}
            alt=""
            role="presentation"
            decoding="async"
            className={`scene-bg-img${i === active ? " is-on" : ""}`}
            data-mood={meta?.mood}
            draggable={false}
          />
        );
      })}
      {/* 深色遮罩：保证正文可读 */}
      <div className="scene-bg-shade" />
    </div>
  );
}
