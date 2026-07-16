import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { MusicPlaylist } from "@/lib/apple-music/types";
import { initializeMusicPlaylists, restoreMusicState, useMusicState } from "@/lib/music/store";
import MusicHeroPlayer from "@/components/music/MusicHeroPlayer";
import PlaylistShelf from "@/components/music/PlaylistShelf";
import type { FolioSourceRect, FolioTransitionState } from "@/components/music/TrackWheelDialog";

const importTrackWheelDialog = () => import("@/components/music/TrackWheelDialog");
let trackWheelDialogPromise: ReturnType<typeof importTrackWheelDialog> | undefined;
const loadTrackWheelDialog = () => trackWheelDialogPromise ??= importTrackWheelDialog();
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
  const openingPlaylist = useRef<string | undefined>(undefined);

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

  const requestClose = useCallback(() => {
    setTransition(current => {
      if (!current || current.state === "closing") return current;
      return { ...current, state: "closing" };
    });
  }, []);

  const handleOpened = useCallback(() => {
    setTransition(current => current?.state === "opening" ? { ...current, state: "open" } : current);
  }, []);

  const handleClosed = useCallback(() => {
    const trigger = overlayTrigger.current;
    openingPlaylist.current = undefined;
    setTransition(undefined);
    requestAnimationFrame(() => trigger?.focus());
  }, []);

  const beginOpen = async (playlistId: string, trigger: HTMLButtonElement) => {
    if (transition || openingPlaylist.current) return;
    openingPlaylist.current = playlistId;
    const source = trigger.querySelector<HTMLElement>(".album-folio") ?? trigger;
    const rect = source.getBoundingClientRect();
    overlayTrigger.current = trigger;
    try {
      await loadTrackWheelDialog();
    } catch (error) {
      openingPlaylist.current = undefined;
      console.error("Unable to prepare the crystal track wheel", error);
      return;
    }
    setTransition({
      playlistId,
      state: "opening",
      sourceRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    });
  };

  return <div className="music-experience" data-overlay-open={transitionOpen} data-transition-state={transition?.state ?? "closed"}>
    <MusicHeroPlayer />
    <PlaylistShelf playlists={playlists} activePlaylistId={state.playlistId} transitioningPlaylistId={transition?.playlistId} onSelect={beginOpen} />
    {openPlaylist && transition && <Suspense fallback={null}>
      <TrackWheelDialog
        playlist={openPlaylist}
        sourceRect={transition.sourceRect}
        transitionState={transition.state}
        onClose={requestClose}
        onOpened={handleOpened}
        onClosed={handleClosed}
      />
    </Suspense>}
  </div>;
}
