import { useEffect, useRef, useState } from "react";
import { fullNav } from "@/config/nav";
import { withBase } from "@/lib/paths";

/**
 * MobileRadialMenu —— 移动端右下角展开式「全部入口」菜单（桌面隐藏）。
 *
 * 职责分工：底部 TabBar = 常用入口；本菜单 = 全部入口；/archive = 完整分类索引。
 * - 点击悬浮按钮向上绽开导航项（带轻微横向错位，呈放射观感）；
 * - 点击遮罩 / Esc / 选择条目后关闭；
 * - prefers-reduced-motion 时取消位移与逐项延迟，仅淡入淡出；
 * - 悬浮按钮上浮到 TabBar 之上（含安全区）。
 */
export default function MobileRadialMenu() {
  const [open, setOpen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Esc 关闭 + 路由切换后自动收起（持久化 island 不会重挂载，需手动监听）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onSwap = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    document.addEventListener("astro:after-swap", onSwap);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("astro:after-swap", onSwap);
    };
  }, []);

  const items = fullNav;

  return (
    <div ref={rootRef} className="radial-root md:hidden" data-open={open ? "true" : "false"}>
      {/* 遮罩 */}
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className="radial-scrim"
      />

      {/* 展开的导航项 */}
      <ul className="radial-items" role="menu" aria-label="全部入口">
        {items.map((item, i) => {
          const delay = reduced || !open ? 0 : (items.length - 1 - i) * 34;
          return (
            <li
              key={item.href}
              role="none"
              className="radial-item"
              style={{ transitionDelay: `${delay}ms` } as React.CSSProperties}
            >
              <a
                href={withBase(item.href)}
                role="menuitem"
                tabIndex={open ? 0 : -1}
                onClick={() => setOpen(false)}
                className="clickable radial-link"
              >
                <span className="radial-label">{item.label}</span>
                <span className="radial-en mono">{item.labelEn}</span>
              </a>
            </li>
          );
        })}
      </ul>

      {/* 悬浮触发按钮 */}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "关闭菜单" : "打开全部入口"}
        onClick={() => setOpen((v) => !v)}
        className="clickable radial-fab"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
