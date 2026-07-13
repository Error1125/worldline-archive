import { useSyncExternalStore } from "react";
import type { MusicArchiveTrack, MusicPlayerState, MusicPlaylist } from "@/lib/apple-music/types";

const KEY = "wl-music-state-v3";
const EMPTY: MusicPlayerState = { playing: false, currentTime: 0, duration: 0, progress: 0, muted: false, updatedAt: 0 };
let playlists: MusicPlaylist[] = [];
let state: MusicPlayerState = EMPTY;
let audio: HTMLAudioElement | undefined;
let restored = false;
let playlistSignature = "";
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const allTracks = () => playlists.flatMap((playlist) => playlist.tracks);
const getPlaylistById = (id = state.playlistId) => playlists.find((playlist) => playlist.id === id);
const findTrack = (trackId = state.trackId) => allTracks().find((track) => track.id === trackId);
function pagePlaylists() { return typeof window === "undefined" ? [] : (window as Window & { __WL_MUSIC_PLAYLISTS__?: MusicPlaylist[] }).__WL_MUSIC_PLAYLISTS__ ?? []; }
function persist() { try { localStorage.setItem(KEY, JSON.stringify({ playlistId: state.playlistId, trackId: state.trackId, muted: state.muted })); } catch {} }
function apply(next: Partial<MusicPlayerState>) { state = { ...state, ...next, updatedAt: Date.now() }; persist(); notify(); }
function defaultPlaylist() { return playlists.find((playlist) => playlist.featured) ?? playlists[0]; }
function safeInitialState(saved: Partial<MusicPlayerState>): MusicPlayerState {
  const playlist = playlists.find((item) => item.id === saved.playlistId) ?? defaultPlaylist();
  const track = playlist?.tracks.find((item) => item.id === saved.trackId) ?? playlist?.tracks.find((item) => item.featured) ?? playlist?.tracks[0];
  return { ...EMPTY, playlistId: playlist?.id, trackId: track?.id, muted: saved.muted === true, updatedAt: Date.now() };
}
export function restoreMusicState() {
  if (restored || typeof window === "undefined") return;
  restored = true;
  try { state = safeInitialState(JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<MusicPlayerState>); } catch { state = safeInitialState({}); }
  notify();
}
function syncAudioState() { if (!audio) return; apply({ currentTime: audio.currentTime || 0, duration: Number.isFinite(audio.duration) ? audio.duration : 0, progress: audio.duration ? audio.currentTime / audio.duration : 0 }); }
function clearAudio() { if (!audio) return; audio.pause(); audio.src = ""; audio.load(); audio = undefined; }
function audioFor(track: MusicArchiveTrack): HTMLAudioElement {
  if (audio && audio.src === track.previewUrl) return audio;
  clearAudio(); audio = new Audio(track.previewUrl); audio.preload = "metadata"; audio.muted = state.muted;
  audio.addEventListener("loadedmetadata", syncAudioState); audio.addEventListener("timeupdate", syncAudioState);
  audio.addEventListener("pause", () => apply({ playing: false }));
  audio.addEventListener("ended", () => nextTrack());
  audio.addEventListener("error", () => apply({ playing: false, error: "试听音频暂不可用" }));
  return audio;
}
export function initializeMusicPlaylists(items: MusicPlaylist[]) {
  const signature = items.map((playlist) => `${playlist.id}:${playlist.tracks.map((track) => track.id).join(",")}`).join("|");
  if (signature === playlistSignature) return;
  playlistSignature = signature; playlists = items; state = safeInitialState(state); notify();
}
export function getPlaylists() { if (!playlists.length) initializeMusicPlaylists(pagePlaylists()); return playlists; }
export function getActivePlaylist() { getPlaylists(); return getPlaylistById(); }
export function getTrack(trackId = state.trackId) { getPlaylists(); return findTrack(trackId); }
export function selectPlaylist(playlistId: string) { if (playlists.some((playlist) => playlist.id === playlistId)) apply({ playlistId }); }
export function selectTrack(playlistId: string, trackId: string) { if (getPlaylistById(playlistId)?.tracks.some((track) => track.id === trackId)) apply({ playlistId, trackId, currentTime: 0, duration: 0, progress: 0, error: undefined }); }
export function playTrack(trackId = state.trackId, playlistId = state.playlistId) {
  const playlist = getPlaylistById(playlistId); const track = playlist?.tracks.find((item) => item.id === trackId) ?? findTrack(trackId);
  if (!track?.previewUrl || typeof Audio === "undefined") { apply({ playlistId, trackId, playing: false, currentTime: 0, duration: 0, progress: 0, error: "试听未配置" }); return false; }
  const player = audioFor(track); apply({ playlistId, trackId: track.id, playing: true, error: undefined, currentTime: 0, duration: 0, progress: 0 });
  player.play().catch(() => apply({ playing: false, error: "浏览器阻止了试听播放" })); return true;
}
export function togglePlaying() { if (state.playing) { audio?.pause(); return; } playTrack(); }
export function toggleMuted() { const muted = !state.muted; if (audio) audio.muted = muted; apply({ muted }); }
export function nextTrack(direction = 1) { const playlist = getPlaylistById(); if (!playlist?.tracks.length) return; const index = playlist.tracks.findIndex((track) => track.id === state.trackId); const next = playlist.tracks[(index + direction + playlist.tracks.length) % playlist.tracks.length]; if (next) playTrack(next.id, playlist.id); }
export const prevTrack = () => nextTrack(-1);
export function getState() { return state; }
export function getServerState() { return EMPTY; }
export function subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function useMusicState() { return useSyncExternalStore(subscribe, getState, getServerState); }
