import { useEffect, useId, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
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
type TransitionScene = "folio" | "wheel";

const VEIL_SCENE_SWAP_PROGRESS = .62;

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

async function prepareTransitionResources(root: HTMLElement | null) {
  void document.fonts.ready;
  const images = root ? [...root.querySelectorAll<HTMLImageElement>("img")] : [];
  void Promise.all(images.map(async image => {
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
  const transitionScene = useRef<HTMLDivElement>(null);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const preparation = useRef(0);
  const transitionStateRef = useRef(transitionState);
  transitionStateRef.current = transitionState;
  const transitionProgress = useMotionValue(0);
  const [showTransitionScene, setShowTransitionScene] = useState(true);
  const [activeScene, setActiveScene] = useState<TransitionScene>("folio");
  const activeSceneRef = useRef<TransitionScene>("folio");
  const geometry = useMemo(() => getTransitionGeometry(sourceRect), [sourceRect]);

  const scrimOpacity = useTransform(transitionProgress, [0, .08, .5, 1], [0, .12, 1, 1]);
  const cloneX = useTransform(transitionProgress, [0, .06, .46, 1], [geometry.sourceX, geometry.sourceX, 0, 0]);
  const cloneY = useTransform(transitionProgress, [0, .06, .22, .46, 1], [geometry.sourceY, geometry.sourceY, geometry.sourceY - 12, 0, 0]);
  const cloneScale = useTransform(transitionProgress, [0, .06, .22, .46, 1], [geometry.sourceScale, geometry.sourceScale, geometry.sourceScale * 1.035, 1, 1]);
  const cloneOpacity = useTransform(transitionProgress, [0, .54, .6, VEIL_SCENE_SWAP_PROGRESS, 1], [1, 1, 1, 0, 0]);
  const coverRotateY = useTransform(
    transitionProgress,
    reducedMotion ? [0, .12, .5, 1] : [0, .14, .5, 1],
    reducedMotion ? ["0deg", "0deg", "-18deg", "-18deg"] : ["0deg", "0deg", "-64deg", "-64deg"],
  );
  const previewSpread = useTransform(
    transitionProgress,
    [0, .26, .58, 1],
    reducedMotion ? [0, 0, .38, .38] : [0, 0, 1, 1],
  );
  const previewOpacity = useTransform(transitionProgress, [0, .24, .32, .56, VEIL_SCENE_SWAP_PROGRESS, 1], [0, 0, 1, 1, 0, 0]);
  const veilOpacity = useTransform(transitionProgress, [0, .36, .48, .52, .82, .94, 1], [0, 0, .9, 1, 1, .16, 0]);
  const veilScaleX = useTransform(transitionProgress, [0, .36, .52, .82, 1], [.05, .05, 1.08, 1.18, 1.32]);
  const veilScaleY = useTransform(transitionProgress, [0, .36, .52, .82, 1], [.08, .08, 1.02, 1.14, 1.28]);
  const veilRotate = useTransform(transitionProgress, [0, .4, .58, 1], ["-8deg", "-8deg", "0deg", "2deg"]);
  const wheelOpacity = useTransform(transitionProgress, [0, .6, .66, .74, 1], [0, 0, .35, 1, 1]);
  const wheelScale = useTransform(transitionProgress, [0, .6, .7, .95, 1], [.94, .94, .965, 1, 1]);
  const wheelScaleY = useTransform(transitionProgress, [0, .6, .7, .95, 1], [.82, .82, .9, 1, 1]);
  const wheelY = useTransform(transitionProgress, [0, .6, .72, .95, 1], [14, 14, 8, 0, 0]);
  const controlsOpacity = useTransform(transitionProgress, [0, .78, 1], [0, 0, 1]);

  const switchScene = (nextScene: TransitionScene) => {
    if (activeSceneRef.current === nextScene) return;
    activeSceneRef.current = nextScene;
    setActiveScene(nextScene);
  };

  useMotionValueEvent(transitionProgress, "change", latest => {
    const state = transitionStateRef.current;
    if (state === "opening" && latest >= VEIL_SCENE_SWAP_PROGRESS) switchScene("wheel");
    if (state === "closing" && latest <= VEIL_SCENE_SWAP_PROGRESS) switchScene("folio");
  });

  const initialTrackIndex = Math.max(0, playlist.tracks.findIndex(track => track.id === getState().trackId));
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(initialTrackIndex);
  const selectedTrack = playlist.tracks[selectedTrackIndex] ?? playlist.tracks[0];

  useEffect(() => {
    animation.current?.stop();
    const runId = ++preparation.current;

    if (transitionState === "opening") {
      void (async () => {
        await prepareTransitionResources(transitionScene.current);
        if (runId !== preparation.current || transitionState !== "opening") return;
        const duration = reducedMotion ? .18 : geometry.mobile ? .58 : .74;
        const controls = animate(transitionProgress, 1, { duration, ease: [0.4, 0, 0.2, 1] });
        animation.current = controls;
        await controls;
        if (runId !== preparation.current) return;
        transitionProgress.set(1);
        switchScene("wheel");
        animation.current = null;
        setShowTransitionScene(false);
        onOpened();
      })();
    } else if (transitionState === "closing") {
      void (async () => {
        const currentProgress = Math.max(0, Math.min(1, transitionProgress.get()));
        setShowTransitionScene(true);
        await nextFrame();
        await nextFrame();
        if (runId !== preparation.current) return;
        const baseDuration = reducedMotion ? .18 : geometry.mobile ? .6 : .74;
        const controls = animate(transitionProgress, 0, {
          duration: Math.max(.08, baseDuration * Math.max(.2, currentProgress)),
          ease: [0.4, 0, 0.2, 1],
        });
        animation.current = controls;
        await controls;
        if (runId !== preparation.current) return;
        transitionProgress.set(0);
        switchScene("folio");
        animation.current = null;
        setShowTransitionScene(false);
        onClosed();
      })();
    }

    return () => {
      preparation.current += 1;
      animation.current?.stop();
    };
  }, [geometry.mobile, onClosed, onOpened, reducedMotion, transitionProgress, transitionState]);

  useEffect(() => {
    document.documentElement.dataset.musicOverlayScene = activeScene;
    return () => { delete document.documentElement.dataset.musicOverlayScene; };
  }, [activeScene]);

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
      data-transition-scene={activeScene}
      data-transition-layer={showTransitionScene}
      style={{ "--folio-open-progress": transitionProgress } as never}
      onPointerDown={event => {
        const target = event.target as HTMLElement;
        if (!target.closest(".track-wheel-dialog, .folio-transition-clone")) onClose();
      }}
    >
      <motion.div className="track-wheel-overlay-scrim" style={{ opacity: scrimOpacity }} aria-hidden="true" />
      {showTransitionScene && <div ref={transitionScene} className="folio-transition-scene" aria-hidden="true">
        <motion.div className="folio-transition-clone" style={clonePositionStyle}>
          <AlbumFolioVisual playlist={playlist} className="folio-transition-album" />
          <motion.span className="folio-transition-preview-pages" style={{ opacity: previewOpacity }}>
            {Array.from({ length: 3 }, (_, index) => <FolioPreviewPage key={index} index={index} progress={previewSpread} mobile={geometry.mobile} />)}
          </motion.span>
          <span className="folio-transition-caption">{playlist.title}</span>
        </motion.div>
        <motion.div className="crystal-veil" style={{ opacity: veilOpacity, scaleX: veilScaleX, scaleY: veilScaleY, rotate: veilRotate }} />
      </div>}

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
