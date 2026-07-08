import { motion } from "motion/react";
import { withBase } from "@/lib/paths";
import { getTrack, nextTrack, playlist, togglePlaying, useMusicState } from "@/lib/music/store";

/**
 * MusicPlayer —— 首页 / 音乐页的「正在收听」mock 播放器（v3）。
 * 只做 UI：不真正播放音频、不做任何 OAuth。
 * v3：状态改由全局音乐 store 驱动 —— 与非首页的 GlobalMusicPlayer 共享
 * 同一份播放状态（曲目 / 播放中 / 进度），从首页开始播放后进入其他页面，
 * Mini Player 会无缝接管显示。
 */
export default function MusicPlayer() {
  const state = useMusicState();
  const t = getTrack(state.index);

  if (!t) {
    return (
      <div className="rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-4 text-sm text-[var(--ia-mist)]">
        暂无正在收听的曲目。
      </div>
    );
  }

  const playing = state.playing;
  const pct = Math.round(Math.min(1, Math.max(0, state.progress)) * 100);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-4">
      {/* 封面 */}
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-[var(--ia-line)]">
        {t.artworkUrl ? (
          <img src={withBase(t.artworkUrl)} alt={t.title} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center bg-[var(--ia-panel-strong)] text-[var(--ia-star)]">♪</div>
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
        <div className="mt-0.5 truncate text-base font-semibold text-[var(--ia-ink)]">{t.title}</div>
        <div className="truncate text-[13px] text-[var(--ia-mist)]">
          {t.artist}
          {t.album ? ` · ${t.album}` : ""}
        </div>

        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-1000 ease-linear"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--ia-neon), var(--ia-nebula))",
            }}
          />
        </div>
      </div>

      {/* 控制：播放/暂停 + 下一首（写入全局状态） */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={togglePlaying}
          aria-label={playing ? "暂停" : "播放"}
          className="clickable grid size-10 place-items-center rounded-full border border-[var(--ia-line-strong)] text-[var(--ia-ink)] transition-colors hover:border-[var(--ia-neon)] hover:text-[var(--ia-neon)]"
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
        {playlist.length > 1 && (
          <button
            type="button"
            onClick={nextTrack}
            aria-label="下一首"
            className="clickable grid size-9 place-items-center rounded-full border border-[var(--ia-line)] text-[var(--ia-mist)] transition-colors hover:border-[var(--ia-neon)] hover:text-[var(--ia-neon)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 5v14l8.5-7z" />
              <rect x="16" y="5" width="2.4" height="14" rx="1" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
