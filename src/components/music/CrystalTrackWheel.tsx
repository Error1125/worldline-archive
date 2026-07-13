import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

export type CrystalWheelTrack = { id: string; title: string; artist: string; artworkUrl?: string };
export type CrystalWheelTelemetry = { rotationProgress: number; velocity: number };
export type CrystalWheelConfig = {
  bladeWidth: number; bladeHeight: number; bladeThickness: number; visibleBladeCount: number;
  angleStep: number; radiusY: number; radiusZ: number; perspective: number;
  rotateXFactor: number; horizontalDrift: number; subtleYaw: number; scaleStep: number; opacityStep: number; blurStep: number;
  pixelsPerItem: number; inertiaPower: number; friction: number; springStiffness: number; springDamping: number; springMass: number;
};
export const defaultCrystalWheelConfig: CrystalWheelConfig = {
  bladeWidth: 360, bladeHeight: 190, bladeThickness: 24, visibleBladeCount: 10,
  angleStep: .22, radiusY: 310, radiusZ: 382, perspective: 1120,
  rotateXFactor: 1.1, horizontalDrift: 14, subtleYaw: 3, scaleStep: .024, opacityStep: .075, blurStep: .22,
  pixelsPerItem: 150, inertiaPower: .42, friction: 310, springStiffness: 185, springDamping: 20, springMass: .78,
};

type Props = {
  tracks: CrystalWheelTrack[]; activeIndex: number; onActiveChange: (index: number) => void;
  artwork?: (track: CrystalWheelTrack) => ReactNode; className?: string; config?: CrystalWheelConfig;
  telemetry?: { current: CrystalWheelTelemetry };
};

const circularDistance = (index: number, progress: number, count: number) => ((index - progress + count / 2) % count + count) % count - count / 2;
const normalize = (value: number, count: number) => ((Math.round(value) % count) + count) % count;

function HorizontalCrystalBlade({ index, count, progress, select, config }: { index: number; count: number; progress: MotionValue<number>; select: (index: number) => void; config: CrystalWheelConfig }) {
  const offset = useTransform(progress, value => circularDistance(index, value, count));
  const angle = useTransform(offset, value => value * config.angleStep);
  // The wheel turns around its horizontal X axis: cards orbit vertically, not sideways.
  const x = useTransform(angle, value => Math.sin(value) * config.horizontalDrift);
  const y = useTransform(angle, value => Math.sin(value) * config.radiusY);
  const z = useTransform(angle, value => Math.cos(value) * config.radiusZ - config.radiusZ);
  const highlightX = useTransform(angle, value => `${Math.round(50 + Math.max(-28, Math.min(28, value / (config.angleStep * 4) * 28)))}%`);

  return <motion.button
    type="button"
    className="horizontal-crystal-blade"
    data-track-index={index}
    onClick={(event) => { event.stopPropagation(); select(index); }}
    aria-label={`Select track ${String(index + 1).padStart(2, "0")}`}
    style={{
      x,
      y,
      z,
      rotateX: useTransform(angle, value => -value * 57.3 * config.rotateXFactor),
      rotateY: useTransform(angle, value => Math.sin(value) * config.subtleYaw),
      rotateZ: 0,
      scale: useTransform(offset, value => Math.max(.64, 1 - Math.abs(value) * config.scaleStep)),
      opacity: useTransform(offset, value => Math.abs(value) > config.visibleBladeCount / 2 ? .04 : Math.max(.14, 1 - Math.abs(value) * config.opacityStep)),
      filter: useTransform(offset, value => `brightness(${Math.max(.55, 1.16 - Math.abs(value) * .08)}) saturate(${Math.max(.55, 1.18 - Math.abs(value) * .08)}) blur(${Math.max(0, Math.abs(value) - 3) * config.blurStep}px)`),
      zIndex: useTransform(offset, value => 100 - Math.round(Math.abs(value) * 10)),
      "--highlight-x": highlightX,
    } as never}
  >
    <i className="horizontal-crystal-refraction" />
    <i className="horizontal-crystal-glare" />
    <i className="horizontal-crystal-front-edge" />
    <i className="horizontal-crystal-side" />
    <i className="horizontal-crystal-glow" />
    <i className="horizontal-crystal-noise" />
    <span>{String(index + 1).padStart(2, "0")}</span>
  </motion.button>;
}

export default function CrystalTrackWheel({ tracks, activeIndex, onActiveChange, className = "", config = defaultCrystalWheelConfig, telemetry }: Props) {
  const progress = useMotionValue(activeIndex);
  const samples = useRef<{ y: number; progress: number; time: number }[]>([]);
  const wheelVelocity = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const moved = useRef(false);
  const pressedTrack = useRef<number | undefined>(undefined);
  const reducedMotion = useReducedMotion();

  useMotionValueEvent(progress, "change", value => { if (telemetry) telemetry.current.rotationProgress = value; });
  useEffect(() => () => { if (wheelTimer.current) clearTimeout(wheelTimer.current); }, []);

  if (!tracks.length) return null;
  const moveTo = (target: number, velocity = 0) => {
    const delta = Math.round(target - progress.get());
    const shortest = delta > tracks.length / 2 ? target - tracks.length : delta < -tracks.length / 2 ? target + tracks.length : target;
    onActiveChange(normalize(shortest, tracks.length));
    animate(progress, shortest, reducedMotion ? { duration: .16, ease: "easeOut" } : { type: "spring", stiffness: config.springStiffness, damping: config.springDamping, mass: config.springMass, velocity });
  };
  const settle = (velocity: number) => {
    const projected = progress.get() + velocity * .28;
    const target = Math.round(projected);
    onActiveChange(normalize(target, tracks.length));
    if (reducedMotion) return moveTo(target);
    const inertia = animate(progress, projected, { type: "inertia", velocity, power: config.inertiaPower, timeConstant: config.friction });
    void inertia.then(() => animate(progress, target, { type: "spring", stiffness: config.springStiffness, damping: config.springDamping, mass: config.springMass }));
  };

  return <div
    className={`crystal-wheel horizontal-crystal-wheel ${className}`}
    style={{ perspective: config.perspective, "--blade-width": `${config.bladeWidth}px`, "--blade-height": `${config.bladeHeight}px`, "--blade-thickness": `${config.bladeThickness}px` } as never}
    tabIndex={0}
    aria-label="Horizontal-axis crystal track wheel"
    onPointerDown={(event) => {
      event.preventDefault();
      moved.current = false;
      const blade = (event.target as Element).closest(".horizontal-crystal-blade");
      pressedTrack.current = blade ? Number(blade.getAttribute("data-track-index")) : undefined;
      samples.current = [{ y: event.clientY, progress: progress.get(), time: performance.now() }];
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      event.preventDefault();
      const start = samples.current[0]; const next = start.progress - (event.clientY - start.y) / config.pixelsPerItem;
      if (Math.abs(event.clientY - start.y) > 7) moved.current = true;
      progress.set(next); samples.current.push({ y: event.clientY, progress: next, time: performance.now() }); if (samples.current.length > 5) samples.current.shift();
    }}
    onPointerUp={(event) => {
      const first = samples.current[0]; const last = samples.current.at(-1);
      if (moved.current && first && last) { const velocity = (last.progress - first.progress) / Math.max(1, last.time - first.time) * 1000; if (telemetry) telemetry.current.velocity = velocity; settle(velocity); }
      else if (Number.isInteger(pressedTrack.current)) moveTo(pressedTrack.current as number);
      pressedTrack.current = undefined;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onWheel={(event) => { event.preventDefault(); wheelVelocity.current += event.deltaY / 180; if (telemetry) telemetry.current.velocity = wheelVelocity.current; progress.set(progress.get() + event.deltaY / 360); if (wheelTimer.current) clearTimeout(wheelTimer.current); wheelTimer.current = setTimeout(() => { settle(wheelVelocity.current); wheelVelocity.current = 0; }, 90); }}
    onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); moveTo(Math.round(progress.get()) - 1); } if (event.key === "ArrowDown") { event.preventDefault(); moveTo(Math.round(progress.get()) + 1); } }}
  >
    <div className="horizontal-crystal-stage">{tracks.map((track, index) => <HorizontalCrystalBlade key={track.id} index={index} count={tracks.length} progress={progress} select={moveTo} config={config} />)}</div>
    <div className="horizontal-crystal-controls"><button type="button" onClick={() => moveTo(Math.round(progress.get()) - 1)} aria-label="Previous track">↑</button><button type="button" onClick={() => moveTo(Math.round(progress.get()) + 1)} aria-label="Next track">↓</button></div>
  </div>;
}
