import { useState } from "react";
import { motion } from "motion/react";
import type { AppleTrack } from "@/lib/apple-music/types";
import { mockNowPlaying } from "@/lib/apple-music/mock";

/**
 * MusicPlayer —— 首页 / 音乐页的「正在收听」mock 播放器。
 * 只做 UI：不真正播放音频、不做任何 OAuth。
 * 播放/暂停只切换律动条与进度动画的观感。
 */
interface Props {
  track?: AppleTrack;
  initialProgress?: number;
}

export default function MusicPlayer({
  track = mockNowPlaying.track,
  initialProgress = mockNowPlaying.progress ?? 0.35,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const t = track;

  if (!t) {
    return (
      <div className="rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-4 text-sm text-[var(--ia-mist)]">
        暂无正在收听的曲目。
      </div>
    );
  }

  const pct = Math.round(initialProgress * 100);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-4">
      {/* 封面 */}
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-[var(--ia-line)]">
        {t.artworkUrl ? (
          <img src={t.artworkUrl} alt={t.title} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center bg-[#0b1024] text-[var(--ia-star)]">♪</div>
        )}
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={{ opacity: playing ? [0.15, 0.4, 0.15] : 0 }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ background: "radial-gradient(circle at 50% 50%, var(--ia-neon), transparent 70%)" }}
        />
      </div>

      {/* 信息 + 进度 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ia-mist)]">
            {playing ? "now playing" : "paused"}
          </span>
          <span className="eq" aria-hidden="true" style={{ opacity: playing ? 1 : 0.25 }}>
            <i /><i /><i /><i />
          </span>
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold text-[var(--ia-ink)]">{t.title}</div>
        <div className="truncate text-xs text-[var(--ia-mist)]">
          {t.artist}
          {t.album ? ` · ${t.album}` : ""}
        </div>

        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, var(--ia-neon), var(--ia-nebula))" }}
            initial={{ width: `${pct}%` }}
            animate={{ width: playing ? "100%" : `${pct}%` }}
            transition={{ duration: playing ? 40 : 0.4, ease: "linear" }}
          />
        </div>
      </div>

      {/* 播放/暂停（仅切换观感） */}
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "暂停" : "播放"}
        className="clickable grid size-10 shrink-0 place-items-center rounded-full border border-[var(--ia-line-strong)] text-[var(--ia-ink)] transition-colors hover:border-[var(--ia-neon)] hover:text-[var(--ia-neon)]"
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}
