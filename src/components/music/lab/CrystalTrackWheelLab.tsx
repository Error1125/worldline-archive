import { useState } from "react";
import CrystalTrackWheel, { type CrystalWheelTrack } from "@/components/music/CrystalTrackWheel";

const tracks: CrystalWheelTrack[] = ["NIGHT SIGNAL", "METEOR CACHE", "GLASS RAIN", "EL PSY LOOP", "LOW ORBIT", "AFTERIMAGE", "SLOW BUILD", "BLUE HOUR", "QUIET ARRAY", "DIVERGENCE"].map((title, index) => ({ id: `lab-${index}`, title, artist: "CRYSTAL TEST TRACK" }));

export default function CrystalTrackWheelLab() {
  const [active, setActive] = useState(0);
  return <section className="crystal-wheel-lab"><p className="section-kicker">MOTION LAB // NO STORE · NO AUDIO</p><h1>Crystal Track Wheel</h1><p className="lab-readout">{String(active + 1).padStart(2, "0")} / {tracks.length} · {tracks[active].title}</p><CrystalTrackWheel tracks={tracks} activeIndex={active} onActiveChange={setActive} className="lab-wheel" /><p className="lab-spec">angle step 0.542 · radius 370/490 · drag 150px/item · inertia 0.42/310ms · spring 185/20/.78</p></section>;
}
