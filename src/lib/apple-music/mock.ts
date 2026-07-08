import type { AppleTrack, NowPlaying } from "./types";

/**
 * Apple Music mock 数据。
 * 曲目 / 艺人均为原创虚构名称，歌词一律不复制真实内容。
 */

export const mockTracks: AppleTrack[] = [
  {
    id: "trk_01",
    kind: "song",
    title: "Null Signal",
    artist: "Aoi Static",
    album: "Midnight Compile",
    artworkUrl: "/images/photos/ns-02.svg",
    durationMs: 254000,
  },
  {
    id: "trk_02",
    kind: "song",
    title: "Worldline 1.048596",
    artist: "kotoba.exe",
    album: "Save Point",
    artworkUrl: "/images/photos/cw-01.svg",
    durationMs: 231000,
  },
  {
    id: "trk_03",
    kind: "album",
    title: "Neon Afterglow",
    artist: "hikari drift",
    album: "Neon Afterglow",
    artworkUrl: "/images/photos/ns-04.svg",
  },
  {
    id: "trk_04",
    kind: "playlist",
    title: "深夜 Debug 循环",
    artist: "traveler",
    artworkUrl: "/images/photos/ol-01.svg",
  },
];

export const mockNowPlaying: NowPlaying = {
  isPlaying: false,
  track: mockTracks[0],
  progress: 0.38,
};
