import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import CrystalTrackWheel, {
  APPROVED_CRYSTAL_WHEEL_CONFIG,
  APPROVED_CRYSTAL_WHEEL_SLOT_COUNT,
} from "@/components/music/CrystalTrackWheel";
import { withBase } from "@/lib/paths";
import { getState, playTrack, selectTrack } from "@/lib/music/store";
import type { MusicArchiveTrack, MusicPlaylist } from "@/lib/apple-music/types";

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

function createApprovedSlots(tracks: MusicArchiveTrack[]) {
  if (!tracks.length) return [];
  return Array.from(
    { length: APPROVED_CRYSTAL_WHEEL_SLOT_COUNT },
    (_, index) => tracks[index % tracks.length],
  );
}

export default function TrackWheelDialog({ playlist, onClose }: { playlist: MusicPlaylist; onClose: () => void }) {
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const dialog = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const wheelTracks = useMemo(() => createApprovedSlots(playlist.tracks), [playlist.tracks]);
  const initialTrackIndex = Math.max(0, playlist.tracks.findIndex(track => track.id === getState().trackId));
  const [activeSlot, setActiveSlot] = useState(initialTrackIndex);
  const selectedTrack = wheelTracks[activeSlot] ?? playlist.tracks[0];
  const selectedTrackIndex = selectedTrack
    ? Math.max(0, playlist.tracks.findIndex(track => track.id === selectedTrack.id))
    : 0;

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

  const activateSlot = (slotIndex: number) => {
    const track = wheelTracks[slotIndex];
    if (!track) return;
    selectTrack(playlist.id, track.id);
    if (track.previewUrl) playTrack(track.id, playlist.id);
    onClose();
  };

  const overlay = (
    <motion.div
      className="track-wheel-backdrop"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reducedMotion ? { duration: 0 } : { duration: .18 }}
      onPointerDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        ref={dialog}
        className="track-wheel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={reducedMotion ? false : { opacity: 0, scale: .975, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 210, damping: 24, mass: .82 }}
      >
        <header>
          <div>
            <p>CRYSTAL TRACK WHEEL</p>
            <h2 id={titleId}>{playlist.title}</h2>
          </div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="关闭曲目轮盘">×</button>
        </header>

        <CrystalTrackWheel
          tracks={wheelTracks}
          activeIndex={activeSlot}
          onActiveChange={setActiveSlot}
          onTrackActivate={activateSlot}
          artwork={track => track.artworkUrl ? <img src={withBase(track.artworkUrl)} alt="" /> : null}
          ariaLabel={`${playlist.title} 曲目水晶轮盘`}
          className="track-wheel-overlay-wheel"
          config={APPROVED_CRYSTAL_WHEEL_CONFIG}
        />

        <div className="track-wheel-selected">
          <span>{String(selectedTrackIndex + 1).padStart(2, "0")} / {String(playlist.tracks.length).padStart(2, "0")}</span>
          <h3>{selectedTrack.title}</h3>
          <p>{selectedTrack.artist}{selectedTrack.album ? ` · ${selectedTrack.album}` : ""}</p>
          <small>{fmt(selectedTrack.durationMs)}</small>
          <button
            className="track-wheel-play"
            type="button"
            disabled={!selectedTrack.previewUrl}
            onClick={() => activateSlot(activeSlot)}
            aria-label={selectedTrack.previewUrl ? `播放 ${selectedTrack.title}` : `${selectedTrack.title} 暂不可试听`}
            title={selectedTrack.previewUrl ? `播放 ${selectedTrack.title}` : "当前曲目没有试听音频"}
          >
            <span aria-hidden="true">▶</span>
          </button>
          {!selectedTrack.previewUrl && <em>当前曲目不可试听；点击中央页片仍可选中</em>}
        </div>
      </motion.section>
    </motion.div>
  );

  return typeof document === "undefined" ? overlay : createPortal(overlay, document.body);
}
