/**
 * Admin Console UI 原语（v5.0，React）。
 *
 * - 全部使用站点既有 CSS 设计令牌（--ia-*），昼夜模式自动生效；
 * - mobile-first：大点击区（≥44px）、单列、不依赖 hover；
 * - Icon.astro 是 Astro 组件，React 端用这里的内联 SVG（AdminIcon）。
 */

import React, { useState, useRef, useCallback } from "react";

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

export function Btn({
  children,
  onClick,
  kind = "ghost",
  disabled,
  full,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  full?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const base =
    "clickable inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40";
  const kinds = {
    primary:
      "border border-[color-mix(in_srgb,var(--ia-neon)_55%,transparent)] bg-[color-mix(in_srgb,var(--ia-neon)_16%,transparent)] text-[var(--ia-neon)] active:bg-[color-mix(in_srgb,var(--ia-neon)_26%,transparent)]",
    ghost:
      "border border-[var(--ia-line)] bg-[var(--ia-panel)] text-[var(--ia-mist)] active:text-[var(--ia-ink)]",
    danger:
      "border border-[color-mix(in_srgb,var(--ia-danger)_50%,transparent)] bg-[color-mix(in_srgb,var(--ia-danger)_12%,transparent)] text-[var(--ia-danger)]",
  } as const;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${kinds[kind]} ${full ? "w-full" : ""} ${className}`}
    >
      {children}
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
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5 text-xs font-semibold text-[var(--ia-mist)]">
        {label}
        {required && <span className="text-[var(--ia-danger)]">*</span>}
      </span>
      {children}
      {help && (
        <span className="mt-1 block text-[11px] leading-relaxed text-[color-mix(in_srgb,var(--ia-mist)_70%,transparent)]">
          {help}
        </span>
      )}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
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
      className="clickable flex min-h-[44px] w-full items-center justify-between rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] px-3.5 text-sm text-[var(--ia-ink)]"
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

export function ImageListInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-2">
      {value.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className="flex items-center gap-2 rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-2"
        >
          <img
            src={url}
            alt=""
            className="size-11 shrink-0 rounded-lg border border-[var(--ia-line)] object-cover"
            loading="lazy"
            onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.25")}
          />
          <span className="mono min-w-0 flex-1 truncate text-[11px] text-[var(--ia-mist)]">{url}</span>
          <button
            type="button"
            aria-label="移除图片"
            className="clickable grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-danger)]"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <AdminIcon name="close" size={13} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="粘贴图片 URL 后回车"
          className={`${controlCls} flex-1`}
        />
        <button
          type="button"
          onClick={add}
          aria-label="添加图片"
          className="clickable grid min-h-[44px] w-12 shrink-0 place-items-center rounded-xl border border-[var(--ia-line)] text-[var(--ia-neon)]"
        >
          <AdminIcon name="plus" size={16} />
        </button>
      </div>
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
  return (
    <section className="glass-card overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="clickable flex min-h-[48px] w-full items-center justify-between px-4 text-left"
      >
        <span className="eyebrow">{title}</span>
        <span
          className="text-[var(--ia-mist)] transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          <AdminIcon name="arrow" size={14} />
        </span>
      </button>
      {open && <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>}
    </section>
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

export function InfoRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--ia-line)] py-2 text-sm last:border-b-0">
      <span className="mono shrink-0 text-[11px] uppercase text-[var(--ia-mist)]">{k}</span>
      <span className="min-w-0 truncate text-right text-[var(--ia-ink)]">{children}</span>
    </div>
  );
}

/** 底部固定操作栏（发布按钮等） */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-40 border-t border-[var(--ia-line)] bg-[color-mix(in_srgb,var(--ia-bg)_88%,transparent)] px-4 py-3 backdrop-blur-md md:left-[220px]">
      <div className="mx-auto flex max-w-2xl gap-3">{children}</div>
    </div>
  );
}

/* ---------------- bottom TabBar / desktop sidebar ---------------- */

export interface AdminTab {
  key: string;
  label: string;
  icon: string;
  href: string;
}

export function TabBar({
  tabs,
  activeKey,
}: {
  tabs: AdminTab[];
  activeKey: string;
}) {
  return (
    <>
      {/* mobile：底部 Tab */}
      <nav
        aria-label="控制台导航"
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-[var(--ia-line)] bg-[color-mix(in_srgb,var(--ia-bg)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {tabs.map((t) => {
          const active = t.key === activeKey;
          return (
            <a
              key={t.key}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className="clickable flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5"
              style={{ color: active ? "var(--ia-neon)" : "var(--ia-mist)" }}
            >
              <AdminIcon name={t.icon} size={19} />
              <span className="text-[10px] font-semibold">{t.label}</span>
            </a>
          );
        })}
      </nav>
      {/* desktop：左侧栏 */}
      <nav
        aria-label="控制台导航"
        className="fixed inset-y-0 left-0 z-40 hidden w-[220px] flex-col gap-1 border-r border-[var(--ia-line)] bg-[var(--ia-panel)] p-4 pt-20 md:flex"
      >
        {tabs.map((t) => {
          const active = t.key === activeKey;
          return (
            <a
              key={t.key}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className="clickable flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
              style={{
                color: active ? "var(--ia-neon)" : "var(--ia-mist)",
                background: active
                  ? "color-mix(in srgb, var(--ia-neon) 10%, transparent)"
                  : "transparent",
              }}
            >
              <AdminIcon name={t.icon} size={17} />
              {t.label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
