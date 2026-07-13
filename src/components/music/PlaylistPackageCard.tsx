import { withBase } from "@/lib/paths";
import type { MusicPlaylist } from "@/lib/apple-music/types";
export default function PlaylistPackageCard({ playlist, active, onSelect }: { playlist: MusicPlaylist; active: boolean; onSelect: () => void }) {
  return <button type="button" className="playlist-package-card" data-active={active} onClick={onSelect} aria-pressed={active} aria-label={`${playlist.title}，${active ? "当前歌单" : "选择歌单"}`}><span className="playlist-package-art"> <i className="playlist-package-disc" aria-hidden="true">WL</i>{playlist.cover ? <img src={withBase(playlist.cover)} alt="" /> : <b aria-hidden="true">♫</b>}</span><span className="playlist-package-copy"><strong>{playlist.title}</strong><small>{playlist.tracks.length} 首曲目</small>{active && <em>当前歌单</em>}</span></button>;
}
