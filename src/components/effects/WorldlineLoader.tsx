import { useEffect, useMemo, useState } from "react";
import { siteConfig } from "@/config/site";

/**
 * WorldlineLoader —— 首次进入站点的「世界线观测站启动」仪式。
 *
 * 规则：
 * - 只在同一浏览器 session 的第一次加载时播放（sessionStorage 记录）；
 *   站内路由跳转（View Transitions）不会重播（岛本身 transition:persist）。
 * - <html data-skip-loader> 存在时直接跳过（调试用）。
 * - prefers-reduced-motion：跳过整段动画。
 * - 总时长约 1.9s（1.2s～2.2s 区间内），随后 0.45s 淡出并卸载，绝不长期阻塞。
 * - 仅做「气质致敬」：文案与数字为本站自设彩蛋，不复制任何 IP 的 UI / 台词。
 */

const SESSION_KEY = "wl-loader-played";

interface LoaderTheme {
  tag: string;
  lines: string[];
}

const THEMES: LoaderTheme[] = [
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

const LINE_STEP = 340; // 每行出现间隔
const HOLD_AFTER = 620; // 最后一行出现后停留
const FADE_MS = 450;

type Phase = "hidden" | "show" | "leave";

export default function WorldlineLoader({ value }: { value?: string } = {}) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [shown, setShown] = useState(0); // 已显示的行数
  const theme = useMemo(() => THEMES[Math.floor(Math.random() * THEMES.length)], []);

  useEffect(() => {
    // —— 播放条件判定 ——
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* 隐私模式等场景拿不到 storage 时，也只播这一次（本组件持久化） */
    }
    if (document.documentElement.hasAttribute("data-skip-loader")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setPhase("show");
    document.documentElement.classList.add("wl-loading");

    const timers: number[] = [];
    theme.lines.forEach((_, i) => {
      timers.push(window.setTimeout(() => setShown(i + 1), 260 + i * LINE_STEP));
    });

    const total = 260 + theme.lines.length * LINE_STEP + HOLD_AFTER; // ≈ 1.6s ~ 2.0s
    timers.push(
      window.setTimeout(() => {
        setPhase("leave");
        document.documentElement.classList.remove("wl-loading");
      }, total),
    );
    timers.push(window.setTimeout(() => setPhase("hidden"), total + FADE_MS));

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      document.documentElement.classList.remove("wl-loading");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "hidden") return null;

  const totalMs = 260 + theme.lines.length * LINE_STEP + HOLD_AFTER;
  /* v5.0.2 §16.6：优先使用 SiteLayout 构建期注入的引擎值；缺省回退旧配置值 */
  const digits = (value ?? siteConfig.profile.worldline).split("");

  return (
    <div
      className={`wl-loader${phase === "leave" ? " is-leaving" : ""}`}
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
