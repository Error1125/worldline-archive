import { useEffect, useRef } from "react";
import { starfieldTheme } from "@/config/theme";

/**
 * 星空背景（canvas）
 * - 三层星点：近层大而少、远层小而多，随鼠标轻微视差
 * - 星星闪烁 + 偶尔流星
 * - 移动端密度 x0.45；prefers-reduced-motion 时只画一帧静态星空
 * - 页面不可见时暂停 rAF
 */

interface Star {
  x: number;
  y: number;
  r: number;
  base: number;
  tw: number;
  phase: number;
  color: string;
  depth: number; // 视差深度 0..1
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  life: number;
  maxLife: number;
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const factor = isMobile ? starfieldTheme.mobileFactor : 1;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let meteors: Meteor[] = [];
    const pointer = { x: 0.5, y: 0.5 }; // 归一化
    const parallax = { x: 0, y: 0 };

    const colors = starfieldTheme.starColors;
    const [c0, c1, c2] = starfieldTheme.layerCounts;

    function build() {
      w = window.innerWidth;
      h = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars = [];
      const layers: Array<{ count: number; depth: number; rMin: number; rMax: number }> = [
        { count: Math.round(c0 * factor), depth: 1.0, rMin: 1.1, rMax: 2.2 },
        { count: Math.round(c1 * factor), depth: 0.55, rMin: 0.7, rMax: 1.4 },
        { count: Math.round(c2 * factor), depth: 0.25, rMin: 0.4, rMax: 0.9 },
      ];
      for (const layer of layers) {
        for (let i = 0; i < layer.count; i++) {
          const r = layer.rMin + Math.random() * (layer.rMax - layer.rMin);
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r,
            base: 0.35 + Math.random() * 0.5,
            tw: 0.6 + Math.random() * 1.6,
            phase: Math.random() * Math.PI * 2,
            color: colors[(Math.random() * colors.length) | 0],
            depth: layer.depth,
          });
        }
      }
    }

    function drawStar(s: Star, alpha: number) {
      const px = s.x + parallax.x * s.depth;
      const py = s.y + parallax.y * s.depth;
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = s.color;
      ctx!.beginPath();
      ctx!.arc(px, py, s.r, 0, Math.PI * 2);
      ctx!.fill();
      // 近层加一点光晕
      if (s.depth >= 1 && s.r > 1.4) {
        ctx!.globalAlpha = alpha * 0.25;
        ctx!.beginPath();
        ctx!.arc(px, py, s.r * 2.6, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function spawnMeteor() {
      const fromLeft = Math.random() > 0.4;
      const startX = fromLeft ? Math.random() * w * 0.4 : w * 0.6 + Math.random() * w * 0.4;
      const startY = Math.random() * h * 0.4;
      const speed = 6 + Math.random() * 5;
      const angle = (Math.PI / 5) * (0.7 + Math.random() * 0.6);
      meteors.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
        vy: Math.sin(angle) * speed,
        len: 120 + Math.random() * 120,
        life: 0,
        maxLife: 60 + Math.random() * 30,
      });
    }

    function drawMeteor(m: Meteor) {
      const tailX = m.x - (m.vx / Math.hypot(m.vx, m.vy)) * m.len;
      const tailY = m.y - (m.vy / Math.hypot(m.vx, m.vy)) * m.len;
      const grad = ctx!.createLinearGradient(m.x, m.y, tailX, tailY);
      const fade = 1 - m.life / m.maxLife;
      grad.addColorStop(0, `rgba(${starfieldTheme.meteorColor}, ${0.9 * fade})`);
      grad.addColorStop(1, `rgba(${starfieldTheme.meteorColor}, 0)`);
      ctx!.strokeStyle = grad;
      ctx!.lineWidth = 2;
      ctx!.lineCap = "round";
      ctx!.globalAlpha = 1;
      ctx!.beginPath();
      ctx!.moveTo(m.x, m.y);
      ctx!.lineTo(tailX, tailY);
      ctx!.stroke();
    }

    let raf = 0;
    let running = true;
    let musicOverlayPaused = false;
    let t = 0;
    let nextMeteorAt =
      performance.now() +
      starfieldTheme.meteorInterval[0] +
      Math.random() * (starfieldTheme.meteorInterval[1] - starfieldTheme.meteorInterval[0]);

    function frame(now: number) {
      ctx!.clearRect(0, 0, w, h);
      t += 0.016;
      // 视差缓动
      parallax.x += ((pointer.x - 0.5) * starfieldTheme.parallaxStrength - parallax.x) * 0.05;
      parallax.y += ((pointer.y - 0.5) * starfieldTheme.parallaxStrength - parallax.y) * 0.05;

      for (const s of stars) {
        const a = s.base + Math.sin(t * s.tw + s.phase) * 0.28;
        drawStar(s, Math.max(0.05, Math.min(1, a)));
      }

      if (now >= nextMeteorAt) {
        spawnMeteor();
        nextMeteorAt =
          now +
          starfieldTheme.meteorInterval[0] +
          Math.random() * (starfieldTheme.meteorInterval[1] - starfieldTheme.meteorInterval[0]);
      }
      meteors = meteors.filter((m) => m.life < m.maxLife && m.y < h + 40);
      for (const m of meteors) {
        m.x += m.vx;
        m.y += m.vy;
        m.life += 1;
        drawMeteor(m);
      }

      ctx!.globalAlpha = 1;
      if (running) raf = requestAnimationFrame(frame);
    }

    function drawStaticOnce() {
      ctx!.clearRect(0, 0, w, h);
      for (const s of stars) drawStar(s, s.base);
      ctx!.globalAlpha = 1;
    }

    const onResize = () => {
      build();
      if (reduced) drawStaticOnce();
    };
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX / w;
      pointer.y = e.clientY / h;
    };
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduced && !musicOverlayPaused && !running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    const onMusicOverlay = (event: Event) => {
      musicOverlayPaused = Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open);
      canvas.dataset.animationState = musicOverlayPaused ? "paused-by-music" : "running";
      if (musicOverlayPaused) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduced && !document.hidden && !running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };

    build();
    canvas.dataset.animationState = reduced ? "reduced" : "running";
    if (reduced) {
      drawStaticOnce();
    } else {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("wl:music-overlay", onMusicOverlay);
      raf = requestAnimationFrame(frame);
    }
    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("wl:music-overlay", onMusicOverlay);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="starfield-canvas"
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
