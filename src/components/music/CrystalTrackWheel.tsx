import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

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

export const defaultCrystalWheelConfig: CrystalWheelConfig = {
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

type Props = {
  tracks: CrystalWheelTrack[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  artwork?: (track: CrystalWheelTrack) => ReactNode;
  className?: string;
  config?: CrystalWheelConfig;
  telemetry?: { current: CrystalWheelTelemetry };
};

const TAU = Math.PI * 2;
const circularDistance = (index: number, progress: number, count: number) =>
  ((index - progress + count / 2) % count + count) % count - count / 2;
const normalize = (value: number, count: number) => ((Math.round(value) % count) + count) % count;
const wrapRadians = (value: number) => ((value + Math.PI) % TAU + TAU) % TAU - Math.PI;

function CrystalBlade({
  track,
  index,
  count,
  progress,
  reveal,
  select,
  config,
  artwork,
}: {
  track: CrystalWheelTrack;
  index: number;
  count: number;
  progress: MotionValue<number>;
  reveal: MotionValue<number>;
  select: (index: number) => void;
  config: CrystalWheelConfig;
  artwork?: (track: CrystalWheelTrack) => ReactNode;
}) {
  // One fixed slot per track. count * slotAngle is always exactly one full turn.
  const slotAngle = TAU / count;
  const angle = useTransform(progress, value => (index - value) * slotAngle);
  const orbitY = useTransform(angle, value => Math.sin(value) * config.radiusY);
  const orbitZ = useTransform(angle, value => Math.cos(value) * config.radiusZ - config.radiusZ);
  const frontness = useTransform(angle, value => (Math.cos(value) + 1) / 2);
  const faceReveal = useTransform([angle, reveal], ([angleValue, revealValue]) => {
    const currentAngle = Number(angleValue);
    const distanceFromFront = Math.abs(wrapRadians(currentAngle));
    const openWindow = slotAngle * .42;
    const frontSlotInfluence = Math.max(0, 1 - distanceFromFront / openWindow);
    return frontSlotInfluence * Number(revealValue);
  });
  const bladeRotation = useTransform([angle, faceReveal], ([angleValue, openAmountValue]) => {
    const currentAngle = Number(angleValue);
    const openAmount = Number(openAmountValue);
    // Closed blades point radially away from the axle. The selected blade folds
    // 90 degrees only after the rotor has settled, revealing its album face.
    return -currentAngle * (180 / Math.PI) + 90 * (1 - openAmount);
  });
  const edgeOn = useTransform(bladeRotation, value => Math.abs(Math.sin(value * Math.PI / 180)));
  const artworkVisibility = useTransform([angle, faceReveal], ([angleValue, faceRevealValue]) => {
    const currentAngle = Number(angleValue);
    const selectedReveal = Number(faceRevealValue);
    const sideFaceExposure = Math.abs(Math.sin(currentAngle));
    const depthLight = .16 + ((Math.cos(currentAngle) + 1) / 2) * .24;
    return Math.max(selectedReveal, sideFaceExposure * depthLight);
  });
  const artworkFilter = useTransform(faceReveal, value => `brightness(${.62 + value * .38}) saturate(${.62 + value * .38}) blur(${(1 - value)}px)`);
  const highlightX = useTransform(angle, value => `${Math.round(50 + Math.sin(value) * 34)}%`);
  const highlightY = useTransform(angle, value => `${Math.round(18 + (1 - Math.cos(value)) * 18)}%`);
  const artworkNode = artwork?.(track);

  return (
    <motion.button
      type="button"
      className="rotor-crystal-blade"
      data-track-index={index}
      data-art-variant={index % 5}
      onClick={(event) => {
        event.stopPropagation();
        select(index);
      }}
      aria-label={`Select ${track.title}`}
      style={{
        y: orbitY,
        z: orbitZ,
        rotateX: bladeRotation,
        scale: useTransform(frontness, value => 1 - (1 - value) * config.scaleDepth),
        opacity: useTransform(frontness, value => config.rearOpacity + value * (1 - config.rearOpacity)),
        filter: useTransform(frontness, value => `brightness(${.58 + value * .54}) saturate(${.72 + value * .42}) blur(${(1 - value) * config.blurDepth}px)`),
        zIndex: useTransform(frontness, value => Math.round(value * 100)),
        "--highlight-x": highlightX,
        "--highlight-y": highlightY,
        "--edge-strength": edgeOn,
        "--face-reveal": faceReveal,
        "--art-visibility": artworkVisibility,
        "--art-filter": artworkFilter,
        "--art-hue": `${(index * 47 + 186) % 360}`,
        "--art-hue-alt": `${(index * 71 + 298) % 360}`,
      } as never}
    >
      <span className="rotor-crystal-body" aria-hidden="true" />
      <span className="rotor-crystal-art" aria-hidden="true">{artworkNode}</span>
      <span className="rotor-crystal-refraction" aria-hidden="true" />
      <span className="rotor-crystal-glare" aria-hidden="true" />
      <span className="rotor-crystal-glow" aria-hidden="true" />
      <span className="rotor-crystal-noise" aria-hidden="true" />
      <span className="rotor-crystal-front-edge" aria-hidden="true" />
      <span className="rotor-crystal-thickness" aria-hidden="true" />
      <span className="rotor-crystal-spine" aria-hidden="true"><i /><b>{String(index + 1).padStart(2, "0")}</b></span>
      <span className="rotor-crystal-number">{String(index + 1).padStart(2, "0")}</span>
    </motion.button>
  );
}

export default function CrystalTrackWheel({
  tracks,
  activeIndex,
  onActiveChange,
  artwork,
  className = "",
  config = defaultCrystalWheelConfig,
  telemetry,
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
  const pressedTrack = useRef<number | undefined>(undefined);
  const reportedIndex = useRef(activeIndex);
  const reducedMotion = useReducedMotion();

  useMotionValueEvent(progress, "change", value => {
    if (telemetry) {
      telemetry.current.rotationProgress = value;
      telemetry.current.velocity = progress.getVelocity();
    }
    if (!tracks.length) return;
    const nextIndex = normalize(value, tracks.length);
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

  const moveToIndex = (index: number, velocity = 0) => {
    const run = ++motionRun.current;
    stopAnimation();
    closeSelectedBlade();
    const target = progress.get() + circularDistance(index, progress.get(), tracks.length);
    animation.current = animate(
      progress,
      target,
      reducedMotion
        ? { duration: .14, ease: "easeOut" }
        : { type: "spring", stiffness: config.springStiffness, damping: config.springDamping, mass: config.springMass, velocity },
    );
    void animation.current.then(() => {
      if (run === motionRun.current) openSelectedBlade();
    });
  };

  const settle = (velocity: number) => {
    const run = ++motionRun.current;
    stopAnimation();
    closeSelectedBlade();
    if (telemetry) telemetry.current.velocity = velocity;
    const projected = progress.get() + velocity * config.inertiaPower;
    const target = Math.round(projected);
    if (reducedMotion) {
      moveToIndex(normalize(target, tracks.length));
      return;
    }

    const frictionScale = Math.max(.82, Math.min(1.18, config.friction / 320));
    // One uninterrupted physical trajectory: release velocity supplies the
    // glide while the spring continuously attracts the nearest track slot.
    animation.current = animate(progress, target, {
      type: "spring",
      stiffness: config.springStiffness,
      damping: config.springDamping * frictionScale,
      mass: config.springMass,
      velocity,
    });
    void animation.current.then(() => {
      if (telemetry) telemetry.current.velocity = 0;
      if (run === motionRun.current) openSelectedBlade();
    });
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
      style={{
        perspective: config.perspective,
        "--blade-width": `${config.bladeWidth}px`,
        "--blade-height": `${config.bladeHeight}px`,
        "--blade-thickness": `${config.bladeThickness}px`,
        "--rotor-radius-y": `${config.radiusY}px`,
        "--rotor-radius-z": `${config.radiusZ}px`,
      } as never}
      tabIndex={0}
      aria-label="Crystal album wheel"
      onPointerDown={(event) => {
        event.preventDefault();
        motionRun.current += 1;
        stopAnimation();
        closeSelectedBlade();
        moved.current = false;
        const blade = (event.target as Element).closest(".rotor-crystal-blade");
        pressedTrack.current = blade ? Number(blade.getAttribute("data-track-index")) : undefined;
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
        } else if (!Number.isInteger(pressedTrack.current)) {
          openSelectedBlade();
        }
        pressedTrack.current = undefined;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={(event) => {
        pressedTrack.current = undefined;
        openSelectedBlade();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          moveToIndex(normalize(Math.round(progress.get()) - 1, tracks.length));
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          moveToIndex(normalize(Math.round(progress.get()) + 1, tracks.length));
        }
      }}
    >
      <div className="rotor-crystal-stage">
        {tracks.map((track, index) => (
          <CrystalBlade
            key={track.id}
            track={track}
            index={index}
            count={tracks.length}
            progress={progress}
            reveal={reveal}
            select={moveToIndex}
            config={config}
            artwork={artwork}
          />
        ))}
      </div>
      <div className="rotor-crystal-controls">
        <button type="button" onClick={() => moveToIndex(normalize(Math.round(progress.get()) - 1, tracks.length))} aria-label="Previous track">↑</button>
        <button type="button" onClick={() => moveToIndex(normalize(Math.round(progress.get()) + 1, tracks.length))} aria-label="Next track">↓</button>
      </div>
    </div>
  );
}
