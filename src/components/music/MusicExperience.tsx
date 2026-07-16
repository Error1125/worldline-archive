import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { MusicPlaylist } from "@/lib/apple-music/types";
import { initializeMusicPlaylists, restoreMusicState, useMusicState } from "@/lib/music/store";
import MusicHeroPlayer from "@/components/music/MusicHeroPlayer";
import PlaylistShelf from "@/components/music/PlaylistShelf";
import type { FolioSourceRect, FolioTransitionState } from "@/components/music/TrackWheelDialog";

const loadTrackWheelDialog = () => import("@/components/music/TrackWheelDialog");
const TrackWheelDialog = lazy(loadTrackWheelDialog);

type FolioTransition = {
  playlistId: string;
  sourceRect: FolioSourceRect;
  state: FolioTransitionState;
};

export default function MusicExperience({ playlists }: { playlists: MusicPlaylist[] }) {
  initializeMusicPlaylists(playlists);
  const state = useMusicState();
  const [transition, setTransition] = useState<FolioTransition>();
  const overlayTrigger = useRef<HTMLButtonElement | null>(null);
  const timingProfile = useRef({ mobile: false, reduced: false });

  useEffect(() => {
    restoreMusicState();
    const idleWindow = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const preload = () => { void loadTrackWheelDialog(); };
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(preload, { timeout: 1400 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }
    const timer = window.setTimeout(preload, 600);
    return () => window.clearTimeout(timer);
  }, []);

  const openPlaylist = playlists.find((playlist) => playlist.id === transition?.playlistId);
  const transitionOpen = Boolean(transition);

  useEffect(() => {
    document.documentElement.classList.toggle("music-overlay-active", transitionOpen);
    window.dispatchEvent(new CustomEvent("wl:music-overlay", { detail: { open: transitionOpen } }));
    return () => {
      document.documentElement.classList.remove("music-overlay-active");
      window.dispatchEvent(new CustomEvent("wl:music-overlay", { detail: { open: false } }));
    };
  }, [transitionOpen]);

  useEffect(() => {
    if (!transition) return;
    const { mobile, reduced } = timingProfile.current;
    const delay = transition.state === "lifting"
      ? reduced ? 55 : mobile ? 85 : 140
      : transition.state === "opening"
        ? reduced ? 65 : mobile ? 190 : 280
        : transition.state === "expanding"
          ? reduced ? 80 : mobile ? 260 : 340
          : transition.state === "collapsing"
            ? reduced ? 90 : mobile ? 230 : 300
            : transition.state === "closing"
              ? reduced ? 120 : mobile ? 310 : 440
              : undefined;
    if (delay === undefined) return;

    const timer = window.setTimeout(() => {
      if (transition.state === "closing") {
        const trigger = overlayTrigger.current;
        setTransition(undefined);
        requestAnimationFrame(() => trigger?.focus());
        return;
      }
      const nextState: Partial<Record<FolioTransitionState, FolioTransitionState>> = {
        lifting: "opening",
        opening: "expanding",
        expanding: "open",
        collapsing: "closing",
      };
      const next = nextState[transition.state];
      if (next) setTransition(current => current ? { ...current, state: next } : current);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [transition]);

  const requestClose = useCallback(() => {
    setTransition(current => {
      if (!current || current.state === "collapsing" || current.state === "closing") return current;
      return { ...current, state: "collapsing" };
    });
  }, []);

  const beginOpen = (playlistId: string, trigger: HTMLButtonElement) => {
    if (transition) return;
    const source = trigger.querySelector<HTMLElement>(".album-folio") ?? trigger;
    const rect = source.getBoundingClientRect();
    timingProfile.current = {
      mobile: window.matchMedia("(max-width: 767px)").matches,
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
    overlayTrigger.current = trigger;
    void loadTrackWheelDialog();
    setTransition({
      playlistId,
      state: "lifting",
      sourceRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    });
  };

  return <div className="music-experience" data-overlay-open={transitionOpen} data-transition-state={transition?.state ?? "closed"}>
    <MusicHeroPlayer />
    <PlaylistShelf playlists={playlists} activePlaylistId={state.playlistId} transitioningPlaylistId={transition?.playlistId} onSelect={beginOpen} />
    {openPlaylist && transition && <Suspense fallback={null}>
      <TrackWheelDialog playlist={openPlaylist} sourceRect={transition.sourceRect} transitionState={transition.state} onClose={requestClose} />
    </Suspense>}
  </div>;
}
