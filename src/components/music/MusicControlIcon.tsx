type MusicControlIconName =
  | "previous"
  | "play"
  | "pause"
  | "next"
  | "volume"
  | "volume-low"
  | "volume-muted"
  | "arrow-left"
  | "arrow-right";

export default function MusicControlIcon({ name, size = 20 }: { name: MusicControlIconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "play") return <svg {...common}><path d="m9 7 8 5-8 5Z" fill="currentColor" stroke="none" /></svg>;
  if (name === "pause") return <svg {...common}><path d="M9 7v10M15 7v10" strokeWidth="2.4" /></svg>;
  if (name === "previous") return <svg {...common}><path d="M7 6v12M18 7l-8 5 8 5Z" /></svg>;
  if (name === "next") return <svg {...common}><path d="M17 6v12M6 7l8 5-8 5Z" /></svg>;
  if (name === "arrow-left") return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>;
  if (name === "arrow-right") return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
  if (name === "volume-muted") return <svg {...common}><path d="M11 5 6.5 9H3v6h3.5l4.5 4Z" /><path d="m16 10 5 5M21 10l-5 5" /></svg>;
  if (name === "volume-low") return <svg {...common}><path d="M11 5 6.5 9H3v6h3.5l4.5 4Z" /><path d="M15 9.5a4 4 0 0 1 0 5" /></svg>;
  return <svg {...common}><path d="M11 5 6.5 9H3v6h3.5l4.5 4Z" /><path d="M15 8a6 6 0 0 1 0 8M18 5.5a9 9 0 0 1 0 13" /></svg>;
}
