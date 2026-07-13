import { withBase } from "@/lib/paths";
import { playTrack, useMusicState } from "@/lib/music/store";
import type { MusicArchiveTrack } from "@/lib/apple-music/types";

const kindLabel = { song: "单曲", album: "专辑", playlist: "歌单" } as const;

export default function VinylRecordCard({ track }: { track: MusicArchiveTrack }) {
  const state = useMusicState();
  const playing = state.playing && state.trackId === track.id;
  return <article className="vinyl-record-card" data-playing={playing}>
    <a className="vinyl-record-link" href={track.href} aria-label={`查看 ${track.title} 的音乐档案`}>
      <div className="vinyl-record-art">
        <div className="vinyl-disc" aria-hidden="true"><i className="vinyl-disc-label">WL</i></div>
        <div className="vinyl-sleeve">{track.artworkUrl ? <img src={withBase(track.artworkUrl)} alt={`${track.title} 封面`} /> : <span className="vinyl-fallback">♫</span>}</div>
      </div>
      <div className="music-meta"><span className="tag-chip">{kindLabel[track.kind]}</span><h3>{track.title}</h3><p>{track.artist}{track.album ? ` · ${track.album}` : ""}</p><time dateTime={track.date}>{new Date(track.date).toLocaleDateString("zh-CN")}</time></div>
    </a>
    <div className="music-card-footer"><div className="music-tags">{track.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div>{track.rating !== undefined && <span className="music-rating">{track.rating}/10</span>}</div>
    <div className="music-actions">
      <button type="button" disabled={!track.previewUrl} onClick={() => playTrack(track.id)} aria-label={track.previewUrl ? `试听 ${track.title}` : `${track.title} 暂无试听`} title={track.previewUrl ? "试听" : "暂无试听"}>{playing ? "播放中" : "试听"}</button>
      {track.appleMusicUrl && <a href={track.appleMusicUrl} target="_blank" rel="noreferrer noopener" aria-label={`在 Apple Music 打开 ${track.title}`}>Apple Music ↗</a>}
    </div>
  </article>;
}
