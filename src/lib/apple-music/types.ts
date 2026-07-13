/**
 * Apple Music 数据类型（预留）。
 * 第一版仅 UI + mock；未来接 MusicKit / Apple Music API 时复用。
 */

export type MusicKind = "song" | "album" | "playlist";
export type MusicArchiveStatus = "favorite" | "rotation" | "memory" | "archived";

export interface AppleMusicMetadata {
  id?: string; url?: string; storefront?: string; artworkUrl?: string; previewUrl?: string;
  releaseDate?: string; durationMs?: number; genres?: string[];
}

export interface MusicArchiveTrack {
  id: string; slug: string; href: string; kind: MusicKind; title: string; artist: string;
  album?: string; artworkUrl?: string; appleMusicUrl?: string; previewUrl?: string;
  durationMs?: number; releaseDate?: string; genres: string[]; date: string; tags: string[];
  moods: string[]; thoughts?: string; rating?: number; status?: MusicArchiveStatus; featured: boolean;
}

export interface PlayableMusicTrack extends MusicArchiveTrack { previewUrl: string; }

export interface MusicPlayerState { trackId?: string; playing: boolean; progress: number; updatedAt: number; }

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
