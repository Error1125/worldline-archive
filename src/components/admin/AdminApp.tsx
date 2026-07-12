/**
 * AdminApp（v5.4）——控制台持久化外壳入口。
 *
 * - mount 时 GET /api/admin/session 做一次门控（此后内部导航不再重复校验；
 *   真正的权限仍由后端逐请求校验 httpOnly cookie，401 会在各屏处理）：
 *     · 非登录页且未登录 → 跳 /admin/login
 *     · 登录页且已登录   → 跳 /admin/dashboard
 * - 每个 Astro 页面仍是深链接入口（props 不变）；挂载后由客户端路由接管，
 *   Sidebar / Topbar / Breadcrumb 常驻，仅内容区局部切换（AdminContentOutlet）。
 * - 移动端以 Drawer 取代旧底部 TabBar；桌面保持 220px 侧栏。
 * - Toast / Dialog / SaveStatus 三个全局服务在此挂载。
 */

import React, { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/admin/api";
import { setAdminHint } from "@/config/admin";
import { Spinner } from "./ui";
import { Drawer, DialogProvider, ToastProvider } from "./feedback";
import {
  AdminRouterProvider,
  useAdminLocation,
  useAdminNavigate,
  type AdminRoute,
} from "./router";
import {
  AdminContentOutlet,
  DrawerNavContent,
  SaveStatusProvider,
  Sidebar,
  Topbar,
  titleForRoute,
} from "./shell";
import {
  DashboardScreen,
  DraftsScreen,
  LoginScreen,
  MediaScreen,
  ProjectsManagerScreen,
  PublishFormScreen,
  PublishIndexScreen,
  SettingsScreen,
} from "./screens";
import { ContentManagerScreen } from "./content-manager";

/** 旧版屏幕标识：保持 Astro 页面 props 兼容（每页一个入口）。 */
export type AdminScreen =
  | "login"
  | "dashboard"
  | "publish-index"
  | "publish-form"
  | "drafts"
  | "media"
  | "settings-profile"
  | "settings-site"
  | "settings-worldline"
  | "settings-bangumi"
  | "projects"
  | "content";

export interface AdminAppProps {
  screen: AdminScreen;
  publishType?: string;
  siteBase: string;
  summaryUrl: string;
}

function legacyToRoute(screen: AdminScreen, publishType?: string): AdminRoute {
  switch (screen) {
    case "dashboard":
    case "login":
      return { screen: "dashboard" };
    case "publish-index":
      return { screen: "publish-index" };
    case "publish-form":
      return {
        screen: "publish-form",
        type: (publishType ?? "moment") as import("@/lib/admin/api").ContentType,
      };
    case "drafts":
      return { screen: "drafts" };
    case "media":
      return { screen: "media" };
    case "projects":
      return { screen: "projects" };
    case "content":
      return { screen: "content" };
    case "settings-profile":
      return { screen: "settings", section: "profile" };
    case "settings-site":
      return { screen: "settings", section: "site" };
    case "settings-worldline":
      return { screen: "settings", section: "worldline" };
    case "settings-bangumi":
      return { screen: "settings", section: "bangumi" };
  }
}

export default function AdminApp({ screen, publishType, siteBase, summaryUrl }: AdminAppProps) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .getSession()
      .then((s) => {
        if (!alive) return;
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
    // 门控只在首次挂载执行一次；此后由客户端路由接管，不再整页重启。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <AdminRouterProvider siteBase={siteBase} initialRoute={legacyToRoute(screen, publishType)}>
      <DialogProvider>
        <ToastProvider>
          <SaveStatusProvider>
            <AdminShellBody siteBase={siteBase} summaryUrl={summaryUrl} />
          </SaveStatusProvider>
        </ToastProvider>
      </DialogProvider>
    </AdminRouterProvider>
  );
}

function AdminShellBody({ siteBase, summaryUrl }: { siteBase: string; summaryUrl: string }) {
  const loc = useAdminLocation();
  const navigate = useAdminNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 路由成功切换后再收起 Drawer；guard 取消时 Drawer 留在原位。
  useEffect(() => {
    setDrawerOpen(false);
  }, [loc.path]);

  useEffect(() => {
    document.title = `${titleForRoute(loc.route)} · Console`;
  }, [loc.route]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setAdminHint(false);
    location.href = `${siteBase}/admin/login`;
  }, [siteBase]);

  /**
   * 兜底委托：各屏残留的普通 <a href="…/admin/…"> 也走客户端路由
   * （NavLink 已自行处理并 preventDefault，这里只接住剩余的）。
   */
  const onClickDelegate = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith(`${siteBase}/admin`)) return;
      if (href.startsWith(`${siteBase}/admin/login`)) return;
      e.preventDefault();
      void navigate(href);
    },
    [siteBase, navigate],
  );

  const outletKey =
    loc.route.screen === "publish-form"
      ? `pf:${loc.route.type}:${loc.search}`
      : loc.route.screen === "settings"
        ? "settings"
        : `${loc.route.screen}:${loc.search}`;

  return (
    <div className="min-h-[100dvh] pb-10 md:pl-[220px]" onClick={onClickDelegate}>
      <Topbar
        onMenu={() => setDrawerOpen(true)}
        drawerOpen={drawerOpen}
        homeHref={`${siteBase}/`}
        onLogout={logout}
      />
      <Sidebar />
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="控制台导航"
        id="admin-drawer"
      >
        <DrawerNavContent
          onClose={() => setDrawerOpen(false)}
          homeHref={`${siteBase}/`}
          onLogout={logout}
        />
      </Drawer>
      <AdminContentOutlet k={outletKey}>
        {renderScreen(loc.route, outletKey, siteBase, summaryUrl)}
      </AdminContentOutlet>
    </div>
  );
}

function renderScreen(
  route: AdminRoute,
  outletKey: string,
  siteBase: string,
  summaryUrl: string,
): React.ReactNode {
  switch (route.screen) {
    case "dashboard":
      return <DashboardScreen siteBase={siteBase} summaryUrl={summaryUrl} />;
    case "publish-index":
      return <PublishIndexScreen siteBase={siteBase} />;
    case "publish-form":
      // key 含 type 与 query（?draft= / ?repoDraft=），切换草稿时整体重建表单状态
      return <PublishFormScreen key={outletKey} siteBase={siteBase} type={route.type} />;
    case "drafts":
      return <DraftsScreen siteBase={siteBase} />;
    case "media":
      return <MediaScreen />;
    case "projects":
      return <ProjectsManagerScreen siteBase={siteBase} />;
    case "content":
      return <ContentManagerScreen siteBase={siteBase} />;
    case "settings":
      return <SettingsScreen section={route.section} />;
  }
}
