import { useSyncExternalStore } from "react";
import { mockTracks } from "@/lib/apple-music/mock";
import type { AppleTrack } from "@/lib/apple-music/types";

/**
 * 全局音乐播放状态 store（v3）。
 * - 首页 NowPlayingCard(MusicPlayer) 与非首页 GlobalMusicPlayer 共用同一份状态；
 * - View Transitions 下 JS 上下文常驻，模块单例天然跨页；localStorage 兜底刷新后恢复；
 * - 仍是 mock 播放（不出声），进度按曲目时长匀速推进，结束自动切下一首；
 * - 后续接入 Apple Music / 真实歌单时，替换 playlist 与 tick 数据源即可。
 */

export interface MusicState {
  /** 当前曲目在 playlist 中的下标 */
  index: number;
  playing: boolean;
  /** 播放进度 0..1 */
  progress: number;
  /** 最近一次写入的时间戳（ms），用于按经过时间推进进度 */
  updatedAt: number;
}

const KEY = "wl-music-state";
const DEFAULT_DURATION_MS = 240_000;

/** 播放列表：取 mock 中带封面的曲目 */
export const playlist: AppleTrack[] = mockTracks.filter((t) => t.artworkUrl);

const FALLBACK_STATE: MusicState = { index: 0, playing: false, progress: 0.35, updatedAt: 0 };

function clampIndex(i: number): number {
  if (!Number.isFinite(i) || playlist.length === 0) return 0;
  return ((Math.trunc(i) % playlist.length) + playlist.length) % playlist.length;
}

function load(): MusicState {
  if (typeof window === "undefined") return FALLBACK_STATE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...FALLBACK_STATE, updatedAt: Date.now() };
    const parsed = JSON.parse(raw) as Partial<MusicState>;
    return {
      index: clampIndex(parsed.index ?? 0),
      // 刷新后不自动续播（浏览器也不允许无手势自动播放的观感），保留进度
      playing: false,
      progress: Math.min(0.999, Math.max(0, Number(parsed.progress) || 0)),
      updatedAt: Date.now(),
    };
  } catch {
    return { ...FALLBACK_STATE, updatedAt: Date.now() };
  }
}

let state: MusicState = load();
const listeners = new Set<() => void>();
let timer: number | null = null;

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

function emit() {
  listeners.forEach((fn) => fn());
}

function durationOf(index: number): number {
  return playlist[index]?.durationMs ?? DEFAULT_DURATION_MS;
}

/** 把 updatedAt → now 之间的时长结算进 progress */
function settle(now: number) {
  if (!state.playing) {
    state = { ...state, updatedAt: now };
    return;
  }
  const advanced = state.progress + (now - state.updatedAt) / durationOf(state.index);
  if (advanced >= 1) {
    // 播完自动切下一首
    state = { index: clampIndex(state.index + 1), playing: true, progress: 0, updatedAt: now };
  } else {
    state = { ...state, progress: advanced, updatedAt: now };
  }
}

function tick() {
  settle(Date.now());
  persist();
  emit();
}

function ensureTimer() {
  if (typeof window === "undefined") return;
  if (state.playing && timer == null) {
    timer = window.setInterval(tick, 1000);
  } else if (!state.playing && timer != null) {
    window.clearInterval(timer);
    timer = null;
  }
}

// ---- 对外 API ----

export function getState(): MusicState {
  return state;
}

export function getServerState(): MusicState {
  return FALLBACK_STATE;
}

export function getTrack(index = state.index): AppleTrack | undefined {
  return playlist[clampIndex(index)];
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setPlaying(playing: boolean) {
  const now = Date.now();
  settle(now);
  state = { ...state, playing, updatedAt: now };
  persist();
  ensureTimer();
  emit();
}

export function togglePlaying() {
  setPlaying(!state.playing);
}

export function nextTrack() {
  state = {
    index: clampIndex(state.index + 1),
    playing: state.playing,
    progress: 0,
    updatedAt: Date.now(),
  };
  persist();
  emit();
}

export function prevTrack() {
  state = {
    index: clampIndex(state.index - 1),
    playing: state.playing,
    progress: 0,
    updatedAt: Date.now(),
  };
  persist();
  emit();
}

/** React hook：订阅全局音乐状态（SSR 安全） */
export function useMusicState(): MusicState {
  return useSyncExternalStore(subscribe, getState, getServerState);
}
