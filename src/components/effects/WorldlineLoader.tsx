import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import { LOADER_THEMES, pickLoaderThemeIndex } from "./worldlineLoaderThemes";

/**
 * WorldlineLoader —— 首次进入站点的「世界线观测站启动」仪式。
 *
 * v5.4.1 Hotfix-03：与 SiteLayout 的 pre-hydration 静态占位帧（#wl-boot）
 * 合并为一套流程，全程只有一个世界线 Loader，由单一状态机控制：
 *
 *   head 脚本（paint 前）：
 *     判定是否播放 → 选主题 → <html data-loader-state="pending"
 *     data-wl-loader-theme="i">，静态帧 #wl-boot 呈现 Loader 第一帧
 *     （tag / 标题 / 世界线数值 / 空进度条），锁定滚动、隐藏正文；
 *   React 挂载（本组件，client:only）：
 *     渲染同一视觉的第一帧并置 data-loader-hydrated="1" —— 静态帧在同一
 *     绘制帧内被 CSS 隐藏，接管无缝、不重播、不出现第二套通用加载条；
 *     随后驱动进度条填充、状态行逐行出现、平滑退场；
 *   完成：
 *     data-loader-state="complete" 触发正文进场 → 淡出卸载 → 清理
 *     data-* 状态 / 滚动锁 / 定时器（sessionStorage 播放标记保留，
 *     保证同一会话返回首页 / 刷新不重播）。
 *
 * 其余规则不变：
 * - 只在同一浏览器 session 的第一次进入首页时播放（sessionStorage 记录）；
 *   站内路由跳转（View Transitions）不会重播（岛本身 transition:persist）；
 *   Admin 控制台使用独立布局，不加载本组件；
 * - <html data-skip-loader> 存在时直接跳过（调试用）；
 * - prefers-reduced-motion：不再整段跳过，而是快速淡入淡出的完整帧
 *   （无逐行动画 / 无进度填充），与静态帧同样视觉；
 * - hydration 迟迟不来时，head 脚本的兜底计时器会强制放行页面，
 *   绝不长期阻塞；
 * - 仅做「气质致敬」：文案与数字为本站自设彩蛋，不复制任何 IP 的 UI / 台词。
 */

const SESSION_KEY = "wl-loader-played";

const LINE_STEP = 340; // 每行出现间隔
const HOLD_AFTER = 620; // 最后一行出现后停留
const FADE_MS = 450;
const REDUCED_HOLD = 520; // reduced-motion：完整帧短暂停留
const REDUCED_FADE = 240; // reduced-motion：快速淡出
const CLEANUP_GRACE = 900; // 等 .wl-app 进场动画（--motion-slow 420ms）跑完再摘状态

type Phase = "hidden" | "show" | "leave";

/** 完成 / 中断后的统一清理：data 状态、滚动锁、（间接的）pointer-events。 */
function releaseDocument() {
  const root = document.documentElement;
  delete root.dataset.loaderState;
  delete root.dataset.loaderHydrated;
  delete root.dataset.wlLoaderTheme;
  delete root.dataset.wlLoaderMotion;
  root.classList.remove("wl-loading");
}

function markPlayed() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* 隐私模式拿不到 storage：本组件 transition:persist，本会话也只播这一次 */
  }
}

export default function WorldlineLoader({ value }: { value?: string } = {}) {
  /* 挂载即判定（client:only，首次 render 就发生在浏览器）：
     只有 head 脚本标记了 pending 才接管播放，其余情况保持 hidden。 */
  const boot = useMemo(() => {
    const root = document.documentElement;
    const pending = root.dataset.loaderState === "pending";
    const skip = root.hasAttribute("data-skip-loader");
    const reduced =
      root.dataset.wlLoaderMotion === "reduced" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return {
      play: pending && !skip,
      abort: pending && skip,
      reduced,
      themeIdx: pickLoaderThemeIndex(root.dataset.wlLoaderTheme),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const theme = LOADER_THEMES[boot.themeIdx];
  const [phase, setPhase] = useState<Phase>(boot.play ? "show" : "hidden");
  const [shown, setShown] = useState(boot.reduced ? theme.lines.length : 0);
  const finishedRef = useRef(false);

  /* 无缝接管：在绘制前隐藏静态占位帧（同一帧内两者视觉一致 → 无闪烁）。 */
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (boot.abort) {
      // data-skip-loader 调试通道：立刻放行页面并清理
      root.dataset.loaderState = "complete";
      releaseDocument();
      return;
    }
    if (!boot.play) return;
    root.dataset.loaderHydrated = "1";
    root.classList.add("wl-loading");
    markPlayed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!boot.play) return undefined;
    finishedRef.current = false; // effect 可能被重复调用（严格模式等）：每次进入都重置
    const root = document.documentElement;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setPhase("leave");
      root.classList.remove("wl-loading");
      root.dataset.loaderState = "complete"; // 正文开始进场
    };

    if (boot.reduced) {
      /* reduced-motion：完整帧快速淡入淡出 */
      later(finish, REDUCED_HOLD);
      later(() => setPhase("hidden"), REDUCED_HOLD + REDUCED_FADE);
      later(releaseDocument, REDUCED_HOLD + REDUCED_FADE + CLEANUP_GRACE);
    } else {
      theme.lines.forEach((_, i) => {
        later(() => setShown(i + 1), 260 + i * LINE_STEP);
      });
      const total = 260 + theme.lines.length * LINE_STEP + HOLD_AFTER; // ≈ 1.6s ~ 2.0s
      later(finish, total);
      later(() => setPhase("hidden"), total + FADE_MS);
      later(releaseDocument, total + FADE_MS + CLEANUP_GRACE);
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      // 组件被卸载（极端场景）时不留下锁死状态
      if (!finishedRef.current) {
        finishedRef.current = true;
        root.dataset.loaderState = "complete";
      }
      releaseDocument();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "hidden") return null;

  const totalMs = boot.reduced ? REDUCED_HOLD : 260 + theme.lines.length * LINE_STEP + HOLD_AFTER;
  /* v5.0.2 §16.6：优先使用 SiteLayout 构建期注入的引擎值；缺省回退旧配置值 */
  const digits = (value ?? siteConfig.profile.worldline).split("");

  return (
    <div
      className={`wl-loader${phase === "leave" ? " is-leaving" : ""}${boot.reduced ? " is-reduced" : ""}`}
      role="status"
      aria-label="正在进入世界线观测站"
    >
      <div className="wl-loader-scanlines" aria-hidden="true" />

      <div className="wl-loader-core">
        <span className="wl-loader-tag mono">{theme.tag}</span>

        <h1 className="wl-loader-title" data-text="WORLDLINE ARCHIVE">
          WORLDLINE ARCHIVE
        </h1>
        <p className="wl-loader-sub mono">INITIALIZING OBSERVATION SYSTEM</p>

        <div className="wl-loader-divergence mono" aria-hidden="true">
          {digits.map((d, i) => (
            <span
              key={i}
              className={d !== "." && i % 3 === 1 ? "wl-flicker" : undefined}
              style={{ animationDelay: `${(i * 137) % 900}ms` }}
            >
              {d}
            </span>
          ))}
        </div>

        <div
          className="wl-loader-bar"
          style={{ ["--wl-total" as string]: `${totalMs}ms` }}
          aria-hidden="true"
        >
          <i />
        </div>

        <div className="wl-loader-lines mono" aria-hidden="true">
          {theme.lines.map((line, i) => (
            <p
              key={line}
              className={i < shown ? "is-in" : undefined}
              data-last={i === theme.lines.length - 1 ? "true" : undefined}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
