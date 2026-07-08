import { useEffect, useState } from "react";
import { withBase } from "@/lib/paths";
import { getTrack, nextTrack, playlist, togglePlaying, useMusicState } from "@/lib/music/store";

/**
 * GlobalMusicPlayer —— 非首页全局音乐浮球 / Mini Player（v3）。
 *
 * 展示规则：
 * - 首页（含 GitHub Pages base 路径，如 /worldline-archive/）：隐藏，由 NowPlayingCard 承担；
 * - 其他页面：桌面右下角胶囊播放器；移动端左下角小圆球（点击展开），
 *   放在左侧以避开右下角的移动端放射菜单按钮。
 * - 状态来自全局 store（transition:persist + localStorage），页面跳转 / 刷新不丢；
 * - day / night 样式全部走 CSS 变量，自动跟随主题。
 */

function isHomePath(pathname: string): boolean {
  const strip = (s: string) => (s.length > 1 && s.endsWith("/") ? s.slice(0, -1) : s);
  const base = strip(withBase("/")); // "/worldline-archive" 或 ""
  const path = strip(pathname);
  return path === base || path === "" || path === "/";
}

const PlayPauseIcon = ({ playing }: { playing: boolean }) =>
  playing ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );

const NextIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 5v14l8.5-7z" />
    <rect x="16" y="5" width="2.4" height="14" rx="1" />
  </svg>
);

export default function GlobalMusicPlayer() {
  const state = useMusicState();
  // 初始按「首页」处理，等 pathname 判定后再决定是否渲染，避免首页闪现浮球
  const [onHome, setOnHome] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const update = () => setOnHome(isHomePath(window.location.pathname));
    update();
    // 持久化 island 不会重挂载：监听换页事件重新判定
    document.addEventListener("astro:page-load", update);
    return () => document.removeEventListener("astro:page-load", update);
  }, []);

  // 换页后收起移动端展开面板
  useEffect(() => {
    const collapse = () => setExpanded(false);
    document.addEventListener("astro:after-swap", collapse);
    return () => document.removeEventListener("astro:after-swap", collapse);
  }, []);

  const track = getTrack(state.index);
  if (onHome || !track) return null;

  const pct = Math.round(Math.min(1, Math.max(0, state.progress)) * 100);
  const cover = track.artworkUrl ? withBase(track.artworkUrl) : undefined;
  const statusText = state.playing ? "now playing" : "paused";

  const Controls = (
    <span className="gm-controls">
      <button
        type="button"
        className="gm-btn clickable"
        onClick={togglePlaying}
        aria-label={state.playing ? "暂停" : "播放"}
      >
        <PlayPauseIcon playing={state.playing} />
      </button>
      {playlist.length > 1 && (
        <button type="button" className="gm-btn clickable" onClick={nextTrack} aria-label="下一首">
          <NextIcon />
        </button>
      )}
    </span>
  );

  return (
    <div className="gm-root" data-playing={state.playing ? "true" : "false"} data-expanded={expanded ? "true" : "false"}>
      {/* 桌面 / 平板：胶囊 mini player */}
      <div className="gm-pill" role="group" aria-label="全局音乐播放器">
        <span className="gm-cover" aria-hidden="true">
          {cover ? <img src={cover} alt="" draggable={false} /> : <span className="gm-cover-fallback">♪</span>}
        </span>
        <span className="gm-info">
          <b className="gm-title" title={track.title}>
            {track.title}
          </b>
          <span className="gm-artist mono">{track.artist}</span>
          <span className="gm-progress" aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </span>
        </span>
        {Controls}
      </div>

      {/* 移动端：小圆球 + 展开面板 */}
      <button
        type="button"
        className="gm-ball clickable"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? "收起音乐播放器" : `音乐：${track.title}（${statusText}）`}
      >
        {cover ? <img src={cover} alt="" draggable={false} /> : <span className="gm-cover-fallback">♪</span>}
        <span className="gm-ball-ring" aria-hidden="true" />
      </button>

      {expanded && (
        <div className="gm-sheet" role="group" aria-label="全局音乐播放器">
          <span className="gm-cover" aria-hidden="true">
            {cover ? <img src={cover} alt="" draggable={false} /> : <span className="gm-cover-fallback">♪</span>}
          </span>
          <span className="gm-info">
            <b className="gm-title" title={track.title}>
              {track.title}
            </b>
            <span className="gm-artist mono">{track.artist}</span>
            <span className="gm-progress" aria-hidden="true">
              <i style={{ width: `${pct}%` }} />
            </span>
          </span>
          {Controls}
        </div>
      )}
    </div>
  );
}
