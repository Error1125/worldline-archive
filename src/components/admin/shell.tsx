/**
 * v5.4 Persistent Admin Shell.
 *
 * Sidebar / Topbar / Breadcrumb stay mounted across route changes; only the
 * content pane (AdminContentOutlet) swaps with a short exit → enter
 * transition. A shared SaveStatus context lets the active screen surface its
 * dirty / saving / saved state in the topbar.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AdminIcon, SceneToggle, Spinner } from "./ui";
import { usePrefersReducedMotion } from "./feedback";
import {
  NavLink,
  useAdminLocation,
  type AdminRoute,
  type SettingsSection,
} from "./router";
import { getRecordType } from "./adminFields";

/* ------------------------------------------------------------------ */
/* Navigation model                                                     */
/* ------------------------------------------------------------------ */

export type NavItem = {
  key: string;
  label: string;
  icon: string;
  route: AdminRoute;
};

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "总览", icon: "dashboard", route: { screen: "dashboard" } },
  { key: "publish", label: "发布", icon: "publish", route: { screen: "publish-index" } },
  { key: "content", label: "内容", icon: "post", route: { screen: "content" } },
  { key: "drafts", label: "草稿箱", icon: "drafts", route: { screen: "drafts" } },
  { key: "media", label: "媒体", icon: "media", route: { screen: "media" } },
  { key: "projects", label: "项目", icon: "project", route: { screen: "projects" } },
  { key: "settings", label: "设置", icon: "settings", route: { screen: "settings", section: "site" } },
];

/** 当前路由归属的一级导航 key（publish-form 归“发布”、settings/* 归“设置”）。 */
export function activeNavKey(route: AdminRoute): string {
  switch (route.screen) {
    case "publish-index":
    case "publish-form":
      return "publish";
    case "settings":
      return "settings";
    default:
      return route.screen;
  }
}

const SETTINGS_LABEL: Record<SettingsSection, string> = {
  site: "站点",
  profile: "档案",
  worldline: "世界线",
  bangumi: "Bangumi",
};

export type Crumb = { label: string; route?: AdminRoute };

export function crumbsForRoute(route: AdminRoute): Crumb[] {
  switch (route.screen) {
    case "dashboard":
      return [{ label: "总览" }];
    case "publish-index":
      return [{ label: "发布" }];
    case "publish-form":
      return [
        { label: "发布", route: { screen: "publish-index" } },
        { label: getRecordType(route.type)?.label ?? route.type },
      ];
    case "drafts":
      return [{ label: "草稿箱" }];
    case "media":
      return [{ label: "媒体" }];
    case "projects":
      return [{ label: "项目" }];
    case "content":
      return [{ label: "内容" }];
    case "settings":
      return [
        { label: "设置", route: { screen: "settings", section: "site" } },
        { label: SETTINGS_LABEL[route.section] },
      ];
  }
}

export function titleForRoute(route: AdminRoute): string {
  const crumbs = crumbsForRoute(route);
  return crumbs[crumbs.length - 1]?.label ?? "控制台";
}

/* ------------------------------------------------------------------ */
/* Save status (topbar pill)                                            */
/* ------------------------------------------------------------------ */

export type SaveStatus = {
  tone: "dirty" | "saving" | "saved" | "error";
  label: string;
};

type SaveStatusCtx = {
  status: SaveStatus | null;
  setStatus: (s: SaveStatus | null) => void;
};

const SaveStatusContext = createContext<SaveStatusCtx | null>(null);

export function SaveStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SaveStatus | null>(null);
  const ctx = useMemo(() => ({ status, setStatus }), [status]);
  return <SaveStatusContext.Provider value={ctx}>{children}</SaveStatusContext.Provider>;
}

export function useSaveStatus(): SaveStatus | null {
  return useContext(SaveStatusContext)?.status ?? null;
}

/**
 * 由具体屏幕上报保存状态（null 表示无状态展示）。
 * 卸载时自动清空，避免切屏后残留。
 */
export function useReportSaveStatus(status: SaveStatus | null) {
  const ctx = useContext(SaveStatusContext);
  const setStatus = ctx?.setStatus;
  const tone = status?.tone ?? null;
  const label = status?.label ?? null;
  useEffect(() => {
    if (!setStatus) return undefined;
    setStatus(tone && label ? { tone, label } : null);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStatus, tone, label]);
  useEffect(() => {
    if (!setStatus) return undefined;
    return () => setStatus(null);
  }, [setStatus]);
}

const SAVE_TONE_COLOR: Record<SaveStatus["tone"], string> = {
  dirty: "var(--ia-warning)",
  saving: "var(--ia-neon)",
  saved: "var(--ia-success)",
  error: "var(--ia-danger)",
};

export function SaveStatusPill() {
  const status = useSaveStatus();
  if (!status) return null;
  return (
    <span
      className="status-badge mono hidden text-[10px] sm:inline-flex"
      style={{ "--sb-c": SAVE_TONE_COLOR[status.tone] } as React.CSSProperties}
      role="status"
    >
      {status.tone === "saving" && <Spinner size={10} />}
      {status.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar (desktop)                                                    */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  const { route } = useAdminLocation();
  const active = activeNavKey(route);
  return (
    <nav
      aria-label="控制台导航"
      className="fixed inset-y-0 left-0 z-40 hidden w-[220px] flex-col gap-1 border-r border-[var(--ia-line)] bg-[var(--ia-panel)] p-4 pt-[68px] md:flex"
    >
      {NAV_ITEMS.map((t) => {
        const isActive = t.key === active;
        return (
          <NavLink
            key={t.key}
            to={t.route}
            aria-current={isActive ? "page" : undefined}
            className="adm-ring clickable relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:text-[var(--ia-ink)]"
            style={{
              color: isActive ? "var(--ia-neon)" : "var(--ia-mist)",
              background: isActive
                ? "color-mix(in srgb, var(--ia-neon) 10%, transparent)"
                : "transparent",
            }}
          >
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-[var(--ia-neon)]"
              />
            )}
            <AdminIcon name={t.icon} size={17} />
            {t.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Breadcrumb + Topbar                                                  */
/* ------------------------------------------------------------------ */

export function Breadcrumb() {
  const { route } = useAdminLocation();
  const crumbs = crumbsForRoute(route);
  return (
    <nav aria-label="面包屑" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <li className="mono hidden shrink-0 uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--ia-mist)_70%,transparent)] sm:block">
          Console
        </li>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`shrink-0 text-[color-mix(in_srgb,var(--ia-mist)_50%,transparent)] ${i === 0 ? "hidden sm:block" : ""}`}
              >
                /
              </span>
              {last || !c.route ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className="truncate font-semibold text-[var(--ia-ink)]"
                >
                  {c.label}
                </span>
              ) : (
                <NavLink
                  to={c.route}
                  className="adm-ring clickable truncate rounded-md text-[var(--ia-mist)] transition-colors hover:text-[var(--ia-ink)]"
                >
                  {c.label}
                </NavLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Topbar({
  onMenu,
  drawerOpen,
  homeHref,
  onLogout,
}: {
  onMenu: () => void;
  drawerOpen: boolean;
  homeHref: string;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--ia-line)] bg-[color-mix(in_srgb,var(--ia-bg)_86%,transparent)] backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <button
          type="button"
          onClick={onMenu}
          aria-label="打开导航"
          aria-expanded={drawerOpen}
          aria-controls="admin-drawer"
          className="adm-ring clickable grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)] transition-colors hover:text-[var(--ia-ink)] md:hidden"
        >
          <AdminIcon name="menu" size={17} />
        </button>
        <NavLink
          to={{ screen: "dashboard" }}
          className="adm-ring clickable hidden shrink-0 items-center gap-2.5 rounded-md md:flex"
          aria-label="回到总览"
        >
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ia-neon)] opacity-50" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[var(--ia-neon)]" />
          </span>
          <span className="mono text-xs uppercase tracking-[0.2em] text-[var(--ia-ink)]">
            Worldline
          </span>
        </NavLink>
        <span aria-hidden="true" className="hidden h-5 w-px bg-[var(--ia-line)] md:block" />
        <div className="min-w-0 flex-1">
          <Breadcrumb />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SaveStatusPill />
          <SceneToggle className="adm-ring" />
          <a
            href={homeHref}
            title="回到前台"
            aria-label="回到前台"
            className="adm-ring clickable grid size-9 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)] transition-colors hover:text-[var(--ia-ink)]"
          >
            <AdminIcon name="home" size={15} />
          </a>
          <button
            type="button"
            onClick={onLogout}
            title="退出登录"
            aria-label="退出登录"
            className="adm-ring clickable hidden size-9 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)] transition-colors hover:border-[color-mix(in_srgb,var(--ia-danger)_45%,transparent)] hover:text-[var(--ia-danger)] md:grid"
          >
            <AdminIcon name="logout" size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Drawer navigation content (mobile)                                   */
/* ------------------------------------------------------------------ */

export function DrawerNavContent({
  onClose,
  homeHref,
  onLogout,
}: {
  onClose: () => void;
  homeHref: string;
  onLogout: () => void;
}) {
  const { route } = useAdminLocation();
  const active = activeNavKey(route);
  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--ia-line)] px-4">
        <span className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            <span className="relative inline-flex size-2.5 rounded-full bg-[var(--ia-neon)]" />
          </span>
          <span className="mono text-xs uppercase tracking-[0.2em] text-[var(--ia-ink)]">
            Worldline
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭导航"
          className="adm-ring clickable grid size-9 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)]"
        >
          <AdminIcon name="close" size={15} />
        </button>
      </div>
      <nav aria-label="控制台导航" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((t) => {
          const isActive = t.key === active;
          return (
            <NavLink
              key={t.key}
              to={t.route}
              aria-current={isActive ? "page" : undefined}
              className="adm-ring clickable flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-sm font-semibold"
              style={{
                color: isActive ? "var(--ia-neon)" : "var(--ia-mist)",
                background: isActive
                  ? "color-mix(in srgb, var(--ia-neon) 10%, transparent)"
                  : "transparent",
              }}
            >
              <AdminIcon name={t.icon} size={18} />
              {t.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="flex shrink-0 flex-col gap-1 border-t border-[var(--ia-line)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <a
          href={homeHref}
          className="adm-ring clickable flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[var(--ia-mist)]"
        >
          <AdminIcon name="home" size={17} />
          回到前台
        </a>
        <button
          type="button"
          onClick={onLogout}
          className="adm-ring clickable flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-[var(--ia-mist)] hover:text-[var(--ia-danger)]"
        >
          <AdminIcon name="logout" size={17} />
          退出登录
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Content outlet with exit → enter transition                          */
/* ------------------------------------------------------------------ */

/**
 * 局部内容出口：k 变化时先播放 130ms 退场（渲染旧内容快照），
 * 再切换为新内容并播放 200ms 进场；转场后回顶并把焦点移交主区。
 * prefers-reduced-motion 下直接切换。
 */
export function AdminContentOutlet({
  k,
  children,
}: {
  k: string;
  children: React.ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState<{ k: string; node: React.ReactNode }>(() => ({
    k,
    node: children,
  }));
  const [phase, setPhase] = useState<"idle" | "exit" | "enter">("idle");
  const latestRef = useRef<{ k: string; node: React.ReactNode }>({ k, node: children });
  latestRef.current = { k, node: children };
  const mainRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (k === shown.k) return undefined;
    const settle = () => {
      setShown({ k: latestRef.current.k, node: latestRef.current.node });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
        mainRef.current?.focus({ preventScroll: true });
      });
    };
    if (reduced) {
      settle();
      setPhase("idle");
      return undefined;
    }
    setPhase("exit");
    timerRef.current = setTimeout(() => {
      settle();
      setPhase("enter");
      timerRef.current = setTimeout(() => setPhase("idle"), 220);
    }, 130);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, reduced]);

  const node = shown.k === k ? children : shown.node;

  return (
    <main
      ref={mainRef}
      id="admin-main"
      tabIndex={-1}
      className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-6 outline-none md:px-6"
    >
      <div
        className={
          phase === "exit" ? "adm-outlet-exit" : phase === "enter" ? "adm-outlet-enter" : ""
        }
      >
        {node}
      </div>
    </main>
  );
}
