import type { MusicArchiveTrack, MusicPlaylist } from "@/lib/apple-music/types";

export const LOCAL_FALLBACK_PLAYLIST_ID = "local-library";

function playlistId(name: string) { return `local-${name.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "") || "library"}`; }

/** Groups local collection entries without pretending they came from an Apple API. */
export function createLocalPlaylists(tracks: MusicArchiveTrack[]): MusicPlaylist[] {
  const groups = new Map<string, MusicArchiveTrack[]>();
  for (const track of tracks) {
    // Existing archives do not always carry a playlist label. Album is the
    // next real collection boundary, so it keeps the shelf meaningful without
    // inventing a second content model.
    const key = track.playlist?.trim() || track.album?.trim() || LOCAL_FALLBACK_PLAYLIST_ID;
    groups.set(key, [...(groups.get(key) ?? []), track]);
  }
  return [...groups.entries()].map(([key, grouped], index) => {
    const fallback = key === LOCAL_FALLBACK_PLAYLIST_ID;
    const ordered = [...grouped].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    return {
      id: fallback ? LOCAL_FALLBACK_PLAYLIST_ID : playlistId(key),
      title: fallback ? "音乐收藏" : key,
      subtitle: fallback ? "本地音乐档案" : "本地播放列表",
      description: fallback ? "由现有音乐档案暂时组成，等待未来授权的播放列表导入。" : undefined,
      cover: ordered.find((track) => track.artworkUrl)?.artworkUrl,
      featured: ordered.some((track) => track.featured) || index === 0,
      order: index,
      presentation: "vinyl",
      tracks: ordered,
    } satisfies MusicPlaylist;
  });
}

export function playlistDuration(playlist: MusicPlaylist) { return playlist.tracks.reduce((total, track) => total + (track.durationMs ?? 0), 0); }
