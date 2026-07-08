/**
 * Apple Music 数据类型（预留）。
 * 第一版仅 UI + mock；未来接 MusicKit / Apple Music API 时复用。
 */

export type MusicKind = "song" | "album" | "playlist";

export interface AppleTrack {
  id: string;
  kind: MusicKind;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string; // 第一版指向本地占位
  appleMusicUrl?: string;
  durationMs?: number;
}

export interface NowPlaying {
  isPlaying: boolean;
  track?: AppleTrack;
  /** 0-1 播放进度，第一版为静态展示 */
  progress?: number;
}

export interface AppleMusicAuthState {
  connected: boolean;
  userToken?: string;
}
