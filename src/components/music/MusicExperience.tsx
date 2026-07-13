import { useEffect } from "react";
import type { MusicPlaylist } from "@/lib/apple-music/types";
import { getActivePlaylist, initializeMusicPlaylists, restoreMusicState, selectPlaylist, useMusicState } from "@/lib/music/store";
import MusicHeroPlayer from "@/components/music/MusicHeroPlayer";
import PlaylistShelf from "@/components/music/PlaylistShelf";
import ActivePlaylistPanel from "@/components/music/ActivePlaylistPanel";
export default function MusicExperience({ playlists }: { playlists: MusicPlaylist[] }) { initializeMusicPlaylists(playlists); const state = useMusicState(); useEffect(() => { restoreMusicState(); }, []); const active = getActivePlaylist(); return <div className="music-experience"><MusicHeroPlayer /><PlaylistShelf playlists={playlists} activePlaylistId={state.playlistId} onSelect={selectPlaylist} /><ActivePlaylistPanel playlist={active} /></div>; }
