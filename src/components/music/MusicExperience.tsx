import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { MusicPlaylist } from "@/lib/apple-music/types";
import { initializeMusicPlaylists, restoreMusicState, useMusicState } from "@/lib/music/store";
import MusicHeroPlayer from "@/components/music/MusicHeroPlayer";
import PlaylistShelf from "@/components/music/PlaylistShelf";

const loadTrackWheelDialog = () => import("@/components/music/TrackWheelDialog");
const TrackWheelDialog = lazy(loadTrackWheelDialog);

export default function MusicExperience({ playlists }: { playlists: MusicPlaylist[] }) {
  initializeMusicPlaylists(playlists);
  const state = useMusicState();
  const [openPlaylistId, setOpenPlaylistId] = useState<string>();
  const overlayTrigger = useRef<HTMLButtonElement | null>(null);
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
  const openPlaylist = playlists.find((playlist) => playlist.id === openPlaylistId);
  useEffect(() => {
    document.documentElement.classList.toggle("music-overlay-active", Boolean(openPlaylist));
    window.dispatchEvent(new CustomEvent("wl:music-overlay", { detail: { open: Boolean(openPlaylist) } }));
    return () => {
      document.documentElement.classList.remove("music-overlay-active");
      window.dispatchEvent(new CustomEvent("wl:music-overlay", { detail: { open: false } }));
    };
  }, [openPlaylist]);
  const closeOverlay = useCallback(() => {
    const trigger = overlayTrigger.current;
    setOpenPlaylistId(undefined);
    requestAnimationFrame(() => trigger?.focus());
  }, []);
  return <div className="music-experience" data-overlay-open={Boolean(openPlaylist)}><MusicHeroPlayer /><PlaylistShelf playlists={playlists} activePlaylistId={state.playlistId} onSelect={(id, trigger) => { overlayTrigger.current = trigger; setOpenPlaylistId(id); }} />{openPlaylist && <Suspense fallback={null}><TrackWheelDialog playlist={openPlaylist} onClose={closeOverlay} /></Suspense>}</div>;
}
