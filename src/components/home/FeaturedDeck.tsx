import { useEffect, useRef, useState } from "react";

/**
 * FeaturedDeck —— 首页最大的内容入口：自动翻页的精选大卡。
 *
 * - 数据由 index.astro 在构建期聚合并序列化传入（href / image 已带好 base）；
 * - 自动切换（默认 7s），hover / focus / 触摸按住时暂停；
 * - dots 可点击，激活 dot 内有与切换周期同步的进度条；
 * - 指针在卡内移动时背景轻微视差，hover 时背景轻微放大；
 * - 支持左右滑动（pointer 事件，阈值 48px），滑动后抑制误触点击；
 * - 键盘 ← / → 切换；
 * - prefers-reduced-motion：不自动播放、无视差。
 */

export interface DeckItem {
  type: string;
  /** 例如 "POST // 文章" */
  typeLabel: string;
  title: string;
  summary: string;
  /** 已格式化的日期文本 */
  date: string;
  /** 已带 base 的链接 */
  href: string;
  /** 强调色（CSS 颜色值） */
  accent: string;
  /** 已带 base 的大图（可选；无图时用模式感知渐变场） */
  image?: string;
  /** v3：昼夜专用封面（已带 base）；有则按模式切换，缺省回退到 image */
  imageDay?: string;
  imageNight?: string;
  imageAlt?: string;
}

interface Props {
  items: DeckItem[];
  intervalMs?: number;
  className?: string;
}

export default function FeaturedDeck({ items, intervalMs = 7000, className = "" }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [cycle, setCycle] = useState(0); // 每次切换 +1，用于重启进度动画
  const rootRef = useRef<HTMLElement | null>(null);
  const drag = useRef({ x: 0, y: 0, active: false, moved: false });

  const count = items.length;

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // 自动切换
  useEffect(() => {
    if (reduced || paused || count < 2) return;
    const t = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % count);
      setCycle((c) => c + 1);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [reduced, paused, count, intervalMs]);

  const go = (i: number) => {
    setIndex(((i % count) + count) % count);
    setCycle((c) => c + 1);
  };

  // 视差：把指针位置写进 CSS 变量
  const onPointerMove = (e: React.PointerEvent) => {
    const el = rootRef.current;
    if (!el) return;
    if (drag.current.active && Math.abs(e.clientX - drag.current.x) > 8) {
      drag.current.moved = true;
    }
    if (reduced || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--dx", `${((e.clientX - r.left) / r.width - 0.5) * 2}`);
    el.style.setProperty("--dy", `${((e.clientY - r.top) / r.height - 0.5) * 2}`);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, active: true, moved: false };
    if (e.pointerType !== "mouse") setPaused(true);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current.active = false;
    if (e.pointerType !== "mouse") setPaused(false);
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(e.clientY - d.y)) {
      go(index + (dx < 0 ? 1 : -1));
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    // 刚滑动过 → 这次 click 是拖拽收尾，不要触发跳转
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  };

  if (count === 0) return null;

  return (
    <section
      ref={rootRef}
      className={`deck glass-card corner-ticks ${className}`}
      aria-roledescription="轮播"
      aria-label="精选存档"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        rootRef.current?.style.setProperty("--dx", "0");
        rootRef.current?.style.setProperty("--dy", "0");
      }}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current.active = false;
        setPaused(false);
      }}
      onClickCapture={onClickCapture}
      onKeyDown={onKeyDown}
    >
      {items.map((it, i) => {
        const active = i === index;
        // 昼夜封面解析：coverNight/coverDay 优先，其次共用 cover；两侧一致时只渲染一张
        const nightSrc = it.imageNight ?? it.image ?? it.imageDay;
        const daySrc = it.imageDay ?? it.image ?? it.imageNight;
        const hasImage = Boolean(nightSrc || daySrc);
        const modeSplit = hasImage && nightSrc !== daySrc;
        return (
          <a
            key={it.href + it.title}
            href={it.href}
            className={`deck-slide${active ? " is-active" : ""}${hasImage ? "" : " is-field"}`}
            style={{ ["--accent" as string]: it.accent }}
            aria-hidden={active ? undefined : "true"}
            tabIndex={active ? 0 : -1}
            draggable={false}
          >
            {/* 背景层：大图（可分昼夜）或模式感知渐变场，承载视差与缩放 */}
            <div className="deck-bg" aria-hidden="true">
              {modeSplit ? (
                <>
                  <img
                    className="deck-img deck-img-night"
                    src={nightSrc}
                    alt=""
                    draggable={false}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                  <img
                    className="deck-img deck-img-day"
                    src={daySrc}
                    alt=""
                    draggable={false}
                    loading="lazy"
                  />
                </>
              ) : hasImage ? (
                <img src={nightSrc} alt="" draggable={false} loading={i === 0 ? "eager" : "lazy"} />
              ) : (
                <div className="deck-field" />
              )}
            </div>
            <div className="deck-veil" aria-hidden="true" />

            {/* 前景内容 */}
            <div className="deck-content">
              <span className="status-badge deck-chip" style={{ ["--sb-c" as string]: it.accent }}>
                {it.typeLabel}
              </span>
              <h3 className="deck-title">{it.title}</h3>
              <p className="deck-summary">{it.summary}</p>
              <div className="deck-meta mono">
                <span>{it.date}</span>
                <span className="deck-arrow" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </span>
              </div>
            </div>
          </a>
        );
      })}

      {/* dots + 进度 */}
      {count > 1 && (
        <div className="deck-dots" role="tablist" aria-label="切换精选">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`第 ${i + 1} 张：${it.title}`}
              className={`deck-dot clickable${i === index ? " is-active" : ""}`}
              onClick={() => go(i)}
            >
              {i === index && !reduced && (
                <i
                  key={cycle}
                  className="deck-dot-fill"
                  style={{
                    animationDuration: `${intervalMs}ms`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
