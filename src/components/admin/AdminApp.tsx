/**
 * AdminApp（v5.0.2）——控制台外壳。
 *
 * - mount 时 GET /api/admin/session 做门控：
 *     · 非登录页且未登录 → 跳 /admin/login
 *     · 登录页且已登录   → 跳 /admin/dashboard
 *   （这只是体验层跳转；真正的权限在后端逐请求校验 httpOnly cookie。）
 *
 * v5.0.2（§4 桌面适配）三档断点：
 *   mobile  <768px ：单列 + 底部 Tab + fixed 底部操作栏；
 *   tablet  ≥768px ：左侧 sidebar + 内容区（BottomBar 贴底）；
 *   desktop ≥1024px：sidebar + 宽幅主区 + 各屏内右侧 rail（Dashboard 部署面板 /
 *                    发布表单 meta 面板），操作按钮回归文档流。
 *
 * v5.0.2（§5）：顶栏加入昼夜切换（与前台共享 wl-scene-mode）；§9：新增草稿箱入口。
 */

import { useEffect, useState } from "react";
import * as api from "@/lib/admin/api";
import { setAdminHint } from "@/config/admin";
import { AdminIcon, SceneToggle, Spinner, TabBar, type AdminTab } from "./ui";
import {
  DashboardScreen,
  DraftsScreen,
  LoginScreen,
  MediaScreen,
  PublishFormScreen,
  PublishIndexScreen,
  SettingsProfileScreen,
  SettingsSiteScreen,
  SettingsWorldlineScreen,
} from "./screens";

export type AdminScreen =
  | "login"
  | "dashboard"
  | "publish-index"
  | "publish-form"
  | "drafts"
  | "media"
  | "settings-profile"
  | "settings-site"
  | "settings-worldline";

export interface AdminAppProps {
  screen: AdminScreen;
  publishType?: string;
  siteBase: string;
  summaryUrl: string;
}

const TITLES: Record<AdminScreen, string> = {
  login: "登录",
  dashboard: "总览",
  "publish-index": "发布",
  "publish-form": "发布",
  drafts: "草稿箱",
  media: "媒体",
  "settings-profile": "设置",
  "settings-site": "设置",
  "settings-worldline": "设置",
};

export default function AdminApp({ screen, publishType, siteBase, summaryUrl }: AdminAppProps) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getSession()
      .then((s) => {
        if (!alive) return;
        setAuthed(s.authenticated);
        setAdminHint(s.authenticated);
        if (!s.authenticated && screen !== "login") {
          location.replace(`${siteBase}/admin/login`);
          return;
        }
        if (s.authenticated && screen === "login") {
          location.replace(`${siteBase}/admin/dashboard`);
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (!alive) return;
        // 后端不可达 / 未配置：登录页可继续（用于填写 API base），其余跳登录
        if (screen !== "login") {
          location.replace(`${siteBase}/admin/login`);
          return;
        }
        setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [screen, siteBase]);

  if (checking) {
    return (
      <div className="grid min-h-[100dvh] place-items-center text-[var(--ia-mist)]">
        <div className="flex flex-col items-center gap-3">
          <Spinner size={22} />
          <span className="mono text-[11px]">verifying observer…</span>
        </div>
      </div>
    );
  }

  if (screen === "login") {
    return <LoginScreen siteBase={siteBase} />;
  }

  const tabs: AdminTab[] = [
    { key: "dashboard", label: "总览", icon: "dashboard", href: `${siteBase}/admin/dashboard` },
    { key: "publish", label: "发布", icon: "publish", href: `${siteBase}/admin/publish` },
    { key: "drafts", label: "草稿", icon: "drafts", href: `${siteBase}/admin/drafts` },
    { key: "media", label: "媒体", icon: "media", href: `${siteBase}/admin/media` },
    { key: "settings", label: "设置", icon: "settings", href: `${siteBase}/admin/settings/profile` },
  ];
  const activeKey = screen.startsWith("settings")
    ? "settings"
    : screen.startsWith("publish")
      ? "publish"
      : screen;

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setAdminHint(false);
    location.href = `${siteBase}/admin/login`;
  };

  const settingsTabs = [
    { key: "settings-profile", label: "档案", href: `${siteBase}/admin/settings/profile` },
    { key: "settings-site", label: "站点", href: `${siteBase}/admin/settings/site` },
    { key: "settings-worldline", label: "世界线", href: `${siteBase}/admin/settings/worldline` },
  ];

  return (
    <div className="min-h-[100dvh] pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-10 md:pl-[220px]">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 border-b border-[var(--ia-line)] bg-[color-mix(in_srgb,var(--ia-bg)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between px-4 lg:px-6">
          <a href={`${siteBase}/admin/dashboard`} className="clickable flex items-center gap-2.5">
            <span className="relative flex size-2.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ background: authed ? "var(--ia-success)" : "var(--ia-warning)" }}
              />
              <span
                className="relative inline-flex size-2.5 rounded-full"
                style={{ background: authed ? "var(--ia-success)" : "var(--ia-warning)" }}
              />
            </span>
            <span className="mono text-xs font-bold uppercase tracking-widest text-[var(--ia-ink)]">
              Console <span className="text-[var(--ia-mist)]">// {TITLES[screen]}</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            {/* v5.0.2 §5：昼夜切换，与前台共用同一份 wl-scene-mode 持久化 */}
            <SceneToggle />
            <a
              href={`${siteBase}/`}
              className="clickable grid size-9 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)]"
              aria-label="回前台"
              title="回前台"
            >
              <AdminIcon name="home" size={15} />
            </a>
            <button
              type="button"
              onClick={logout}
              className="clickable grid size-9 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)]"
              aria-label="登出"
              title="登出"
            >
              <AdminIcon name="logout" size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* 设置子导航 */}
      {activeKey === "settings" && (
        <div className="mx-auto flex w-full max-w-[1280px] gap-2 px-4 pt-4 lg:px-6">
          {settingsTabs.map((t) => (
            <a
              key={t.key}
              href={t.href}
              className="clickable rounded-full border px-3.5 py-1.5 text-xs font-semibold"
              style={{
                borderColor: screen === t.key ? "var(--ia-neon)" : "var(--ia-line)",
                color: screen === t.key ? "var(--ia-neon)" : "var(--ia-mist)",
                background:
                  screen === t.key
                    ? "color-mix(in srgb, var(--ia-neon) 10%, transparent)"
                    : "transparent",
              }}
            >
              {t.label}
            </a>
          ))}
        </div>
      )}

      {/* 内容区：mobile 单列；lg 起放宽给各屏做 grid / 右侧 rail */}
      <main className="mx-auto w-full max-w-[1280px] px-4 py-5 md:px-6 lg:px-6 lg:py-7">
        {screen === "dashboard" && <DashboardScreen siteBase={siteBase} summaryUrl={summaryUrl} />}
        {screen === "publish-index" && <PublishIndexScreen siteBase={siteBase} />}
        {screen === "publish-form" && (
          <PublishFormScreen siteBase={siteBase} type={publishType ?? ""} />
        )}
        {screen === "drafts" && <DraftsScreen siteBase={siteBase} />}
        {screen === "media" && <MediaScreen />}
        {screen === "settings-profile" && <SettingsProfileScreen />}
        {screen === "settings-site" && <SettingsSiteScreen />}
        {screen === "settings-worldline" && <SettingsWorldlineScreen />}
      </main>

      <TabBar tabs={tabs} activeKey={activeKey} />
    </div>
  );
}
