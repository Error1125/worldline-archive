import { useEffect, useId, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { createPortal } from "react-dom";
import CrystalTrackWheel, { APPROVED_CRYSTAL_WHEEL_CONFIG } from "@/components/music/CrystalTrackWheel";
import { AlbumFolioVisual } from "@/components/music/PlaylistPackageCard";
import MusicControlIcon from "@/components/music/MusicControlIcon";
import { withBase } from "@/lib/paths";
import { getState, playTrack, selectTrack } from "@/lib/music/store";
import type { MusicPlaylist } from "@/lib/apple-music/types";

export type FolioTransitionState = "closed" | "lifting" | "opening" | "expanding" | "open" | "collapsing" | "closing";
export type FolioSourceRect = { x: number; y: number; width: number; height: number };

const fmt = (ms?: number) => ms
  ? `${Math.floor(ms / 60000)}:${Math.floor((ms % 60000) / 1000).toString().padStart(2, "0")}`
  : "--:--";

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function TrackWheelDialog({ playlist, sourceRect, transitionState, onClose }: { playlist: MusicPlaylist; sourceRect: FolioSourceRect; transitionState: FolioTransitionState; onClose: () => void }) {
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const dialog = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const entryProgress = useMotionValue(0);
  const entryScale = useTransform(entryProgress, [0, 1], [.76, 1]);
  const entryY = useTransform(entryProgress, [0, 1], [34, 0]);
  const initialTrackIndex = Math.max(0, playlist.tracks.findIndex(track => track.id === getState().trackId));
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(initialTrackIndex);
  const selectedTrack = playlist.tracks[selectedTrackIndex] ?? playlist.tracks[0];

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const showWheel = transitionState === "expanding" || transitionState === "open";
    const controls = animate(entryProgress, showWheel ? 1 : 0, reducedMotion
      ? { duration: .12, ease: "easeOut" }
      : { duration: mobile ? .26 : .34, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [entryProgress, reducedMotion, transitionState]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => closeButton.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog.current) return;

      const focusable = [...dialog.current.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter(element => !element.hasAttribute("disabled") && element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        dialog.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!selectedTrack) return null;

  const activateTrack = (trackIndex: number) => {
    const track = playlist.tracks[trackIndex];
    if (!track) return;
    selectTrack(playlist.id, track.id);
    if (track.previewUrl) playTrack(track.id, playlist.id);
    onClose();
  };

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const mobile = viewportWidth <= 767;
  const targetSize = Math.min(mobile ? 260 : 300, viewportWidth * .72, viewportHeight * .48);
  const targetX = viewportWidth / 2 - targetSize / 2;
  const targetY = viewportHeight * (mobile ? .38 : .43) - targetSize / 2;
  const flipScale = sourceRect.width / targetSize;
  const cloneStyle = {
    "--folio-target-size": `${targetSize}px`,
    "--folio-flip-x": `${sourceRect.x - targetX}px`,
    "--folio-flip-y": `${sourceRect.y - targetY}px`,
    "--folio-flip-scale": flipScale,
    "--folio-target-x": `${targetX}px`,
    "--folio-target-y": `${targetY}px`,
  } as never;

  const overlay = (
    <div className="track-wheel-backdrop folio-wheel-transition" data-transition-state={transitionState} onPointerDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="folio-transition-clone" data-transition-state={transitionState} style={cloneStyle} aria-hidden="true">
        <AlbumFolioVisual playlist={playlist} className="folio-transition-album" />
        <span className="folio-transition-preview-pages">
          {Array.from({ length: 5 }, (_, index) => <i key={index} style={{ "--preview-index": index } as never} />)}
        </span>
        <span className="folio-transition-caption">{playlist.title}</span>
      </div>

      <section
        ref={dialog}
        className="track-wheel-dialog"
        data-transition-state={transitionState}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={transitionState !== "open"}
        tabIndex={-1}
      >
        <header>
          <div>
            <p>CRYSTAL TRACK WHEEL</p>
            <h2 id={titleId}>{playlist.title}</h2>
          </div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="关闭曲目轮盘"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg></button>
        </header>

        <motion.div className="track-wheel-entry" style={{ opacity: entryProgress, scale: entryScale, y: entryY }}>
          <CrystalTrackWheel
            tracks={playlist.tracks}
            activeIndex={selectedTrackIndex}
            onActiveChange={setSelectedTrackIndex}
            onTrackActivate={activateTrack}
            artwork={track => track.artworkUrl ? <img src={withBase(track.artworkUrl)} alt="" /> : null}
            ariaLabel={`${playlist.title} 曲目水晶轮盘`}
            className="track-wheel-overlay-wheel"
            config={APPROVED_CRYSTAL_WHEEL_CONFIG}
          />
        </motion.div>

        <div className="track-wheel-selected">
          <span>{String(selectedTrackIndex + 1).padStart(2, "0")} / {String(playlist.tracks.length).padStart(2, "0")}</span>
          <h3>{selectedTrack.title}</h3>
          <p>{selectedTrack.artist}{selectedTrack.album ? ` · ${selectedTrack.album}` : ""}</p>
          <small>{fmt(selectedTrack.durationMs)}</small>
          <button className="track-wheel-play" type="button" disabled={!selectedTrack.previewUrl} onClick={() => activateTrack(selectedTrackIndex)} aria-label={selectedTrack.previewUrl ? `播放 ${selectedTrack.title}` : `${selectedTrack.title} 暂不可试听`} title={selectedTrack.previewUrl ? `播放 ${selectedTrack.title}` : "当前曲目没有试听音频"}>
            <MusicControlIcon name="play" size={19} />
          </button>
          {!selectedTrack.previewUrl && <em>当前曲目不可试听；点击中央页片仍可选中</em>}
        </div>
      </section>
    </div>
  );

  return typeof document === "undefined" ? overlay : createPortal(overlay, document.body);
}
