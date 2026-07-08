import { useEffect, useRef } from "react";
import { cursorTheme } from "@/config/theme";

/**
 * 自定义鼠标指针（仅精准指针设备启用）
 * - 小圆点即时跟随 + 光环 lerp 延迟跟随
 * - hover 可点击元素时光环放大，按下时收缩
 * - 启用时给 <html> 加 .ia-cursor 隐藏系统光标
 * - 触屏设备不渲染；prefers-reduced-motion 时只保留圆点
 */

const HOVER_SELECTOR =
  "a, button, [role='button'], .clickable, input, textarea, select, label, summary";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (!finePointer) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    const dotEl = dot;
    const ringEl = ring;

    document.documentElement.classList.add("ia-cursor");

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { x: mouse.x, y: mouse.y };
    let hovering = false;
    let pressing = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      dotEl.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0) translate(-50%, -50%)`;
      if (reduced) {
        ringEl.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0) translate(-50%, -50%)`;
      }
      const target = e.target as Element | null;
      hovering = !!target && !!target.closest(HOVER_SELECTOR);
    };

    const onDown = () => {
      pressing = true;
    };
    const onUp = () => {
      pressing = false;
    };
    const onLeave = () => {
      dotEl.style.opacity = "0";
      ringEl.style.opacity = "0";
    };
    const onEnter = () => {
      dotEl.style.opacity = "1";
      ringEl.style.opacity = "1";
    };

    function tick() {
      ringPos.x += (mouse.x - ringPos.x) * cursorTheme.lerp;
      ringPos.y += (mouse.y - ringPos.y) * cursorTheme.lerp;
      const scale = pressing ? 0.7 : hovering ? cursorTheme.ringHoverScale : 1;
      ringEl.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%) scale(${scale})`;
      ringEl.style.borderColor = hovering
        ? "color-mix(in srgb, var(--ia-neon) 80%, transparent)"
        : "color-mix(in srgb, var(--ia-blue) 55%, transparent)";
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    if (!reduced) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.documentElement.classList.remove("ia-cursor");
    };
  }, []);

  const dotStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: cursorTheme.dotSize,
    height: cursorTheme.dotSize,
    borderRadius: "999px",
    background: "var(--ia-star)",
    boxShadow: "0 0 10px var(--ia-blue)",
    pointerEvents: "none",
    zIndex: 9999,
    transform: "translate(-50%,-50%)",
    transition: "opacity 0.2s ease",
  };
  const ringStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: cursorTheme.ringSize,
    height: cursorTheme.ringSize,
    borderRadius: "999px",
    border: "1px solid color-mix(in srgb, var(--ia-blue) 55%, transparent)",
    pointerEvents: "none",
    zIndex: 9999,
    transform: "translate(-50%,-50%)",
    transition: "opacity 0.2s ease, border-color 0.25s ease",
  };

  return (
    <>
      <div ref={ringRef} aria-hidden="true" style={ringStyle} />
      <div ref={dotRef} aria-hidden="true" style={dotStyle} />
    </>
  );
}
