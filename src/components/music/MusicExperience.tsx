import { useCallback, useEffect, useRef, useState } from "react";
import type { MusicPlaylist } from "@/lib/apple-music/types";
import { initializeMusicPlaylists, restoreMusicState, useMusicState } from "@/lib/music/store";
import MusicHeroPlayer from "@/components/music/MusicHeroPlayer";
import PlaylistShelf from "@/components/music/PlaylistShelf";
import TrackWheelDialog from "@/components/music/TrackWheelDialog";

export default function MusicExperience({ playlists }: { playlists: MusicPlaylist[] }) {
  initializeMusicPlaylists(playlists);
  const state = useMusicState();
  const [openPlaylistId, setOpenPlaylistId] = useState<string>();
  const overlayTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { restoreMusicState(); }, []);
  const openPlaylist = playlists.find((playlist) => playlist.id === openPlaylistId);
  const closeOverlay = useCallback(() => {
    const trigger = overlayTrigger.current;
    setOpenPlaylistId(undefined);
    requestAnimationFrame(() => trigger?.focus());
  }, []);
  return <div className="music-experience"><MusicHeroPlayer /><PlaylistShelf playlists={playlists} activePlaylistId={state.playlistId} onSelect={(id, trigger) => { overlayTrigger.current = trigger; setOpenPlaylistId(id); }} />{openPlaylist && <TrackWheelDialog playlist={openPlaylist} onClose={closeOverlay} />}</div>;
}
