import { withBase } from "@/lib/paths";
import type { MusicPlaylist } from "@/lib/apple-music/types";

export function AlbumFolioVisual({ playlist, className = "" }: { playlist: MusicPlaylist; className?: string }) {
  return <span className={`album-folio ${className}`} aria-hidden="true">
      <span className="album-folio-backplate" />
      <span className="album-folio-page-stack"><i /><i /><i /></span>
      <span className="album-folio-cover">
        {playlist.cover ? <img src={withBase(playlist.cover)} alt="" draggable={false} /> : <b>WL</b>}
        <i className="album-folio-glare" />
      </span>
      <span className="album-folio-spine"><i /></span>
      <span className="album-folio-edge" />
    </span>;
}

export default function PlaylistPackageCard({ playlist, active, transitioning, onSelect }: { playlist: MusicPlaylist; active: boolean; transitioning?: boolean; onSelect: (trigger: HTMLButtonElement) => void }) {
  return <button type="button" className="playlist-package-card" data-active={active} data-transition-source={transitioning} onClick={event => onSelect(event.currentTarget)} aria-pressed={active} aria-label={`${playlist.title}，${active ? "当前歌单" : "打开曲目滚轮"}`}>
    <AlbumFolioVisual playlist={playlist} />
    <span className="playlist-package-copy">
      <span><strong>{playlist.title}</strong>{active && <em>ACTIVE</em>}</span>
      <small>{playlist.tracks.length} 首曲目 · CRYSTAL FOLIO</small>
      {playlist.description && <p>{playlist.description}</p>}
    </span>
  </button>;
}
