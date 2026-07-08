import type { AppleMusicAuthState, AppleTrack, NowPlaying } from "./types";
import { mockNowPlaying, mockTracks } from "./mock";

/**
 * Apple Music client（预留）。第一版返回 mock，不做真实登录。
 *
 * TODO(未来接真实服务)：
 * - 前端接入 MusicKit JS 获取 user token；
 * - 后端用 Apple Developer 私钥签发 developer token（放服务端 / 环境变量，切勿写死）；
 * - 通过 Apple Music API 拉取 heavy rotation / recent played / 歌单；
 * - 注意 Apple 对歌词有版权限制，站内只放原创短句。
 */

export async function getRecentlyLiked(): Promise<AppleTrack[]> {
  return mockTracks;
}

export async function getNowPlaying(): Promise<NowPlaying> {
  return mockNowPlaying;
}

export function getAuthState(): AppleMusicAuthState {
  // 第一版永远未连接
  return { connected: false };
}
