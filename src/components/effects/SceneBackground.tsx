import { useEffect, useMemo, useState } from "react";
import { daySceneBackgrounds, sceneBackgrounds, SCENE_CYCLE_MS } from "@/config/backgrounds";
import { withBase } from "@/lib/paths";

export default function SceneBackground() {
  const [mode, setMode] = useState<"night" | "day">("night");
  const [loaded, setLoaded] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const readMode = () => {
      setMode(document.documentElement.dataset.sceneMode === "day" ? "day" : "night");
    };
    readMode();
    window.addEventListener("scene-mode-change", readMode);
    document.addEventListener("astro:page-load", readMode);
    return () => {
      window.removeEventListener("scene-mode-change", readMode);
      document.removeEventListener("astro:page-load", readMode);
    };
  }, []);

  const items = useMemo(
    () => (mode === "day" ? daySceneBackgrounds : sceneBackgrounds).map((it) => ({ ...it, url: withBase(it.src) })),
    [mode],
  );

  useEffect(() => {
    if (items.length === 0) return;
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setLoaded([]);
    setIndex(0);

    let alive = true;
    const ok: string[] = [];
    let pending = items.length;

    for (const it of items) {
      const img = new Image();
      img.onload = () => {
        ok.push(it.url);
        if (--pending === 0 && alive) {
          setLoaded(items.map((x) => x.url).filter((u) => ok.includes(u)));
        }
      };
      img.onerror = () => {
        if (--pending === 0 && alive) {
          setLoaded(items.map((x) => x.url).filter((u) => ok.includes(u)));
        }
      };
      img.src = it.url;
    }

    return () => {
      alive = false;
    };
  }, [items]);

  useEffect(() => {
    if (reduced || loaded.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % loaded.length);
    }, SCENE_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [reduced, loaded]);

  if (loaded.length === 0) return null;
  const active = reduced ? 0 : index % loaded.length;

  return (
    <div className="scene-bg" aria-hidden="true" data-scene={mode}>
      {loaded.map((url, i) => {
        const meta = items.find((it) => it.url === url);
        return (
          <img
            key={url}
            src={url}
            alt=""
            role="presentation"
            decoding="async"
            className={`scene-bg-img${i === active ? " is-on" : ""}`}
            data-mood={meta?.mood}
            draggable={false}
          />
        );
      })}
      <div className="scene-bg-shade" />
    </div>
  );
}
