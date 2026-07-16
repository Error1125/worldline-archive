import { useState } from "react";
import { withBase } from "@/lib/paths";
import { getActivePlaylist, getTrack, nextTrack, prevTrack, setVolume, toggleMuted, togglePlaying, useMusicState } from "@/lib/music/store";
import MusicControlIcon from "@/components/music/MusicControlIcon";
const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
export default function MusicHeroPlayer() {
  const state = useMusicState(); const track = getTrack(); const playlist = getActivePlaylist(); const [tab, setTab] = useState<"info" | "lyrics">("info");
  if (!track) return <section className="crystal-music-terminal music-player-empty"><h2>播放列表为空</h2></section>;
  const duration = state.duration || (track.durationMs ?? 0) / 1000;
  const volume = state.volume ?? .8;
  const volumeIcon = state.muted || volume === 0 ? "volume-muted" : volume < .45 ? "volume-low" : "volume";
  const artwork = track.artworkUrl ? withBase(track.artworkUrl) : undefined;

  return <section className="crystal-music-terminal" aria-label="水晶音乐终端">
    <div className="terminal-player-pane">
      <div className="terminal-folio-visual" data-playing={state.playing} aria-label={`${playlist?.title ?? track.album ?? "当前专辑"}封面`}>
        <span className="terminal-folio-back" aria-hidden="true" />
        <span className="terminal-folio-pages" aria-hidden="true"><i /><i /><i /></span>
        <span className="terminal-folio-cover">
          {artwork ? <img src={artwork} alt={`${track.title} 封面`} /> : <b aria-hidden="true">WL</b>}
          <i className="terminal-cover-glare" aria-hidden="true" />
        </span>
        <span className="terminal-folio-spine" aria-hidden="true" />
      </div>

      <div className="terminal-track-block">
        <p className="terminal-kicker"><span>CRYSTAL MUSIC TERMINAL</span><b>{playlist?.title ?? "MUSIC ARCHIVE"}</b></p>
        <p className="terminal-album">{track.album ?? playlist?.title ?? "Worldline Music Archive"}</p>
        <h2>{track.title}</h2>
        <p className="terminal-byline">{track.artist}</p>
        <div className="terminal-progress" aria-label={`播放进度 ${fmt(state.currentTime)} / ${fmt(duration)}`}>
          <span><i style={{ width: `${Math.round(state.progress * 100)}%` }} /></span>
          <small><time>{fmt(state.currentTime)}</time><time>{duration ? fmt(duration) : "--:--"}</time></small>
        </div>
        <div className="terminal-control-deck" role="group" aria-label="播放与音量控制">
          <span className="terminal-transport">
            <button type="button" className="terminal-icon-button" onClick={prevTrack} aria-label="上一首"><MusicControlIcon name="previous" /></button>
            <button type="button" className="terminal-icon-button terminal-play-button" onClick={togglePlaying} disabled={!track.previewUrl} aria-label={track.previewUrl ? (state.playing ? "暂停试听" : "播放试听") : "当前曲目不可试听"} title={track.previewUrl ? undefined : "当前曲目不可试听"}><MusicControlIcon name={state.playing ? "pause" : "play"} size={22} /></button>
            <button type="button" className="terminal-icon-button" onClick={() => nextTrack()} aria-label="下一首"><MusicControlIcon name="next" /></button>
          </span>
          <span className="terminal-volume">
            <button type="button" className="terminal-icon-button" onClick={toggleMuted} aria-label={state.muted ? "恢复声音" : "静音"}><MusicControlIcon name={volumeIcon} /></button>
            <input type="range" min="0" max="1" step=".01" value={volume} onChange={e => setVolume(Number(e.target.value))} aria-label="音量" />
          </span>
        </div>
        {!track.previewUrl && <small className="terminal-preview-note">试听音源未收录</small>}
        {state.error && <p className="music-player-error" role="status">{state.error}</p>}
      </div>
    </div>

    <div className="terminal-context-pane">
      <div className="music-tabs" role="tablist" aria-label="曲目内容" data-active-tab={tab}>
        <button id="music-info-tab" type="button" role="tab" aria-selected={tab === "info"} aria-controls="music-info-panel" onClick={() => setTab("info")}>信息</button>
        <button id="music-lyrics-tab" type="button" role="tab" aria-selected={tab === "lyrics"} aria-controls="music-lyrics-panel" onClick={() => setTab("lyrics")}>歌词</button>
        <i aria-hidden="true" />
      </div>
      <div className="terminal-context-viewport">
        {tab === "info" ? <div id="music-info-panel" className="hero-info-panel" role="tabpanel" aria-labelledby="music-info-tab"><dl><div><dt>艺术家</dt><dd>{track.artist}</dd></div><div><dt>专辑</dt><dd>{track.album ?? "—"}</dd></div><div><dt>播放列表</dt><dd>{playlist?.title ?? "—"}</dd></div><div><dt>时长</dt><dd>{duration ? fmt(duration) : "—"}</dd></div></dl>{track.thoughts && <p className="hero-thoughts">{track.thoughts}</p>}</div> : <div id="music-lyrics-panel" className="hero-lyrics-panel" role="tabpanel" aria-labelledby="music-lyrics-tab"><span>LYRIC ARCHIVE</span><h3>暂无歌词</h3><p>{track.thoughts ?? "当前档案没有可展示的歌词内容。"}</p></div>}
      </div>
    </div>
  </section>;
}
