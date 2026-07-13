import { withBase } from "@/lib/paths";
import { getActivePlaylist, getTrack, nextTrack, togglePlaying, useMusicState } from "@/lib/music/store";
export default function MusicPlayer() {
  const state = useMusicState(); const track = getTrack(); const playlist = getActivePlaylist();
  if (!track) return <div className="glass-card p-4 text-sm">暂无可试听的音乐。</div>;
  return <div className="home-music-player"><div className="relative size-16 shrink-0 overflow-hidden rounded-lg">{track.artworkUrl ? <img src={withBase(track.artworkUrl)} alt={`${track.title} 封面`} className="size-full object-cover" /> : "♫"}</div><div className="min-w-0 flex-1"><span className="mono text-[10px]">{state.playing ? "NOW PLAYING" : playlist?.title ?? "MUSIC"}</span><b className="block truncate">{track.title}</b><span className="block truncate text-sm">{track.artist}</span><i className="music-progress"><i style={{ width: `${Math.round(state.progress * 100)}%` }} /></i></div><button type="button" onClick={togglePlaying} disabled={!track.previewUrl} aria-label={state.playing ? "暂停试听" : "播放试听"}>{state.playing ? "暂停" : track.previewUrl ? "试听" : "暂无试听"}</button><button type="button" onClick={() => nextTrack()} aria-label="下一首">下一首</button></div>;
}
