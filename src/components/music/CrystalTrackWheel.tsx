import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

export type CrystalWheelTrack = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
};

type Props = {
  tracks: CrystalWheelTrack[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  artwork?: (track: CrystalWheelTrack) => ReactNode;
  className?: string;
};

const step = Math.PI / 5.8;
const radiusX = 370;
const radiusZ = 490;
const verticalDrop = 90;
const pixelsPerItem = 150;

const circularDistance = (index: number, progress: number, count: number) => ((index - progress + count / 2) % count + count) % count - count / 2;
const normalize = (value: number, count: number) => ((Math.round(value) % count) + count) % count;

function CrystalBlade({ index, track, count, progress, select, artwork }: {
  index: number;
  track: CrystalWheelTrack;
  count: number;
  progress: MotionValue<number>;
  select: (index: number) => void;
  artwork?: (track: CrystalWheelTrack) => ReactNode;
}) {
  const offset = useTransform(progress, value => circularDistance(index, value, count));
  const angle = useTransform(offset, value => value * step);
  const x = useTransform(angle, value => Math.sin(value) * radiusX);
  const z = useTransform(angle, value => Math.cos(value) * radiusZ - radiusZ);
  const y = useTransform(angle, value => (1 - Math.cos(value)) * verticalDrop);
  const highlightX = useTransform(angle, value => `${Math.round(50 + Math.max(-35, Math.min(35, value / (step * 3.2) * 35)))}%`);

  return <motion.button
    type="button"
    className="crystal-wheel-blade"
    onClick={(event) => { event.stopPropagation(); select(index); }}
    aria-label={`Select ${track.title} by ${track.artist}`}
    style={{
      x,
      y,
      z,
      rotateY: useTransform(angle, value => -value * 57.3),
      rotateZ: useTransform(angle, value => Math.sin(value) * 3),
      scale: useTransform(offset, value => Math.max(.48, 1 - Math.abs(value) * .1)),
      opacity: useTransform(offset, value => Math.max(.1, 1 - Math.abs(value) * .16)),
      filter: useTransform(offset, value => `brightness(${Math.max(.45, 1.18 - Math.abs(value) * .12)}) saturate(${Math.max(.4, 1.25 - Math.abs(value) * .12)}) blur(${Math.max(0, Math.abs(value) - 2) * .7}px)`),
      zIndex: useTransform(offset, value => 100 - Math.round(Math.abs(value) * 10)),
      "--highlight-x": highlightX,
    } as never}
  >
    <i className="crystal-wheel-refraction" />
    <i className="crystal-wheel-glare" />
    <i className="crystal-wheel-edge" />
    <i className="crystal-wheel-thickness" />
    <span>{String(index + 1).padStart(2, "0")}</span>
    {artwork && <strong>{artwork(track)}</strong>}
    <b>{track.title}</b>
    <small>{track.artist}</small>
  </motion.button>;
}

export default function CrystalTrackWheel({ tracks, activeIndex, onActiveChange, artwork, className = "" }: Props) {
  const progress = useMotionValue(activeIndex);
  const samples = useRef<{ x: number; progress: number; time: number }[]>([]);
  const wheelVelocity = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const moved = useRef(false);
  const reducedMotion = useReducedMotion();

  const moveTo = (target: number, velocity = 0) => {
    const count = tracks.length;
    const delta = Math.round(target - progress.get());
    const shortestTarget = delta > count / 2 ? target - count : delta < -count / 2 ? target + count : target;
    onActiveChange(normalize(shortestTarget, count));
    animate(progress, shortestTarget, reducedMotion
      ? { duration: .16, ease: "easeOut" }
      : { type: "spring", stiffness: 185, damping: 20, mass: .78, velocity });
  };

  const settle = (velocity: number) => {
    const projected = progress.get() + velocity * .28;
    const target = Math.round(projected);
    onActiveChange(normalize(target, tracks.length));
    if (reducedMotion) {
      moveTo(target);
      return;
    }
    const inertia = animate(progress, projected, { type: "inertia", velocity, power: .42, timeConstant: 310 });
    void inertia.then(() => animate(progress, target, { type: "spring", stiffness: 185, damping: 20, mass: .78 }));
  };

  useEffect(() => () => { if (wheelTimer.current) clearTimeout(wheelTimer.current); }, []);

  if (!tracks.length) return null;

  return <div
    className={`crystal-wheel ${className}`}
    tabIndex={0}
    aria-label="Crystal track wheel"
    onPointerDown={(event) => {
      moved.current = false;
      samples.current = [{ x: event.clientX, progress: progress.get(), time: performance.now() }];
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const start = samples.current[0];
      const next = start.progress - (event.clientX - start.x) / pixelsPerItem;
      if (Math.abs(event.clientX - start.x) > 7) moved.current = true;
      progress.set(next);
      samples.current.push({ x: event.clientX, progress: next, time: performance.now() });
      if (samples.current.length > 5) samples.current.shift();
    }}
    onPointerUp={(event) => {
      const first = samples.current[0];
      const last = samples.current.at(-1);
      if (moved.current && first && last) settle((last.progress - first.progress) / Math.max(1, last.time - first.time) * 1000);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onWheel={(event) => {
      event.preventDefault();
      const delta = event.deltaY || event.deltaX;
      wheelVelocity.current += delta / 180;
      progress.set(progress.get() + delta / 360);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        settle(wheelVelocity.current);
        wheelVelocity.current = 0;
      }, 90);
    }}
    onKeyDown={(event) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); moveTo(Math.round(progress.get()) - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); moveTo(Math.round(progress.get()) + 1); }
    }}
  >
    <div className="crystal-wheel-stage">
      {tracks.map((track, index) => <CrystalBlade key={track.id} index={index} track={track} count={tracks.length} progress={progress} select={moveTo} artwork={artwork} />)}
    </div>
    <div className="crystal-wheel-controls">
      <button type="button" onClick={() => moveTo(Math.round(progress.get()) - 1)} aria-label="Previous track">←</button>
      <button type="button" onClick={() => moveTo(Math.round(progress.get()) + 1)} aria-label="Next track">→</button>
    </div>
  </div>;
}
