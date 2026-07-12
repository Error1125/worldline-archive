/**
 * Admin Console UI 原语（v5.0，React）。
 *
 * - 全部使用站点既有 CSS 设计令牌（--ia-*），昼夜模式自动生效；
 * - mobile-first：大点击区（≥44px）、单列、不依赖 hover；
 * - Icon.astro 是 Astro 组件，React 端用这里的内联 SVG（AdminIcon）。
 */

import React, { useState, useEffect, useCallback } from "react";

/* ---------------- icons（内联 SVG，路径与站点 Icon.astro 视觉一致风格） ---------------- */

const ICON_PATHS: Record<string, React.ReactNode> = {
  home: (
    <path d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="3" width="8" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="11" width="8" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="15" width="8" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </>
  ),
  publish: (
    <path d="M12 20V7m0 0-5 5m5-5 5 5M5 4h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  media: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8.5" cy="10" r="1.6" fill="currentColor" />
      <path d="m4 18 5.2-5.2 3.3 3.3 3-3L21 18.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 2.8v2.7m0 13v2.7M4.2 12H2.8m18.4 0h-1.4M5.5 5.5l1.9 1.9m9.2 9.2 1.9 1.9m0-13-1.9 1.9M7.4 16.6l-1.9 1.9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  moment: (
    <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3c-1.5 0-2.9-.3-4.1-1L3 20l1.3-4.2A8 8 0 0 1 3.5 11.5 8.4 8.4 0 0 1 12 3.2a8.4 8.4 0 0 1 9 8.3Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  ),
  post: (
    <>
      <path d="M6 3.5h9.5L19 7v13.5H6Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 11h7M9 14.5h7M9 7.5h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  photo: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 6 10 3.5h4L15.5 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </>
  ),
  project: (
    <path d="m14.5 6.5 3 3L9 18l-4 1 1-4 8.5-8.5Zm2-2 1.6-1.6a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L19.5 7.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  ),
  music: (
    <>
      <path d="M9 17.5V5.8l10-2v11.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="6.6" cy="17.6" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.6" cy="15.4" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </>
  ),
  anime: (
    <>
      <rect x="3" y="6.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m8 3 4 3.5L16 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m10.5 10.5 4 2.5-4 2.5Z" fill="currentColor" />
    </>
  ),
  bug: (
    <>
      <ellipse cx="12" cy="13.5" rx="5" ry="6" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5V20M8.5 8 6 5.5M15.5 8 18 5.5M7 12H3.5m17 0H17m-9.5 4.5L5 19m14-2.5-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
    </>
  ),
  logout: (
    <path d="M14 4h5v16h-5M10 8l-4 4 4 4m-4-4h11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  check: (
    <path d="m4.5 12.5 5 5L19.5 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  warn: (
    <path d="M12 3.5 22 20H2L12 3.5Zm0 6v5m0 2.6v.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  external: (
    <path d="M10 5H5v14h14v-5M14 4h6v6m0-6L11 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  arrow: (
    <path d="M4 12h15m0 0-6-6m6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  refresh: (
    <path d="M20 12a8 8 0 1 1-2.6-5.9M20 3v4.5h-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  plus: (
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  ),
  close: (
    <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 15H4V4h11v1" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </>
  ),
  worldline: (
    <path d="M3 15c2.5 0 2.5-8 5-8s2.5 10 5 10 2.5-12 5-12 1.5 6 3 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 2.5v2.4m0 14.2v2.4M2.5 12h2.4m14.2 0h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  moon: (
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  ),
  trash: (
    <path d="M4 6.5h16M9 6.5V4.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3v1.7M6.5 6.5 7.4 20h9.2l.9-13.5M10 10.5v6m4-6v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  save: (
    <path d="M5 4h11l3 3v13H5Zm3 0v5h7V4M8 13h8v7H8Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  ),
  github: (
    <path d="M12 2.8a9.2 9.2 0 0 0-2.9 17.9c.5.1.6-.2.6-.5v-1.7c-2.6.6-3.1-1.2-3.1-1.2-.4-1-1-1.3-1-1.3-.9-.6.1-.6.1-.6.9.1 1.4 1 1.4 1 .9 1.4 2.2 1 2.8.8.1-.6.3-1 .6-1.3-2-.2-4.2-1-4.2-4.6 0-1 .4-1.8 1-2.5-.1-.2-.4-1.2.1-2.4 0 0 .8-.3 2.5 1a8.7 8.7 0 0 1 4.6 0c1.7-1.3 2.5-1 2.5-1 .5 1.2.2 2.2.1 2.4.6.7 1 1.5 1 2.5 0 3.6-2.2 4.4-4.3 4.6.4.3.7.9.7 1.8v2.6c0 .3.1.6.6.5A9.2 9.2 0 0 0 12 2.8Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  ),
  drafts: (
    <>
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M4 7.5 12 12l8-4.5M12 12v9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </>
  ),
  menu: (
    <path d="M4 6.5h16M4 12h16M4 17.5h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11v5.5m0-8.6v-.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m15.5 15.5 5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  upload: (
    <path d="M12 15V4m0 0-4 4m4-4 4 4M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4.5 6.5C3 8 2.5 12 2.5 12S6 18.2 12 18.2c1.4 0 2.7-.3 3.8-.9M9 6.2c.9-.3 1.9-.4 3-.4 6 0 9.5 6.2 9.5 6.2s-.8 1.5-2.4 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m4 4 16 16M9.9 9.9a2.8 2.8 0 0 0 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
};

export function AdminIcon({
  name,
  size = 18,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name] ?? ICON_PATHS.moment}
    </svg>
  );
}

/* ---------------- buttons ---------------- */

export type BtnKind = "primary" | "secondary" | "ghost" | "danger" | "icon" | "link";

/**
 * v5.4 统一按钮：
 * - loading：显示 Spinner，同时保留原文案占位（宽度不跳），并禁用防重复提交；
 * - focus-visible：统一 neon 焦点环（.adm-ring）；
 * - kind=icon：方形图标按钮（需自带 aria-label）；kind=link：文本链接样式按钮。
 */
export function Btn({
  children,
  kind = "ghost",
  size = "md",
  loading = false,
  disabled,
  full,
  type = "button",
  className = "",
  ref,
  ...rest
}: Omit<React.ComponentProps<"button">, "type"> & {
  kind?: BtnKind;
  size?: "md" | "sm";
  loading?: boolean;
  full?: boolean;
  type?: "button" | "submit";
}) {
  const isIcon = kind === "icon";
  const isLink = kind === "link";
  const sizing = isIcon
    ? size === "sm"
      ? "size-9 rounded-lg"
      : "size-11 rounded-xl"
    : isLink
      ? "min-h-[32px] px-1 rounded-md"
      : size === "sm"
        ? "min-h-[36px] rounded-lg px-3 text-[13px]"
        : "min-h-[44px] rounded-xl px-4 text-sm";
  const base = `adm-ring clickable relative inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 motion-safe:active:scale-[0.98] ${sizing}`;
  /* v5.4.1 Hotfix-04：每个 kind 都具备独立的 hover / active / focus-visible /
     loading / disabled 反馈；位移类按压（scale）走 motion-safe，
     reduced-motion 下自动取消位移但保留颜色 / 边框反馈。 */
  const kinds: Record<BtnKind, string> = {
    primary:
      "border border-[color-mix(in_srgb,var(--ia-neon)_55%,transparent)] bg-[color-mix(in_srgb,var(--ia-neon)_16%,transparent)] text-[var(--ia-neon)] hover:border-[color-mix(in_srgb,var(--ia-neon)_75%,transparent)] hover:bg-[color-mix(in_srgb,var(--ia-neon)_24%,transparent)] active:bg-[color-mix(in_srgb,var(--ia-neon)_30%,transparent)]",
    secondary:
      "border border-[var(--ia-line-strong)] bg-[var(--ia-panel-strong)] text-[var(--ia-ink)] hover:border-[color-mix(in_srgb,var(--ia-neon)_45%,var(--ia-line-strong))] hover:text-[var(--ia-neon)] active:bg-[color-mix(in_srgb,var(--ia-neon)_10%,var(--ia-panel-strong))] active:text-[var(--ia-neon)]",
    ghost:
      "border border-[var(--ia-line)] bg-[var(--ia-panel)] text-[var(--ia-mist)] hover:border-[var(--ia-line-strong)] hover:bg-[var(--ia-panel-strong)] hover:text-[var(--ia-ink)] active:bg-[var(--ia-panel-strong)] active:text-[var(--ia-ink)]",
    danger:
      "border border-[color-mix(in_srgb,var(--ia-danger)_50%,transparent)] bg-[color-mix(in_srgb,var(--ia-danger)_12%,transparent)] text-[var(--ia-danger)] hover:border-[color-mix(in_srgb,var(--ia-danger)_70%,transparent)] hover:bg-[color-mix(in_srgb,var(--ia-danger)_20%,transparent)] active:bg-[color-mix(in_srgb,var(--ia-danger)_28%,transparent)]",
    icon:
      "border border-[var(--ia-line)] bg-[var(--ia-panel)] text-[var(--ia-mist)] hover:border-[var(--ia-line-strong)] hover:bg-[var(--ia-panel-strong)] hover:text-[var(--ia-ink)] active:bg-[var(--ia-panel-strong)] active:text-[var(--ia-ink)]",
    link:
      "border-0 bg-transparent px-1 text-sm text-[var(--ia-neon)] underline-offset-4 hover:underline active:opacity-75",
  };
  const sp = isIcon ? 14 : size === "sm" ? 13 : 15;
  return (
    <button
      type={type}
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${kinds[kind]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <span className="invisible inline-flex items-center gap-2" aria-hidden="true">
            {children}
          </span>
          <span className="absolute inset-0 grid place-items-center">
            <Spinner size={sp} />
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

/* ---------------- form primitives ---------------- */

const controlCls =
  "w-full rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] px-3.5 py-3 text-sm text-[var(--ia-ink)] outline-none transition-colors placeholder:text-[color-mix(in_srgb,var(--ia-mist)_55%,transparent)] focus:border-[var(--ia-neon)]";

export function Field({
  label,
  required,
  help,
  invalid,
  error,
  fieldId,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  /** 校验未通过：标签变红、子控件描红（配合提交时定位滚动）。 */
  invalid?: boolean;
  /** 具体错误文案（优先于 help 展示）。 */
  error?: string;
  /** 写入 data-field，供“定位到第一个错误字段”滚动查询。 */
  fieldId?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block" data-field={fieldId}>
      <span
        className={`mb-1.5 flex items-baseline gap-1.5 text-xs font-semibold ${invalid ? "text-[var(--ia-danger)]" : "text-[var(--ia-mist)]"}`}
      >
        {label}
        {required && <span className="text-[var(--ia-danger)]">*</span>}
      </span>
      <span
        className={
          invalid
            ? "block [&>input]:!border-[var(--ia-danger)] [&>textarea]:!border-[var(--ia-danger)] [&>button]:!border-[var(--ia-danger)] [&>div>input]:!border-[var(--ia-danger)]"
            : "block"
        }
      >
        {children}
      </span>
      {invalid && error ? (
        <span className="mt-1 block text-[11px] leading-relaxed text-[var(--ia-danger)]">{error}</span>
      ) : help ? (
        <span className="mt-1 block text-[11px] leading-relaxed text-[color-mix(in_srgb,var(--ia-mist)_70%,transparent)]">
          {help}
        </span>
      ) : null}
    </label>
  );
}

export function Input(props: React.ComponentProps<"input">) {
  return <input {...props} className={`${controlCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${controlCls} min-h-[90px] leading-relaxed ${props.className ?? ""}`}
    />
  );
}

export function Select({
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
}) {
  return (
    <select {...props} className={`${controlCls} appearance-none ${props.className ?? ""}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * v5.4 自绘下拉（替代原生 select 的视觉断裂）：
 * button[aria-haspopup=listbox] + 弹层 role=listbox / role=option；
 * 支持 ↑↓ / Home / End / Enter / Escape / Tab，外点关闭。
 */
export function Listbox({
  value,
  onChange,
  options,
  ariaLabel,
  size = "md",
  disabled,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
  size?: "md" | "sm";
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const uid = React.useId();

  const selIdx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selIdx];

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveIdx(selIdx);
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-idx="${selIdx}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = (idx: number) => {
    const opt = options[idx];
    if (opt) onChange(opt.value);
    setOpen(false);
    btnRef.current?.focus({ preventScroll: true });
  };

  const move = (idx: number) => {
    const next = Math.min(options.length - 1, Math.max(0, idx));
    setActiveIdx(next);
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${next}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(activeIdx + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(activeIdx - 1);
        break;
      case "Home":
        e.preventDefault();
        move(0);
        break;
      case "End":
        e.preventDefault();
        move(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIdx);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        btnRef.current?.focus({ preventScroll: true });
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const btnSize = size === "sm" ? "min-h-[36px] rounded-lg px-3 py-0 text-[13px]" : "py-3";

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`adm-ring clickable ${controlCls} flex items-center justify-between gap-2 text-left hover:border-[var(--ia-line-strong)] hover:bg-[var(--ia-panel-strong)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--ia-line)] disabled:hover:bg-[var(--ia-panel)] ${
          open
            ? "!border-[color-mix(in_srgb,var(--ia-neon)_45%,var(--ia-line-strong))] !bg-[var(--ia-panel-strong)]"
            : ""
        } ${btnSize}`}
      >
        <span className="min-w-0 truncate">{selected?.label ?? value}</span>
        <span
          aria-hidden="true"
          className={`shrink-0 transition-all ${open ? "text-[var(--ia-neon)]" : "text-[var(--ia-mist)]"}`}
          style={{ transform: open ? "rotate(-90deg)" : "rotate(90deg)" }}
        >
          <AdminIcon name="arrow" size={12} />
        </span>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={`${uid}-list`}
          role="listbox"
          aria-label={ariaLabel}
          className="adm-panel-enter absolute z-[60] mt-1.5 max-h-64 w-full min-w-[10rem] overflow-y-auto rounded-xl border border-[var(--ia-line-strong)] bg-[var(--ia-bg-2)] p-1 shadow-[0_18px_50px_rgba(2,6,20,0.55)]"
        >
          {options.map((o, i) => {
            const isSel = o.value === value;
            const isActive = i === activeIdx;
            /* v5.4.1 Hotfix-04：hover / 键盘 active（14%）与 selected 稳定态
               （7% + neon 文字 + 对勾）分层，二者叠加更亮；按压再加深。 */
            const optionBg = isActive
              ? isSel
                ? "bg-[color-mix(in_srgb,var(--ia-neon)_18%,transparent)]"
                : "bg-[color-mix(in_srgb,var(--ia-neon)_14%,transparent)]"
              : isSel
                ? "bg-[color-mix(in_srgb,var(--ia-neon)_7%,transparent)]"
                : "";
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSel}
                data-idx={i}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(i)}
                className={`clickable flex min-h-[38px] cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 text-sm transition-colors active:bg-[color-mix(in_srgb,var(--ia-neon)_22%,transparent)] ${optionBg} ${
                  isSel ? "font-semibold text-[var(--ia-neon)]" : "text-[var(--ia-ink)]"
                }`}
              >
                <span className="min-w-0 truncate">{o.label}</span>
                {isSel && <AdminIcon name="check" size={13} className="shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="adm-ring clickable flex min-h-[44px] w-full items-center justify-between rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] px-3.5 text-sm text-[var(--ia-ink)] transition-colors hover:border-[var(--ia-line-strong)] hover:bg-[var(--ia-panel-strong)] active:bg-[var(--ia-panel-strong)] motion-safe:active:scale-[0.99]"
      aria-pressed={checked}
    >
      <span>{label}</span>
      <span
        className="relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors"
        style={{
          borderColor: checked ? "var(--ia-neon)" : "var(--ia-line)",
          background: checked
            ? "color-mix(in srgb, var(--ia-neon) 25%, transparent)"
            : "transparent",
        }}
      >
        <span
          className="absolute top-[2.5px] size-[17px] rounded-full transition-all"
          style={{
            left: checked ? "calc(100% - 20px)" : "3px",
            background: checked ? "var(--ia-neon)" : "var(--ia-mist)",
          }}
        />
      </span>
    </button>
  );
}

/* ---------------- TagInput / ImageListInput ---------------- */

export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const commit = useCallback(() => {
    const v = draft.trim().replace(/,+$/, "");
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  }, [draft, value, onChange]);
  return (
    <div className={`${controlCls} flex flex-wrap items-center gap-1.5 py-2`}>
      {value.map((t) => (
        <span
          key={t}
          className="mono inline-flex items-center gap-1 rounded-md border border-[var(--ia-line)] bg-[color-mix(in_srgb,var(--ia-neon)_8%,transparent)] px-2 py-1 text-[11px] text-[var(--ia-neon)]"
        >
          {t}
          <button
            type="button"
            aria-label={`移除 ${t}`}
            className="clickable opacity-70"
            onClick={() => onChange(value.filter((x) => x !== t))}
          >
            <AdminIcon name="close" size={11} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[120px] flex-1 bg-transparent py-1 text-sm text-[var(--ia-ink)] outline-none placeholder:text-[color-mix(in_srgb,var(--ia-mist)_55%,transparent)]"
      />
    </div>
  );
}

/** 图片 URL 是否值得尝试预览（http/https 且非空） */
function isPreviewableUrl(v: string): boolean {
  return /^https?:\/\/\S+/i.test(v.trim());
}

/** 行内图片预览：加载失败显示「无效 URL」占位（§7 验收 5） */
export function ImageThumb({ url, size = 44 }: { url: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const trimmed = url.trim();
  useEffect(() => setFailed(false), [trimmed]);
  if (!trimmed || !isPreviewableUrl(trimmed)) {
    return (
      <span
        className="grid shrink-0 place-items-center rounded-lg border border-dashed border-[var(--ia-line)] text-[var(--ia-mist)]"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <AdminIcon name="media" size={Math.round(size * 0.42)} />
      </span>
    );
  }
  if (failed) {
    return (
      <span
        className="grid shrink-0 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--ia-warning)_50%,transparent)] bg-[color-mix(in_srgb,var(--ia-warning)_10%,transparent)] text-[var(--ia-warning)]"
        style={{ width: size, height: size }}
        title="图片加载失败：URL 无效或跨域受限"
      >
        <AdminIcon name="warn" size={Math.round(size * 0.42)} />
      </span>
    );
  }
  return (
    <img
      src={trimmed}
      alt=""
      loading="lazy"
      className="shrink-0 rounded-lg border border-[var(--ia-line)] object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

/**
 * ImageListInput（v5.0.2 §7 重写）—— 多图 URL 行编辑器。
 *
 * 修复点：
 * - 「+」按钮点击后必须新增一行空的图片 URL 输入框（旧版只在 draft 非空时才 push，
 *   看起来就像「+ 点不开」）；
 * - 每一行：实时预览缩略图（无效 URL 显示警示占位）+ 独立删除按钮；
 * - + / 删除均为 type="button"，绝不触发表单提交；
 * - 触控目标 ≥ 44px，手机端可随手加图。
 *
 * 受控组件：value 中允许存在空字符串行（正在输入），提交侧负责过滤空项。
 */
export function ImageListInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const rows = value.length > 0 ? value : [];
  const setRow = (i: number, v: string) => {
    const next = [...rows];
    next[i] = v;
    onChange(next);
  };
  const removeRow = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const addRow = () => onChange([...rows, ""]);

  return (
    <div className="flex flex-col gap-2">
      {rows.map((url, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-2"
        >
          <ImageThumb url={url} />
          <input
            value={url}
            onChange={(e) => setRow(i, e.target.value)}
            placeholder="https://…"
            inputMode="url"
            className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-[var(--ia-ink)] outline-none placeholder:text-[color-mix(in_srgb,var(--ia-mist)_55%,transparent)]"
          />
          <button
            type="button"
            aria-label={`删除第 ${i + 1} 张图片`}
            className="clickable grid size-11 shrink-0 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-danger)]"
            onClick={() => removeRow(i)}
          >
            <AdminIcon name="close" size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="clickable flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--ia-line)] text-sm font-semibold text-[var(--ia-neon)]"
      >
        <AdminIcon name="plus" size={16} /> 添加一张图片 URL
      </button>
      {rows.some((r) => r.trim() && !isPreviewableUrl(r)) && (
        <p className="mono text-[10px] text-[var(--ia-warning)]">
          // 有条目不是合法的 http(s) URL，提交时会被忽略。
        </p>
      )}
    </div>
  );
}

/**
 * ImageUrlInput（v5.0.2 §7）—— 单图 URL 输入 + 实时预览。
 * 用于 Post / Project / Music / Anime 的 cover 字段、Profile 头像、站点背景等。
 */
export function ImageUrlInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <ImageThumb url={value} size={52} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "https://…（可选）"}
        inputMode="url"
        className={`${controlCls} flex-1`}
      />
      {value.trim() && (
        <button
          type="button"
          aria-label="清空该图片 URL"
          className="clickable grid size-11 shrink-0 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)]"
          onClick={() => onChange("")}
        >
          <AdminIcon name="close" size={14} />
        </button>
      )}
    </div>
  );
}

/* ---------------- layout bits ---------------- */

export function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  /* v5.4.1 Hotfix-04：折叠区容器是 AdminPanel（不整卡发光），
     hover 只作用于标题行；展开时标题行保持稳定 active 表现，
     箭头随展开旋转并变色。 */
  return (
    <section className="glass-card adm-static overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`adm-ring clickable group flex min-h-[48px] w-full items-center justify-between px-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--ia-neon)_6%,transparent)] active:bg-[color-mix(in_srgb,var(--ia-neon)_10%,transparent)] ${
          open ? "border-b border-[var(--ia-line)] bg-[color-mix(in_srgb,var(--ia-neon)_4%,transparent)]" : ""
        }`}
      >
        <span className="eyebrow transition-colors group-hover:text-[var(--ia-neon)]">{title}</span>
        <span
          className={`transition-all ${open ? "rotate-90 text-[var(--ia-neon)]" : "text-[var(--ia-mist)] group-hover:text-[var(--ia-ink)]"}`}
        >
          <AdminIcon name="arrow" size={14} />
        </span>
      </button>
      {open && <div className="flex flex-col gap-4 px-4 pb-4 pt-3.5">{children}</div>}
    </section>
  );
}

/* ---------------- v5.4.1 Hotfix-04：Card 分类 ---------------- */

/**
 * AdminPanel —— 后台「纯容器」卡片：保留玻璃观感（含昼夜配色），
 * 不整体上浮、不抢内部控件 hover、不显示 spotlight。
 * 用于表格、表单、统计区、Deploy、Settings 等场景。
 */
export function AdminPanel({
  as = "section",
  className = "",
  children,
  ...rest
}: {
  as?: "section" | "div" | "aside" | "article";
  className?: string;
  ref?: React.Ref<HTMLElement>;
} & React.HTMLAttributes<HTMLElement>) {
  const Tag = as as React.ElementType;
  return (
    <Tag className={`glass-card adm-static ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * AdminActionCard —— 仅当整张卡本身就是唯一操作时使用：
 * 整卡 hover / cursor:pointer / 按压反馈；卡内不应再放第二个独立按钮。
 */
export function AdminActionCard({
  className = "",
  children,
  ...rest
}: { className?: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={`glass-card adm-action-card clickable adm-ring transition-colors hover:border-[var(--ia-line-strong)] motion-safe:active:scale-[0.99] ${className}`}
      {...rest}
    >
      {children}
    </a>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "neon" | "nebula" | "mist";
  children: React.ReactNode;
}) {
  const c =
    tone === "mist"
      ? "var(--ia-mist)"
      : `var(--ia-${tone})`;
  return (
    <span
      className="status-badge mono text-[10px]"
      style={{ "--sb-c": c } as React.CSSProperties}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="animate-spin"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--ia-danger)_45%,transparent)] bg-[color-mix(in_srgb,var(--ia-danger)_10%,transparent)] p-3 text-sm leading-relaxed text-[var(--ia-danger)]">
      <AdminIcon name="warn" size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

/* ---------------- v5.4 loading / empty / error states ---------------- */

/** 单条骨架块（局部切换时的占位，替代全屏 Spinner）。 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`adm-skeleton ${className}`} />;
}

/** 内容级骨架：标题 + 若干行，可选卡片外壳。 */
export function ContentSkeleton({
  lines = 4,
  card = true,
  className = "",
}: {
  lines?: number;
  card?: boolean;
  className?: string;
}) {
  const body = (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-5 w-2/5" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? "w-3/5" : "w-full"}`} />
      ))}
    </div>
  );
  if (!card) return <div className={className}>{body}</div>;
  return <div className={`glass-card adm-static rounded-2xl p-4 ${className}`}>{body}</div>;
}

/** 空状态：图标 + 主/副文案 + 可选操作。 */
export function EmptyState({
  icon = "drafts",
  title,
  hint,
  children,
  className = "",
}: {
  icon?: string;
  title: string;
  hint?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-[var(--ia-line)] px-6 py-10 text-center ${className}`}
    >
      <span className="grid size-11 place-items-center rounded-full border border-[var(--ia-line)] text-[var(--ia-mist)]">
        <AdminIcon name={icon} size={20} />
      </span>
      <p className="text-sm font-semibold text-[var(--ia-ink)]">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-relaxed text-[var(--ia-mist)]">{hint}</p>}
      {children && <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}

/** 错误状态：说明 + 重试按钮（列表 / 详情加载失败用）。 */
export function ErrorState({
  title = "加载失败",
  message,
  onRetry,
  retrying,
  className = "",
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2.5 rounded-2xl border border-[color-mix(in_srgb,var(--ia-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--ia-danger)_6%,transparent)] px-6 py-9 text-center ${className}`}
    >
      <span className="grid size-11 place-items-center rounded-full border border-[color-mix(in_srgb,var(--ia-danger)_45%,transparent)] text-[var(--ia-danger)]">
        <AdminIcon name="warn" size={20} />
      </span>
      <p className="text-sm font-semibold text-[var(--ia-ink)]">{title}</p>
      {message && (
        <p className="max-w-md break-words text-xs leading-relaxed text-[var(--ia-mist)]">{message}</p>
      )}
      {onRetry && (
        <Btn kind="secondary" size="sm" onClick={onRetry} loading={retrying} className="mt-1.5">
          <AdminIcon name="refresh" size={13} />
          重试
        </Btn>
      )}
    </div>
  );
}

export function InfoRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--ia-line)] py-2 text-sm last:border-b-0">
      <span className="mono shrink-0 text-[11px] uppercase text-[var(--ia-mist)]">{k}</span>
      <span className="min-w-0 truncate text-right text-[var(--ia-ink)]">{children}</span>
    </div>
  );
}

/** 底部固定操作栏（发布按钮等）。
 *  v5.4：底部 TabBar 已由 Drawer 取代 → 移动端直接贴底（含安全区）；lg 起改为文档流内联。 */
export function BottomBar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ia-line)] bg-[color-mix(in_srgb,var(--ia-bg)_88%,transparent)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:left-[220px] lg:static lg:inset-auto lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none ${className}`}
    >
      <div className="mx-auto flex max-w-2xl gap-3 lg:mx-0 lg:max-w-none">{children}</div>
    </div>
  );
}

/** 昼夜切换按钮：真正的切换 / 持久化由 AdminLayout 的 [data-scene-toggle] 委托脚本完成，
 *  这里只负责渲染当前模式图标并在 scene-mode-change 后刷新（§5：与前台同一份状态）。 */
export function SceneToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<"night" | "day">("night");
  useEffect(() => {
    const read = () =>
      setMode(document.documentElement.dataset.sceneMode === "day" ? "day" : "night");
    read();
    window.addEventListener("scene-mode-change", read);
    return () => window.removeEventListener("scene-mode-change", read);
  }, []);
  return (
    <button
      type="button"
      data-scene-toggle
      aria-label="切换昼夜模式"
      title={mode === "day" ? "切换到夜间模式（与前台同步）" : "切换到白昼模式（与前台同步）"}
      className={`clickable grid size-9 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)] ${className}`}
    >
      <AdminIcon name={mode === "day" ? "sun" : "moon"} size={15} />
    </button>
  );
}

/** 成功 / 提示信息盒（与 ErrorBox 对应） */
export function Notice({
  tone = "success",
  children,
}: {
  tone?: "success" | "warning" | "neon" | "nebula";
  children: React.ReactNode;
}) {
  if (!children) return null;
  const c = `var(--ia-${tone})`;
  return (
    <div
      className="rounded-xl border p-3 text-xs leading-relaxed"
      style={{
        borderColor: `color-mix(in srgb, ${c} 45%, transparent)`,
        background: `color-mix(in srgb, ${c} 10%, transparent)`,
        color: c,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- 发布流程步骤（§8：commit / deploy / frontend 拆分展示） ---------------- */

export type StepState = "pending" | "active" | "done" | "warn" | "error";

const STEP_TONE: Record<StepState, string> = {
  pending: "var(--ia-mist)",
  active: "var(--ia-neon)",
  done: "var(--ia-success)",
  warn: "var(--ia-warning)",
  error: "var(--ia-danger)",
};

export function Steps({
  items,
}: {
  items: { label: string; state: StepState; detail?: React.ReactNode }[];
}) {
  return (
    <ol className="flex flex-col">
      {items.map((s, i) => {
        const tone = STEP_TONE[s.state];
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {i < items.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[11px] top-6 h-[calc(100%-24px)] w-px bg-[var(--ia-line)]"
              />
            )}
            <span
              className="grid size-6 shrink-0 place-items-center rounded-full border text-[10px]"
              style={{
                borderColor: `color-mix(in srgb, ${tone} 60%, transparent)`,
                background: `color-mix(in srgb, ${tone} 12%, transparent)`,
                color: tone,
              }}
            >
              {s.state === "done" ? (
                <AdminIcon name="check" size={12} />
              ) : s.state === "error" ? (
                <AdminIcon name="close" size={11} />
              ) : s.state === "warn" ? (
                <AdminIcon name="warn" size={12} />
              ) : s.state === "active" ? (
                <Spinner size={12} />
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold" style={{ color: s.state === "pending" ? "var(--ia-mist)" : "var(--ia-ink)" }}>
                {s.label}
              </p>
              {s.detail && <div className="mt-1 text-xs leading-relaxed text-[var(--ia-mist)]">{s.detail}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** ISO 时间 → 相对时间（草稿箱 / 部署状态展示用） */
export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const diff = Date.now() - t;
  if (diff < 0) return "刚刚";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(t).toISOString().slice(0, 10);
}
