/**
 * AppleMusicConnectButton —— 「未来连接 Apple Music」的 disabled 按钮。
 * 第一版不做任何真实登录 / MusicKit 授权，也不持有任何 token。
 */
export default function AppleMusicConnectButton() {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="即将支持：未来通过 MusicKit 连接 Apple Music"
        className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] px-4 py-2.5 text-sm text-[var(--ia-mist)] opacity-70"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9 18V6l10-2v12" />
          <circle cx="6.5" cy="18" r="2.5" />
          <circle cx="16.5" cy="16" r="2.5" />
        </svg>
        <span>连接 Apple Music</span>
        <span className="rounded-full border border-[var(--ia-line)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--ia-nebula)]">
          soon
        </span>
      </button>
      <p className="font-mono text-[11px] leading-relaxed text-[var(--ia-mist)] opacity-70">
        // 未来将通过 MusicKit 授权，developer token 由服务端签发，前端不写死密钥。
      </p>
    </div>
  );
}
