import { useEffect, useState } from "react";
import type { MusicPlaylist } from "@/lib/apple-music/types";
import { initializeMusicPlaylists, restoreMusicState, selectPlaylist, useMusicState } from "@/lib/music/store";
import MusicHeroPlayer from "@/components/music/MusicHeroPlayer";
import PlaylistShelf from "@/components/music/PlaylistShelf";
import TrackWheelDialog from "@/components/music/TrackWheelDialog";

export default function MusicExperience({ playlists }: { playlists: MusicPlaylist[] }) {
  initializeMusicPlaylists(playlists);
  const state = useMusicState();
  const [openPlaylistId, setOpenPlaylistId] = useState<string>();
  useEffect(() => { restoreMusicState(); }, []);
  const openPlaylist = playlists.find((playlist) => playlist.id === openPlaylistId);
  return <div className="music-experience"><MusicHeroPlayer /><PlaylistShelf playlists={playlists} activePlaylistId={state.playlistId} onSelect={(id) => { setOpenPlaylistId(id); selectPlaylist(id); }} />{openPlaylist && <TrackWheelDialog playlist={openPlaylist} onClose={() => setOpenPlaylistId(undefined)} />}</div>;
}
