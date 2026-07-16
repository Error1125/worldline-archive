import { withBase } from "@/lib/paths";
import { playlistDuration } from "@/lib/music/playlists";
import { playTrack, selectTrack, useMusicState } from "@/lib/music/store";
import type { MusicArchiveTrack, MusicPlaylist } from "@/lib/apple-music/types";

const fmt = (ms: number) => ms ? `${Math.floor(ms / 60000)}:${Math.floor((ms % 60000) / 1000).toString().padStart(2, "0")}` : "—";
function TrackRow({ playlist, track, index }: { playlist: MusicPlaylist; track: MusicArchiveTrack; index: number }) {
  const state = useMusicState(); const selected = state.trackId === track.id;
  return <div className="playlist-track-row" data-current={selected}>
    <button type="button" className="track-select" onClick={() => selectTrack(playlist.id, track.id)} aria-label={`选择 ${track.title}`}><span>{selected && state.playing ? "▶" : index + 1}</span>{track.artworkUrl ? <img src={withBase(track.artworkUrl)} alt="" /> : <span className="track-art-fallback">♫</span>}<span className="track-main"><b>{track.title}</b><small>{track.artist}{track.album ? ` · ${track.album}` : ""}</small></span><time>{fmt(track.durationMs ?? 0)}</time></button>
    <button type="button" disabled={!track.previewUrl} onClick={() => playTrack(track.id, playlist.id)} aria-label={track.previewUrl ? `试听 ${track.title}` : `${track.title} 暂无试听`}>{track.previewUrl ? "试听" : "暂无试听"}</button>
    {track.appleMusicUrl && <a href={track.appleMusicUrl} target="_blank" rel="noreferrer noopener" aria-label={`在 Apple Music 打开 ${track.title}`}>↗</a>}
  </div>;
}
export default function ActivePlaylistPanel({ playlist }: { playlist?: MusicPlaylist }) {
  if (!playlist) return null;
  return <section className="active-playlist-panel" aria-labelledby="active-playlist-title"><div className="active-playlist-meta">{playlist.cover ? <img src={withBase(playlist.cover)} alt={`${playlist.title} 封面`} /> : <div className="active-playlist-fallback" aria-hidden="true">♫</div>}<p className="section-kicker">CURRENT PLAYLIST</p><h2 id="active-playlist-title">{playlist.title}</h2>{playlist.subtitle && <p>{playlist.subtitle}</p>}{playlist.description && <p>{playlist.description}</p>}<small>{playlist.tracks.length} 首 · {fmt(playlistDuration(playlist))}</small>{playlist.appleMusicUrl && <a href={playlist.appleMusicUrl} target="_blank" rel="noreferrer noopener">在 Apple Music 打开 ↗</a>}</div><div className="active-playlist-tracks" aria-label={`${playlist.title} 曲目列表`}>{playlist.tracks.map((track, index) => <TrackRow key={track.id} playlist={playlist} track={track} index={index} />)}</div></section>;
}
