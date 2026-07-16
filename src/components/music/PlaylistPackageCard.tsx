import { motion } from "motion/react";
import { withBase } from "@/lib/paths";
import type { MusicPlaylist } from "@/lib/apple-music/types";

export default function PlaylistPackageCard({ playlist, active, onSelect }: { playlist: MusicPlaylist; active: boolean; onSelect: (trigger: HTMLButtonElement) => void }) {
  return <button type="button" className="playlist-package-card" data-active={active} onClick={event => onSelect(event.currentTarget)} aria-pressed={active} aria-label={`${playlist.title}，${active ? "当前歌单" : "打开曲目滚轮"}`}>
    <span className="album-folio" aria-hidden="true">
      <span className="album-folio-backplate" />
      <span className="album-folio-page-stack"><i /><i /><i /></span>
      <motion.span layoutId={`playlist-cover-${playlist.id}`} className="album-folio-cover">
        {playlist.cover ? <img src={withBase(playlist.cover)} alt="" draggable={false} /> : <b>WL</b>}
        <i className="album-folio-glare" />
      </motion.span>
      <span className="album-folio-spine"><i /></span>
      <span className="album-folio-edge" />
    </span>
    <span className="playlist-package-copy">
      <span><strong>{playlist.title}</strong>{active && <em>ACTIVE</em>}</span>
      <small>{playlist.tracks.length} 首曲目 · CRYSTAL FOLIO</small>
      {playlist.description && <p>{playlist.description}</p>}
    </span>
  </button>;
}
