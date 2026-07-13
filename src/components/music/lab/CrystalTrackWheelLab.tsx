import { useEffect, useRef, useState } from "react";
import CrystalTrackWheel, { defaultCrystalWheelConfig, type CrystalWheelConfig, type CrystalWheelTelemetry, type CrystalWheelTrack } from "@/components/music/CrystalTrackWheel";

const referenceGif = "https://cdn.dribbble.com/userupload/22738075/file/original-de29f7f762823c7e5889714b573ee31f.gif";
const tracks: CrystalWheelTrack[] = ["NIGHT SIGNAL", "METEOR CACHE", "GLASS RAIN", "EL PSY LOOP", "LOW ORBIT", "AFTERIMAGE", "SLOW BUILD", "BLUE HOUR", "QUIET ARRAY", "DIVERGENCE"].map((title, index) => ({ id: `lab-${index}`, title, artist: "CRYSTAL TEST TRACK" }));
const controls: { key: keyof CrystalWheelConfig; min: number; max: number; step: number }[] = [
  ["bladeWidth", 320, 400, 1], ["bladeHeight", 160, 220, 1], ["bladeThickness", 2, 64, 1], ["visibleBladeCount", 7, 10, 1],
  ["angleStep", .08, .7, .01], ["radiusY", 80, 600, 1], ["radiusZ", 80, 700, 1], ["perspective", 300, 2000, 10],
  ["rotateXFactor", .2, 2, .01], ["horizontalDrift", 0, 80, 1], ["subtleYaw", 0, 12, .1], ["scaleStep", 0, .2, .005], ["opacityStep", 0, .3, .005], ["blurStep", 0, 2, .05],
  ["pixelsPerItem", 50, 320, 1], ["inertiaPower", .05, 1.2, .01], ["friction", 50, 1000, 10], ["springStiffness", 50, 500, 1], ["springDamping", 5, 80, 1], ["springMass", .1, 3, .01],
].map(([key, min, max, step]) => ({ key: key as keyof CrystalWheelConfig, min: Number(min), max: Number(max), step: Number(step) }));

export default function CrystalTrackWheelLab({ compareMode = false }: { compareMode?: boolean }) {
  const [active, setActive] = useState(0);
  const [config, setConfig] = useState(defaultCrystalWheelConfig);
  const telemetry = useRef<CrystalWheelTelemetry>({ rotationProgress: 0, velocity: 0 });
  const progressOutput = useRef<HTMLOutputElement>(null);
  const velocityOutput = useRef<HTMLOutputElement>(null);

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      if (progressOutput.current) progressOutput.current.value = telemetry.current.rotationProgress.toFixed(3);
      if (velocityOutput.current) velocityOutput.current.value = telemetry.current.velocity.toFixed(3);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  const wheel = <div className="lab-implementation"><p className="section-kicker">MOTION LAB // NO STORE · NO AUDIO</p><h1>Crystal Track Wheel</h1><CrystalTrackWheel tracks={tracks} activeIndex={active} onActiveChange={setActive} className="lab-wheel" config={config} telemetry={telemetry} /><div className="lab-track-meta"><span>{String(active + 1).padStart(2, "0")} / {tracks.length}</span><b>{tracks[active].title}</b><small>{tracks[active].artist} · 03:42</small></div></div>;

  return <section className={`crystal-wheel-lab${compareMode ? " is-compare" : ""}`}>
    {compareMode ? <div className="lab-compare-grid">
      <figure className="lab-compare-frame"><figcaption>REFERENCE</figcaption><img src={referenceGif} alt="Reference crystal track wheel animation" /></figure>
      <div className="lab-compare-frame lab-compare-implementation"><p>IMPLEMENTATION</p>{wheel}</div>
    </div> : wheel}
    <aside className="lab-debug-panel" aria-label="Crystal wheel debug parameters">
      <div><p className="section-kicker">DEV ONLY · DEBUG PARAMETERS</p><button type="button" onClick={() => setConfig(defaultCrystalWheelConfig)}>Reset</button></div>
      <div className="lab-debug-telemetry"><span>rotationProgress <output ref={progressOutput}>0.000</output></span><span>velocity <output ref={velocityOutput}>0.000</output></span></div>
      <div className="lab-debug-controls">{controls.map(({ key, min, max, step }) => <label key={key}><span>{key}<output>{config[key]}</output></span><input type="range" min={min} max={max} step={step} value={config[key]} onChange={event => setConfig(current => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div>
    </aside>
  </section>;
}
