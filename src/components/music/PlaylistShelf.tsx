import { useRef } from "react";
import type { MusicPlaylist } from "@/lib/apple-music/types";
import PlaylistPackageCard from "@/components/music/PlaylistPackageCard";
import MusicControlIcon from "@/components/music/MusicControlIcon";
export default function PlaylistShelf({ playlists, activePlaylistId, onSelect }: { playlists: MusicPlaylist[]; activePlaylistId?: string; onSelect: (id: string, trigger: HTMLButtonElement) => void }) {
  const shelf = useRef<HTMLDivElement>(null); const drag = useRef({ x: 0, left: 0, moved: false });
  const scrollShelf = (direction: number) => shelf.current?.scrollBy({ left: direction * Math.max(260, shelf.current.clientWidth * .72), behavior: "smooth" });
  const releasePointer = (element: HTMLDivElement, pointerId: number) => { if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId); };
  return <section className="playlist-shelf-section" aria-labelledby="playlist-shelf-title">
    <div className="playlist-shelf-heading">
      <div><p className="section-kicker">CRYSTAL ALBUM ARCHIVE</p><h2 id="playlist-shelf-title">水晶音乐档案册</h2><small>横向浏览，打开一册以选择曲目</small></div>
      <div className="playlist-shelf-nav" aria-label="播放列表收藏架导航">
        <button type="button" onClick={() => scrollShelf(-1)} aria-label="向左浏览播放列表"><MusicControlIcon name="arrow-left" /></button>
        <button type="button" onClick={() => scrollShelf(1)} aria-label="向右浏览播放列表"><MusicControlIcon name="arrow-right" /></button>
      </div>
    </div>
    <div ref={shelf} className="playlist-shelf" onWheel={e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); e.currentTarget.scrollLeft += e.deltaY; } }} onPointerDown={e => { if (e.button !== 0) return; drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) return; const delta = e.clientX - drag.current.x; if (Math.abs(delta) > 8) drag.current.moved = true; e.currentTarget.scrollLeft = drag.current.left - delta; }} onPointerUp={e => releasePointer(e.currentTarget, e.pointerId)} onPointerCancel={e => releasePointer(e.currentTarget, e.pointerId)}>{playlists.map((playlist) => <PlaylistPackageCard key={playlist.id} playlist={playlist} active={playlist.id === activePlaylistId} onSelect={(trigger) => { if (!drag.current.moved) onSelect(playlist.id, trigger); }} />)}</div>
  </section>;
}
