import { useEffect, useRef } from "react";
import { sparkTheme } from "@/config/theme";

/**
 * 点击星屑（canvas 粒子）
 * - pointerdown 时在点击处扩散一圈星屑碎片
 * - 只在有粒子存活时运行 rAF；prefers-reduced-motion 时不启用
 */

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
}

export default function ClickSpark() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const count = isMobile ? sparkTheme.count.mobile : sparkTheme.count.desktop;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let shards: Shard[] = [];
    let raf = 0;
    let running = false;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(window.innerWidth * dpr);
      canvas!.height = Math.floor(window.innerHeight * dpr);
      canvas!.style.width = window.innerWidth + "px";
      canvas!.style.height = window.innerHeight + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawDiamond(s: Shard, alpha: number) {
      ctx!.save();
      ctx!.translate(s.x, s.y);
      ctx!.rotate(s.rot);
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = s.color;
      ctx!.shadowColor = s.color;
      ctx!.shadowBlur = 8;
      const d = s.size;
      ctx!.beginPath();
      ctx!.moveTo(0, -d);
      ctx!.lineTo(d, 0);
      ctx!.lineTo(0, d);
      ctx!.lineTo(-d, 0);
      ctx!.closePath();
      ctx!.fill();
      ctx!.restore();
    }

    function frame() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      shards = shards.filter((s) => s.life < s.max);
      for (const s of shards) {
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.05; // 轻微重力
        s.vx *= 0.98;
        s.vy *= 0.98;
        s.rot += s.vr;
        const alpha = 1 - s.life / s.max;
        drawDiamond(s, alpha);
      }
      ctx!.globalAlpha = 1;
      if (shards.length > 0) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }

    function burst(x: number, y: number) {
      const lifeFrames = Math.round(sparkTheme.life / 16);
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const speed = 1.6 + Math.random() * 2.6;
        shards.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 0,
          max: lifeFrames * (0.7 + Math.random() * 0.6),
          size: 2 + Math.random() * 2.5,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          color: sparkTheme.colors[(Math.random() * sparkTheme.colors.length) | 0],
        });
      }
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }

    const onDown = (e: PointerEvent) => burst(e.clientX, e.clientY);

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", onDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
}
