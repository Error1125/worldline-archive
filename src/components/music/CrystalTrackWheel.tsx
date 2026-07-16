import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type CrystalWheelTrack = { id: string; title: string; artist: string; artworkUrl?: string };
export type CrystalWheelTelemetry = { rotationProgress: number; velocity: number };
export type CrystalWheelConfig = {
  bladeWidth: number;
  bladeHeight: number;
  bladeThickness: number;
  radiusY: number;
  radiusZ: number;
  perspective: number;
  scaleDepth: number;
  rearOpacity: number;
  blurDepth: number;
  pixelsPerItem: number;
  inertiaPower: number;
  friction: number;
  springStiffness: number;
  springDamping: number;
  springMass: number;
};

export const PHYSICAL_SLOT_COUNT = 16;
export const APPROVED_CRYSTAL_WHEEL_SLOT_COUNT = PHYSICAL_SLOT_COUNT;

export const APPROVED_CRYSTAL_WHEEL_CONFIG: CrystalWheelConfig = {
  bladeWidth: 320,
  bladeHeight: 168,
  bladeThickness: 24,
  radiusY: 214,
  radiusZ: 275,
  perspective: 980,
  scaleDepth: .15,
  rearOpacity: .18,
  blurDepth: .42,
  pixelsPerItem: 148,
  inertiaPower: .48,
  friction: 320,
  springStiffness: 132,
  springDamping: 18,
  springMass: .96,
};

/** @deprecated Prefer the explicit approved preset for new integrations. */
export const defaultCrystalWheelConfig = APPROVED_CRYSTAL_WHEEL_CONFIG;

type Props = {
  tracks: CrystalWheelTrack[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  artwork?: (track: CrystalWheelTrack) => ReactNode;
  className?: string;
  config?: CrystalWheelConfig;
  telemetry?: { current: CrystalWheelTelemetry };
  ariaLabel?: string;
  onTrackActivate?: (index: number) => void;
};

export type CrystalWheelSlotAssignment = {
  absoluteIndex: number;
  offset: number;
  trackIndex: number;
};

type RenderTier = "full" | "simple" | "outline";

const TAU = Math.PI * 2;
const SLOT_ANGLE = TAU / PHYSICAL_SLOT_COUNT;
export const mod = (value: number, count: number) => ((value % count) + count) % count;
export const getPhysicalSlotAssignment = (slotId: number, logicalProgress: number, trackCount: number): CrystalWheelSlotAssignment => {
  const absoluteIndex = slotId + PHYSICAL_SLOT_COUNT * Math.round((logicalProgress - slotId) / PHYSICAL_SLOT_COUNT);
  return {
    absoluteIndex,
    offset: absoluteIndex - logicalProgress,
    trackIndex: trackCount ? mod(absoluteIndex, trackCount) : 0,
  };
};
const normalizeTrackIndex = (value: number, count: number) => mod(Math.round(value), count);
const wrapRadians = (value: number) => ((value + Math.PI) % TAU + TAU) % TAU - Math.PI;
const tierForOffset = (offset: number): RenderTier => {
  const distance = Math.abs(offset);
  if (distance <= 2) return "full";
  if (distance <= 5) return "simple";
  return "outline";
};

function CrystalBlade({
  slotId,
  tracks,
  progress,
  reveal,
  select,
  config,
  artwork,
}: {
  slotId: number;
  tracks: CrystalWheelTrack[];
  progress: MotionValue<number>;
  reveal: MotionValue<number>;
  select: (absoluteIndex: number) => void;
  config: CrystalWheelConfig;
  artwork?: (track: CrystalWheelTrack) => ReactNode;
}) {
  const initialAssignment = getPhysicalSlotAssignment(slotId, progress.get(), tracks.length);
  const [absoluteIndex, setAbsoluteIndex] = useState(initialAssignment.absoluteIndex);
  const [renderTier, setRenderTier] = useState<RenderTier>(tierForOffset(initialAssignment.offset));
  const assignmentRef = useRef(initialAssignment.absoluteIndex);
  const tierRef = useRef(renderTier);

  useEffect(() => {
    const next = getPhysicalSlotAssignment(slotId, progress.get(), tracks.length);
    assignmentRef.current = next.absoluteIndex;
    setAbsoluteIndex(next.absoluteIndex);
  }, [progress, slotId, tracks]);

  useMotionValueEvent(progress, "change", value => {
    const next = getPhysicalSlotAssignment(slotId, value, tracks.length);
    if (next.absoluteIndex !== assignmentRef.current) {
      // A slot changes logical content only while crossing the rear seam (±8).
      assignmentRef.current = next.absoluteIndex;
      setAbsoluteIndex(next.absoluteIndex);
    }
    const nextTier = tierForOffset(next.offset);
    if (nextTier !== tierRef.current) {
      tierRef.current = nextTier;
      setRenderTier(nextTier);
    }
  });

  const trackIndex = mod(absoluteIndex, tracks.length);
  const track = tracks[trackIndex];
  const angle = useTransform(progress, value => (absoluteIndex - value) * SLOT_ANGLE);
  const orbitY = useTransform(angle, value => Math.sin(value) * config.radiusY);
  const orbitZ = useTransform(angle, value => Math.cos(value) * config.radiusZ - config.radiusZ);
  const frontness = useTransform(angle, value => (Math.cos(value) + 1) / 2);
  const faceReveal = useTransform([angle, reveal], ([angleValue, revealValue]) => {
    const currentAngle = Number(angleValue);
    const distanceFromFront = Math.abs(wrapRadians(currentAngle));
    const openWindow = SLOT_ANGLE * .42;
    return Math.max(0, 1 - distanceFromFront / openWindow) * Number(revealValue);
  });
  const bladeRotation = useTransform([angle, faceReveal], ([angleValue, openAmountValue]) =>
    -Number(angleValue) * (180 / Math.PI) + 90 * (1 - Number(openAmountValue)));
  const edgeOn = useTransform(bladeRotation, value => Math.abs(Math.sin(value * Math.PI / 180)));
  const artworkVisibility = useTransform([angle, faceReveal], ([angleValue, faceRevealValue]) => {
    const currentAngle = Number(angleValue);
    const sideFaceExposure = Math.abs(Math.sin(currentAngle));
    const depthLight = .16 + ((Math.cos(currentAngle) + 1) / 2) * .24;
    return Math.max(Number(faceRevealValue), sideFaceExposure * depthLight);
  });
  const highlightX = useTransform(angle, value => `${Math.round(50 + Math.sin(value) * 34)}%`);
  const highlightY = useTransform(angle, value => `${Math.round(18 + (1 - Math.cos(value)) * 18)}%`);
  const scale = useTransform(frontness, value => 1 - (1 - value) * config.scaleDepth);
  const opacity = useTransform(frontness, value => config.rearOpacity + value * (1 - config.rearOpacity));
  const zIndex = useTransform(frontness, value => Math.round(value * 100));

  return (
    <motion.button
      type="button"
      className="rotor-crystal-blade"
      data-slot-id={slotId}
      data-absolute-index={absoluteIndex}
      data-track-index={trackIndex}
      data-render-tier={renderTier}
      data-art-variant={trackIndex % 5}
      onClick={(event) => {
        event.stopPropagation();
        select(absoluteIndex);
      }}
      aria-label={`Select ${track.title}`}
      style={{
        y: orbitY,
        z: orbitZ,
        rotateX: bladeRotation,
        scale,
        opacity,
        zIndex,
        "--highlight-x": highlightX,
        "--highlight-y": highlightY,
        "--edge-strength": edgeOn,
        "--face-reveal": faceReveal,
        "--art-visibility": artworkVisibility,
        "--art-hue": `${(trackIndex * 47 + 186) % 360}`,
        "--art-hue-alt": `${(trackIndex * 71 + 298) % 360}`,
      } as never}
    >
      <span className="rotor-crystal-body" aria-hidden="true" />
      <span className="rotor-crystal-art" aria-hidden="true">{artwork?.(track)}</span>
      <span className="rotor-crystal-refraction" aria-hidden="true" />
      <span className="rotor-crystal-glare" aria-hidden="true" />
      <span className="rotor-crystal-glow" aria-hidden="true" />
      <span className="rotor-crystal-noise" aria-hidden="true" />
      <span className="rotor-crystal-front-edge" aria-hidden="true" />
      <span className="rotor-crystal-thickness" aria-hidden="true" />
      <span className="rotor-crystal-spine" aria-hidden="true"><i /><b>{String(trackIndex + 1).padStart(2, "0")}</b></span>
      <span className="rotor-crystal-number">{String(trackIndex + 1).padStart(2, "0")}</span>
    </motion.button>
  );
}

export default function CrystalTrackWheel({
  tracks,
  activeIndex,
  onActiveChange,
  artwork,
  className = "",
  config = APPROVED_CRYSTAL_WHEEL_CONFIG,
  telemetry,
  ariaLabel = "Crystal album wheel",
  onTrackActivate,
}: Props) {
  const progress = useMotionValue(activeIndex);
  const reveal = useMotionValue(1);
  const samples = useRef<{ position: number; progress: number; time: number }[]>([]);
  const wheelSample = useRef({ progress: activeIndex, time: 0 });
  const wheelGestureStart = useRef(activeIndex);
  const wheelVelocity = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const animation = useRef<ReturnType<typeof animate> | undefined>(undefined);
  const revealAnimation = useRef<ReturnType<typeof animate> | undefined>(undefined);
  const motionRun = useRef(0);
  const wheelElement = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const pressedSlot = useRef<number | undefined>(undefined);
  const reportedIndex = useRef(normalizeTrackIndex(activeIndex, Math.max(1, tracks.length)));
  const [motionActive, setMotionActive] = useState(false);
  const reducedMotion = useReducedMotion();

  useMotionValueEvent(progress, "change", value => {
    if (telemetry) {
      telemetry.current.rotationProgress = value;
      telemetry.current.velocity = progress.getVelocity();
    }
    if (!tracks.length) return;
    const nextIndex = normalizeTrackIndex(value, tracks.length);
    if (nextIndex !== reportedIndex.current) {
      reportedIndex.current = nextIndex;
      onActiveChange(nextIndex);
    }
  });

  useEffect(() => () => {
    animation.current?.stop();
    revealAnimation.current?.stop();
    if (wheelTimer.current) clearTimeout(wheelTimer.current);
  }, []);

  const stopAnimation = () => {
    animation.current?.stop();
    animation.current = undefined;
  };

  const closeSelectedBlade = () => {
    revealAnimation.current?.stop();
    if (reducedMotion) {
      reveal.set(0);
      return;
    }
    revealAnimation.current = animate(reveal, 0, { duration: .14, ease: "easeOut" });
  };

  const openSelectedBlade = () => {
    revealAnimation.current?.stop();
    if (reducedMotion) {
      reveal.set(1);
      return;
    }
    revealAnimation.current = animate(reveal, 1, {
      type: "spring",
      stiffness: config.springStiffness * .82,
      damping: config.springDamping * .88,
      mass: config.springMass,
    });
  };

  const moveToAbsolute = (absoluteIndex: number, velocity = 0) => {
    const run = ++motionRun.current;
    stopAnimation();
    closeSelectedBlade();
    setMotionActive(true);
    animation.current = animate(
      progress,
      absoluteIndex,
      reducedMotion
        ? { duration: .14, ease: "easeOut" }
        : { type: "spring", stiffness: config.springStiffness, damping: config.springDamping, mass: config.springMass, velocity },
    );
    void animation.current.then(() => {
      if (run !== motionRun.current) return;
      setMotionActive(false);
      openSelectedBlade();
    });
  };

  const settle = (velocity: number) => {
    const run = ++motionRun.current;
    stopAnimation();
    closeSelectedBlade();
    setMotionActive(true);
    if (telemetry) telemetry.current.velocity = velocity;
    const projected = progress.get() + velocity * config.inertiaPower;
    const target = Math.round(projected);
    if (reducedMotion) {
      moveToAbsolute(target);
      return;
    }

    const frictionScale = Math.max(.82, Math.min(1.18, config.friction / 320));
    animation.current = animate(progress, target, {
      type: "spring",
      stiffness: config.springStiffness,
      damping: config.springDamping * frictionScale,
      mass: config.springMass,
      velocity,
    });
    void animation.current.then(() => {
      if (telemetry) telemetry.current.velocity = 0;
      if (run !== motionRun.current) return;
      setMotionActive(false);
      openSelectedBlade();
    });
  };

  const selectBlade = (absoluteIndex: number) => {
    const distance = Math.abs(absoluteIndex - progress.get());
    if (onTrackActivate && distance < .18) {
      onTrackActivate(mod(absoluteIndex, tracks.length));
      return;
    }
    moveToAbsolute(absoluteIndex);
  };

  useEffect(() => {
    const element = wheelElement.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      motionRun.current += 1;
      stopAnimation();
      closeSelectedBlade();
      setMotionActive(true);
      const now = performance.now();
      if (!wheelSample.current.time) wheelGestureStart.current = progress.get();
      const deltaProgress = Math.max(-.5, Math.min(.5, event.deltaY / config.pixelsPerItem));
      const rawNext = progress.get() + deltaProgress;
      const next = Math.max(wheelGestureStart.current - 6, Math.min(wheelGestureStart.current + 6, rawNext));
      const elapsed = Math.max(16, now - wheelSample.current.time);
      const measuredVelocity = wheelSample.current.time ? (next - wheelSample.current.progress) / elapsed * 1000 : deltaProgress * 8;
      wheelVelocity.current = Math.max(-5, Math.min(5, measuredVelocity));
      wheelSample.current = { progress: next, time: now };
      if (telemetry) telemetry.current.velocity = wheelVelocity.current;
      progress.set(next);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        const velocity = wheelVelocity.current;
        wheelSample.current = { progress: progress.get(), time: 0 };
        settle(velocity);
      }, 160);
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [config.friction, config.inertiaPower, config.pixelsPerItem, config.springDamping, config.springMass, config.springStiffness, reducedMotion, tracks.length, telemetry]);

  if (!tracks.length) return null;

  return (
    <div
      ref={wheelElement}
      className={`crystal-wheel rotor-crystal-wheel ${className}`}
      data-motion-active={motionActive}
      data-physical-slot-count={PHYSICAL_SLOT_COUNT}
      style={{
        perspective: config.perspective,
        "--blade-width": `${config.bladeWidth}px`,
        "--blade-height": `${config.bladeHeight}px`,
        "--blade-thickness": `${config.bladeThickness}px`,
        "--rotor-radius-y": `${config.radiusY}px`,
        "--rotor-radius-z": `${config.radiusZ}px`,
      } as never}
      tabIndex={0}
      aria-label={ariaLabel}
      onPointerDown={(event) => {
        event.preventDefault();
        motionRun.current += 1;
        stopAnimation();
        closeSelectedBlade();
        setMotionActive(true);
        moved.current = false;
        const blade = (event.target as Element).closest(".rotor-crystal-blade");
        pressedSlot.current = blade ? Number(blade.getAttribute("data-absolute-index")) : undefined;
        samples.current = [{ position: event.clientY, progress: progress.get(), time: performance.now() }];
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        event.preventDefault();
        const start = samples.current[0];
        const next = start.progress - (event.clientY - start.position) / config.pixelsPerItem;
        if (Math.abs(event.clientY - start.position) > 7) moved.current = true;
        progress.set(next);
        samples.current.push({ position: event.clientY, progress: next, time: performance.now() });
        if (samples.current.length > 6) samples.current.shift();
      }}
      onPointerUp={(event) => {
        const first = samples.current[0];
        const last = samples.current.at(-1);
        if (moved.current && first && last) {
          const velocity = ((last.progress - first.progress) / Math.max(1, last.time - first.time)) * 1000;
          settle(velocity);
        } else if (!Number.isInteger(pressedSlot.current)) {
          setMotionActive(false);
          openSelectedBlade();
        }
        pressedSlot.current = undefined;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={(event) => {
        pressedSlot.current = undefined;
        setMotionActive(false);
        openSelectedBlade();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          event.preventDefault();
          moveToAbsolute(Math.round(progress.get()) - 1);
        }
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          event.preventDefault();
          moveToAbsolute(Math.round(progress.get()) + 1);
        }
        if (onTrackActivate && event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onTrackActivate(normalizeTrackIndex(progress.get(), tracks.length));
        }
      }}
    >
      <div className="rotor-crystal-stage">
        {Array.from({ length: PHYSICAL_SLOT_COUNT }, (_, slotId) => (
          <CrystalBlade
            key={slotId}
            slotId={slotId}
            tracks={tracks}
            progress={progress}
            reveal={reveal}
            select={selectBlade}
            config={config}
            artwork={artwork}
          />
        ))}
      </div>
      <div className="rotor-crystal-controls">
        <button type="button" onClick={() => moveToAbsolute(Math.round(progress.get()) - 1)} aria-label="Previous track">↑</button>
        <button type="button" onClick={() => moveToAbsolute(Math.round(progress.get()) + 1)} aria-label="Next track">↓</button>
      </div>
    </div>
  );
}
