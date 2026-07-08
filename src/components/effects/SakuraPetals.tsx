import { useEffect, useRef } from "react";

/**
 * SakuraPetals —— 日间模式的落樱背景（canvas）。
 *
 * - 仅在 html[data-scene-mode="day"] 时运行 rAF；夜间 / 页面不可见时暂停；
 * - 监听 scene-mode-change 自定义事件即时启停（配合 SceneModeCard 切换）；
 * - prefers-reduced-motion：不做下落动画，仅静态点缀几片；
 * - 与 Starfield 同层（z-index:1），显隐由 CSS 依据 data-scene-mode 控制。
 */
interface Petal {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  sway: number;
  swaySpeed: number;
  rot: number;
  vr: number;
  hue: number;
  alpha: number;
}

const PINKS = ["#ffd3e4", "#ffc0d8", "#ffb3d1", "#ffe0ec"];

export default function SakuraPetals() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const count = Math.round((isMobile ? 16 : 30) * (reduced ? 0.5 : 1));

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let petals: Petal[] = [];
    let raf = 0;
    let running = false;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    function makePetal(initial: boolean): Petal {
      return {
        x: rand(0, w),
        y: initial ? rand(0, h) : rand(-40, -8),
        r: rand(5, 11),
        vy: rand(0.35, 1.05),
        vx: rand(-0.35, 0.15),
        sway: rand(0, Math.PI * 2),
        swaySpeed: rand(0.008, 0.02),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.02, 0.02),
        hue: Math.floor(rand(0, PINKS.length)),
        alpha: rand(0.45, 0.85),
      };
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function build() {
      petals = Array.from({ length: count }, () => makePetal(true));
    }

    function drawPetal(p: Petal) {
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.globalAlpha = p.alpha;
      ctx!.fillStyle = PINKS[p.hue];
      // 花瓣形：两段贝塞尔组成的水滴
      ctx!.beginPath();
      ctx!.moveTo(0, -p.r);
      ctx!.bezierCurveTo(p.r * 0.9, -p.r * 0.5, p.r * 0.6, p.r * 0.7, 0, p.r);
      ctx!.bezierCurveTo(-p.r * 0.6, p.r * 0.7, -p.r * 0.9, -p.r * 0.5, 0, -p.r);
      ctx!.fill();
      ctx!.restore();
    }

    function frameStatic() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of petals) drawPetal(p);
    }

    function frame() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of petals) {
        p.sway += p.swaySpeed;
        p.x += p.vx + Math.sin(p.sway) * 0.6;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y - p.r > h) Object.assign(p, makePetal(false));
        if (p.x < -30) p.x = w + 20;
        if (p.x > w + 30) p.x = -20;
        drawPetal(p);
      }
      raf = requestAnimationFrame(frame);
    }

    function isDay() {
      return document.documentElement.dataset.sceneMode === "day";
    }

    function start() {
      if (running) return;
      running = true;
      if (reduced) {
        frameStatic();
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
      ctx!.clearRect(0, 0, w, h);
    }
    function sync() {
      if (isDay() && !document.hidden) start();
      else stop();
    }

    resize();
    build();
    sync();

    const onResize = () => {
      resize();
      build();
      if (running && reduced) frameStatic();
    };
    const onVisibility = () => sync();
    const onModeChange = () => sync();

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scene-mode-change", onModeChange);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scene-mode-change", onModeChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="sakura-canvas"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
}
