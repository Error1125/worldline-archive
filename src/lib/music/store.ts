import { useSyncExternalStore } from "react";
import type { MusicArchiveTrack, MusicPlayerState } from "@/lib/apple-music/types";

const KEY = "wl-music-state-v2";
const LEGACY_KEY = "wl-music-state";
const EMPTY: MusicPlayerState = { playing: false, progress: 0, updatedAt: 0 };
let playlist: MusicArchiveTrack[] = [];
let audio: HTMLAudioElement | undefined;
let state: MusicPlayerState = EMPTY;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
function readPagePlaylist(): MusicArchiveTrack[] {
  if (typeof window === "undefined") return [];
  return (window as Window & { __WL_MUSIC_PLAYLIST__?: MusicArchiveTrack[] }).__WL_MUSIC_PLAYLIST__ ?? [];
}

function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
function restore() {
  try {
    const next = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY) || "{}") as { trackId?: string; index?: number; progress?: number };
    const trackId = next.trackId ?? playlist[next.index ?? -1]?.id;
    state = { trackId, playing: false, progress: Math.max(0, Math.min(1, Number(next.progress) || 0)), updatedAt: Date.now() };
  } catch { state = { ...EMPTY, trackId: playlist[0]?.id }; }
}
export function initializeMusicPlaylist(items: MusicArchiveTrack[]) {
  playlist = items;
  if (typeof window !== "undefined") restore();
  if (!state.trackId || !playlist.some((item) => item.id === state.trackId)) state = { ...state, trackId: playlist[0]?.id };
  notify();
}
export function getPlaylist() { return playlist; }
export function getTrack(trackId = state.trackId) { if (!playlist.length) initializeMusicPlaylist(readPagePlaylist()); return playlist.find((item) => item.id === trackId); }
function disposeAudio() { if (!audio) return; audio.pause(); audio.src = ""; audio.load(); audio = undefined; }
function setState(next: Partial<MusicPlayerState>) { state = { ...state, ...next, updatedAt: Date.now() }; save(); notify(); }
export function playTrack(trackId: string): boolean {
  const track = getTrack(trackId);
  if (!track?.previewUrl || typeof Audio === "undefined") { setState({ trackId, playing: false, progress: 0 }); return false; }
  if (!audio || state.trackId !== trackId) {
    disposeAudio(); audio = new Audio(track.previewUrl); audio.preload = "metadata";
    audio.addEventListener("timeupdate", () => setState({ progress: audio && audio.duration ? audio.currentTime / audio.duration : 0 }));
    audio.addEventListener("ended", () => setState({ playing: false, progress: 1 }));
    audio.addEventListener("error", () => setState({ playing: false }));
  }
  setState({ trackId, playing: true, progress: 0 });
  audio.play().catch(() => setState({ playing: false }));
  return true;
}
export function togglePlaying() { if (state.playing) { audio?.pause(); setState({ playing: false }); } else if (state.trackId) playTrack(state.trackId); }
export function stopPlaying() { audio?.pause(); setState({ playing: false }); }
export function nextTrack() { const index = playlist.findIndex((item) => item.id === state.trackId); const next = playlist[(index + 1) % playlist.length]; if (next) playTrack(next.id); }
export function getState() { return state; }
export function getServerState() { return EMPTY; }
export function subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function useMusicState() { return useSyncExternalStore(subscribe, getState, getServerState); }
