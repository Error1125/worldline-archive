import { useEffect, useId, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import { createPortal } from "react-dom";
import CrystalTrackWheel, { APPROVED_CRYSTAL_WHEEL_CONFIG } from "@/components/music/CrystalTrackWheel";
import { AlbumFolioVisual } from "@/components/music/PlaylistPackageCard";
import MusicControlIcon from "@/components/music/MusicControlIcon";
import { withBase } from "@/lib/paths";
import { getState, playTrack, selectTrack } from "@/lib/music/store";
import type { MusicPlaylist } from "@/lib/apple-music/types";

export type FolioTransitionState = "opening" | "open" | "closing";
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

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

async function prepareTransitionResources(root: HTMLElement) {
  await document.fonts.ready;
  const images = [...root.querySelectorAll<HTMLImageElement>("img")];
  await Promise.all(images.map(async image => {
    if (typeof image.decode === "function") {
      await image.decode().catch(() => undefined);
      return;
    }
    if (image.complete) return;
    await new Promise<void>(resolve => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }));
  await nextFrame();
  await nextFrame();
}

function getTransitionGeometry(sourceRect: FolioSourceRect) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const mobile = viewportWidth <= 767;
  const targetSize = Math.min(mobile ? 260 : 300, viewportWidth * .72, viewportHeight * .48);
  const targetX = viewportWidth / 2 - targetSize / 2;
  const targetY = viewportHeight * (mobile ? .38 : .43) - targetSize / 2;
  return {
    mobile,
    targetSize,
    targetX,
    targetY,
    sourceX: sourceRect.x - targetX,
    sourceY: sourceRect.y - targetY,
    sourceScale: sourceRect.width / targetSize,
  };
}

function FolioPreviewPage({ index, progress, mobile }: { index: number; progress: MotionValue<number>; mobile: boolean }) {
  const targetY = mobile ? [-46, 0, 46][index] : [-76, 0, 76][index];
  const stackY = [-6, 0, 6][index];
  const targetRotateX = mobile ? [16, 0, -16][index] : [24, 0, -24][index];
  const x = useTransform(progress, [0, 1], [12, 0]);
  const y = useTransform(progress, [0, 1], [stackY, targetY]);
  const z = useTransform(progress, [0, 1], [-10 + index * 3, index * 4]);
  const scale = useTransform(progress, [0, 1], [.58, .94]);
  const rotateX = useTransform(progress, [0, 1], [0, targetRotateX]);
  return <i><motion.b style={{ x, y, z, scale, rotateX }} /></i>;
}

export default function TrackWheelDialog({
  playlist,
  sourceRect,
  transitionState,
  onClose,
  onOpened,
  onClosed,
}: {
  playlist: MusicPlaylist;
  sourceRect: FolioSourceRect;
  transitionState: FolioTransitionState;
  onClose: () => void;
  onOpened: () => void;
  onClosed: () => void;
}) {
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const overlayRoot = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const preparation = useRef(0);
  const transitionStateRef = useRef(transitionState);
  transitionStateRef.current = transitionState;
  const openProgress = useMotionValue(0);
  const [showTransitionScene, setShowTransitionScene] = useState(true);
  const geometry = useMemo(() => getTransitionGeometry(sourceRect), [sourceRect]);

  const scrimOpacity = useTransform(openProgress, [0, .08, .58, 1], [0, .08, .96, 1]);
  const cloneX = useTransform(openProgress, [0, .08, .58, 1], [geometry.sourceX, geometry.sourceX, 0, 0]);
  const cloneY = useTransform(openProgress, [0, .08, .22, .58, 1], [geometry.sourceY, geometry.sourceY, geometry.sourceY - 12, 0, -18]);
  const cloneScale = useTransform(openProgress, [0, .08, .22, .58, 1], [geometry.sourceScale, geometry.sourceScale, geometry.sourceScale * 1.035, 1, .9]);
  const cloneOpacity = useTransform(openProgress, [0, .72, .9, 1], [1, 1, 0, 0]);
  const coverRotateY = useTransform(
    openProgress,
    reducedMotion ? [0, .18, .62, 1] : [0, .16, .62, 1],
    reducedMotion ? ["0deg", "0deg", "-18deg", "-18deg"] : ["0deg", "0deg", "-66deg", "-66deg"],
  );
  const previewSpread = useTransform(openProgress, [0, .3, .78, 1], [0, 0, 1, 1]);
  const previewOpacity = useTransform(openProgress, [0, .28, .38, .74, .9, 1], [0, 0, 1, 1, 0, 0]);
  const wheelOpacity = useTransform(openProgress, [0, .42, .58, .8, 1], [0, 0, .24, 1, 1]);
  const wheelScale = useTransform(openProgress, [0, .42, .68, .92, 1], [.82, .82, .92, 1, 1]);
  const wheelScaleY = useTransform(openProgress, [0, .42, .7, .92, 1], [.28, .28, .74, 1, 1]);
  const wheelY = useTransform(openProgress, [0, .42, .72, .92, 1], [26, 26, 10, 0, 0]);
  const controlsOpacity = useTransform(openProgress, [0, .7, 1], [0, 0, 1]);

  const initialTrackIndex = Math.max(0, playlist.tracks.findIndex(track => track.id === getState().trackId));
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(initialTrackIndex);
  const selectedTrack = playlist.tracks[selectedTrackIndex] ?? playlist.tracks[0];

  useEffect(() => {
    animation.current?.stop();
    const runId = ++preparation.current;

    if (transitionState === "opening") {
      void (async () => {
        if (overlayRoot.current) await prepareTransitionResources(overlayRoot.current);
        if (runId !== preparation.current || transitionState !== "opening") return;
        const duration = reducedMotion ? .22 : geometry.mobile ? .64 : .82;
        const controls = animate(openProgress, 1, { duration, ease: [0.4, 0, 0.2, 1] });
        animation.current = controls;
        await controls;
        if (runId !== preparation.current) return;
        openProgress.set(1);
        animation.current = null;
        setShowTransitionScene(false);
        onOpened();
      })();
    } else if (transitionState === "closing") {
      void (async () => {
        const currentProgress = Math.max(0, Math.min(1, openProgress.get()));
        setShowTransitionScene(true);
        await nextFrame();
        await nextFrame();
        if (runId !== preparation.current) return;
        const baseDuration = reducedMotion ? .2 : geometry.mobile ? .56 : .7;
        const controls = animate(openProgress, 0, {
          duration: Math.max(.08, baseDuration * Math.max(.2, currentProgress)),
          ease: [0.4, 0, 0.2, 1],
        });
        animation.current = controls;
        await controls;
        if (runId !== preparation.current) return;
        openProgress.set(0);
        animation.current = null;
        setShowTransitionScene(false);
        onClosed();
      })();
    }

    return () => {
      preparation.current += 1;
      animation.current?.stop();
    };
  }, [geometry.mobile, onClosed, onOpened, openProgress, reducedMotion, transitionState]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || transitionStateRef.current !== "open" || !dialog.current) return;

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
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (transitionState !== "open") return;
    const focusFrame = requestAnimationFrame(() => closeButton.current?.focus());
    return () => cancelAnimationFrame(focusFrame);
  }, [transitionState]);

  if (!selectedTrack) return null;

  const activateTrack = (trackIndex: number) => {
    const track = playlist.tracks[trackIndex];
    if (!track) return;
    selectTrack(playlist.id, track.id);
    if (track.previewUrl) playTrack(track.id, playlist.id);
    onClose();
  };

  const clonePositionStyle = {
    top: geometry.targetY,
    left: geometry.targetX,
    width: geometry.targetSize,
    height: geometry.targetSize,
    "--folio-target-size": `${geometry.targetSize}px`,
    x: cloneX,
    y: cloneY,
    scale: cloneScale,
    opacity: cloneOpacity,
    "--folio-cover-rotation": coverRotateY,
  } as never;

  const overlay = (
    <motion.div
      ref={overlayRoot}
      className="track-wheel-backdrop track-wheel-overlay"
      data-transition-phase={transitionState}
      data-transition-scene={showTransitionScene}
      style={{ "--folio-open-progress": openProgress } as never}
      onPointerDown={event => {
        const target = event.target as HTMLElement;
        if (!target.closest(".track-wheel-dialog, .folio-transition-clone")) onClose();
      }}
    >
      <motion.div className="track-wheel-overlay-scrim" style={{ opacity: scrimOpacity }} aria-hidden="true" />
      {showTransitionScene && <motion.div className="folio-transition-clone" style={clonePositionStyle} aria-hidden="true">
          <AlbumFolioVisual playlist={playlist} className="folio-transition-album" />
          <motion.span className="folio-transition-preview-pages" style={{ opacity: previewOpacity }}>
            {Array.from({ length: 3 }, (_, index) => <FolioPreviewPage key={index} index={index} progress={previewSpread} mobile={geometry.mobile} />)}
          </motion.span>
          <span className="folio-transition-caption">{playlist.title}</span>
        </motion.div>}

      <motion.section
        ref={dialog}
        className="track-wheel-dialog"
        data-transition-phase={transitionState}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={transitionState !== "open"}
        tabIndex={-1}
      >
        <motion.header style={{ opacity: controlsOpacity, pointerEvents: transitionState === "open" ? "auto" : "none" }}>
          <div>
            <p>CRYSTAL TRACK WHEEL</p>
            <h2 id={titleId}>{playlist.title}</h2>
          </div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="关闭曲目轮盘"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg></button>
        </motion.header>

        <motion.div className="track-wheel-entry track-wheel-final-stage" style={{ opacity: wheelOpacity, scale: wheelScale, scaleY: wheelScaleY, y: wheelY }}>
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

        <motion.div className="track-wheel-selected" style={{ opacity: controlsOpacity, pointerEvents: transitionState === "open" ? "auto" : "none" }}>
          <span>{String(selectedTrackIndex + 1).padStart(2, "0")} / {String(playlist.tracks.length).padStart(2, "0")}</span>
          <h3>{selectedTrack.title}</h3>
          <p>{selectedTrack.artist}{selectedTrack.album ? ` · ${selectedTrack.album}` : ""}</p>
          <small>{fmt(selectedTrack.durationMs)}</small>
          <button className="track-wheel-play" type="button" disabled={!selectedTrack.previewUrl} onClick={() => activateTrack(selectedTrackIndex)} aria-label={selectedTrack.previewUrl ? `播放 ${selectedTrack.title}` : `${selectedTrack.title} 暂不可试听`} title={selectedTrack.previewUrl ? `播放 ${selectedTrack.title}` : "当前曲目没有试听音频"}>
            <MusicControlIcon name="play" size={19} />
          </button>
          {!selectedTrack.previewUrl && <em>当前曲目不可试听；点击中央页片仍可选中</em>}
        </motion.div>
      </motion.section>
    </motion.div>
  );

  return typeof document === "undefined" ? overlay : createPortal(overlay, document.body);
}
