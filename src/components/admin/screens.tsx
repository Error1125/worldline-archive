/**
 * Admin Console 屏幕组件（v5.0.2）。
 *
 * LoginScreen / DashboardScreen / PublishIndexScreen / PublishFormScreen /
 * DraftsScreen / MediaScreen / SettingsProfileScreen / SettingsSiteScreen /
 * SettingsWorldlineScreen —— 全部真实调用 Worker 后端（src/lib/admin/api.ts），无 mock。
 *
 * v5.0.2 变更总览：
 * - §3  登录页：PUBLIC_ADMIN_API_BASE 已配置时主表单只留「访问口令」，
 *        API 地址折叠进「高级设置 / 调试」（含健康检查 / 重置本机地址 / 跨站 Cookie 提示）；
 * - §4  桌面适配：Dashboard / 发布表单在 lg（≥1024px）改为 主区 + 右侧 rail 双栏；
 * - §8  发布状态拆分：表单校验 → GitHub Commit → Actions/Pages 部署 → 前台可访问，
 *        commit 成功立即反馈 sha / URL / 文件路径，Actions 慢时明确提示而非无限 loading；
 * - §9  失败兜底：自动保存本地草稿、发布失败保留表单并写入草稿箱、可重新发布；
 * - §10 Profile：头像预览 + 「从 GitHub 同步」（公共 API，默认只填充空字段）；
 * - §12 Dashboard：部署状态 / 最新 commit / 前台同步状态（buildSha 对比）/ 草稿数 /
 *        Profile 完成度 / 配置健康检查；
 * - §14 Media：预览失效提示 / 删除 / 复制 / 设为头像·背景·封面 / R2 未配置直说；
 * - §16.5/16.6 Worldline：设置页暴露 stableAfterDays / jitterEnabled / jitterDigits，
 *        Dashboard 与首页读取同一份 /data/summary.json 引擎输出并展示 deploy pending。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/admin/api";
import { AdminApiError } from "@/lib/admin/api";
import { saveApiBase, resolveApiBase, normalizeApiBase, setAdminHint, ADMIN_API_BASE_ENV } from "@/config/admin";
import { RECORD_TYPES, getRecordType, type FieldDef } from "./adminFields";
import * as draftsLib from "@/lib/admin/drafts";
import { readMarkdownFile } from "@/lib/admin/markdown";
import githubReposData from "@/data/github/repos.json";
import {
  AdminIcon,
  Btn,
  BottomBar,
  ContentSkeleton,
  EmptyState,
  ErrorBox,
  ErrorState,
  Field,
  ImageListInput,
  ImageThumb,
  ImageUrlInput,
  InfoRow,
  Input,
  Listbox,
  Notice,
  Section,
  AdminActionCard,
  Skeleton,
  Spinner,
  StatusPill,
  Steps,
  TagInput,
  Textarea,
  Toggle,
  timeAgo,
  type StepState,
} from "./ui";
import { useDialog, useToast } from "./feedback";
import { NavLink, useAdminNavGuard, useAdminNavigate, type SettingsSection } from "./router";
import { useReportSaveStatus } from "./shell";

/* =========================================================================
 * Login（v5.0.2 §3：API URL 默认隐藏）
 * ========================================================================= */

export function LoginScreen({ siteBase }: { siteBase: string }) {
  const envBase = ADMIN_API_BASE_ENV.replace(/\/+$/, "");
  const hasEnvBase = Boolean(envBase);

  const [secret, setSecret] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advOpen, setAdvOpen] = useState(false);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthMsg, setHealthMsg] = useState<string | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);

  useEffect(() => {
    setApiBase(resolveApiBase());
  }, []);

  /** 提交时保存本机 API 地址：与构建期地址相同则清掉本机覆盖（保持 env 为唯一来源） */
  const persistApiBase = () => {
    const v = apiBase.trim();
    if (!v || normalizeApiBase(v) === normalizeApiBase(envBase)) saveApiBase("");
    else saveApiBase(v);
  };

  const submit = async (e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    setError(null);
    if (!secret) {
      setError("请输入访问口令。");
      return;
    }
    setBusy(true);
    setLoginStatus("正在验证访问口令…");
    try {
      persistApiBase();
      await api.login(secret);
      setLoginStatus("登录成功，正在确认会话…");
      const session = await api.getSession();
      if (!session.authenticated) {
        throw new AdminApiError(
          "SESSION_NOT_SAVED",
          "登录成功但浏览器未保存会话：前端与 API 跨站时，Safari 等浏览器的默认隐私策略会拦截第三方 Cookie。正式修复是同站部署（自定义域名 + COOKIE_SAME_SITE=Lax），见 docs/SAME_SITE_AUTH.md。",
          0,
        );
      }
      setAdminHint(true);
      setLoginStatus("会话已确认，正在进入控制台…");
      location.assign(`${siteBase}/admin/dashboard`);
    } catch (err) {
      let msg: string;
      if (err instanceof AdminApiError) {
        if (err.code === "UNAUTHORIZED" || err.code === "INVALID_SECRET") {
          msg = "口令错误。El Psy Kongroo.";
        } else if (err.code === "SESSION_NOT_SAVED") {
          msg = err.message;
          setAdvOpen(true);
        } else if (err.code === "NETWORK" || err.code === "NO_API_BASE" || err.code === "NOT_A_WORKER") {
          msg = `Worker 连接失败：${err.message} 可展开下方「高级设置」检查 API 地址并运行健康检查。`;
          setAdvOpen(true);
        } else if (err.code === "SERVER_MISCONFIGURED") {
          msg = `Worker 配置不完整：${err.message}`;
          setAdvOpen(true);
        } else {
          msg = err.message;
        }
      } else {
        msg = "登录失败，请稍后再试。";
      }
      setError(msg);
      setLoginStatus(null);
      setBusy(false);
    }
  };

  const runHealth = async () => {
    setHealthBusy(true);
    setHealthMsg(null);
    setHealthOk(null);
    try {
      const h = await api.health(apiBase.trim() || undefined);
      if (h.ok) {
        setHealthOk(true);
        setHealthMsg("Worker 存活，配置齐全，可以登录。");
      } else {
        setHealthOk(false);
        setHealthMsg(
          `Worker 存活，但配置不完整：${(h.problems ?? []).join("；") || "未知问题"}。请在 Worker 端补齐 secrets。`,
        );
      }
    } catch (e) {
      setHealthOk(false);
      setHealthMsg(
        e instanceof AdminApiError
          ? `健康检查失败：${e.message}`
          : "健康检查失败：无法连接该地址。",
      );
    } finally {
      setHealthBusy(false);
    }
  };

  const resetLocalBase = () => {
    saveApiBase("");
    setApiBase(envBase);
    setHealthMsg(hasEnvBase ? "已重置为构建期配置的地址。" : "已清除本机保存的地址。");
    setHealthOk(null);
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center px-5 py-12">
      <div className="flex flex-col items-center text-center">
        <span className="icon-badge grid size-16 place-items-center rounded-2xl">
          <AdminIcon name="lock" size={28} />
        </span>
        <div className="eyebrow mt-6">OBSERVATORY // 观测台</div>
        <h1 className="mt-2 text-2xl font-bold text-[var(--ia-ink)]">进入控制台</h1>
        <p className="mono mt-2 text-[11px] text-[var(--ia-mist)]">
          El Psy Kongroo. 仅观测者本人可进入。
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <Field label="访问口令" required>
          <Input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="ADMIN_SECRET"
            autoComplete="current-password"
            autoFocus
          />
        </Field>

        {/* §3：PUBLIC_ADMIN_API_BASE 不存在时，才把 API 地址放进主表单 */}
        {!hasEnvBase && (
          <Field
            label="后端 API 地址"
            required
            help='Worker 地址（https://xxx.workers.dev / https://api.example.com）；同站路由部署可填 "/"。保存在本机浏览器。'
          >
            <Input
              type="text"
              inputMode="url"
              spellCheck={false}
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://worldline-admin.xxx.workers.dev"
              autoComplete="off"
            />
          </Field>
        )}

        <ErrorBox>{error}</ErrorBox>
        {loginStatus && !error && <Notice tone="neon">{loginStatus}</Notice>}

        <Btn kind="primary" type="submit" full loading={busy}>
          <AdminIcon name="arrow" size={16} />
          {busy ? "验证中…" : "登录"}
        </Btn>

        {/* 高级设置 / 调试：默认折叠（§3） */}
        <div className="mt-1 overflow-hidden rounded-xl border border-[var(--ia-line)]">
          <button
            type="button"
            onClick={() => setAdvOpen((v) => !v)}
            className="adm-ring clickable flex min-h-[44px] w-full items-center justify-between px-3.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--ia-neon)_6%,transparent)] active:bg-[color-mix(in_srgb,var(--ia-neon)_10%,transparent)]"
          >
            <span className="mono text-[11px] uppercase tracking-wider text-[var(--ia-mist)]">
              高级设置 / 调试
            </span>
            <span
              className="text-[var(--ia-mist)] transition-transform"
              style={{ transform: advOpen ? "rotate(90deg)" : "none" }}
            >
              <AdminIcon name="arrow" size={13} />
            </span>
          </button>
          {advOpen && (
            <div className="flex flex-col gap-3 border-t border-[var(--ia-line)] p-3.5">
              <Field
                label="后端 API 地址"
                help={
                  hasEnvBase
                    ? '构建期已注入默认地址；此处填写会覆盖并保存在本机浏览器（同站路由部署可填 "/"），留空 / 重置则回落到默认地址。'
                    : '填写 Worker 地址后保存在本机浏览器；同站路由部署（前端域名/api/*）可直接填 "/"。'
                }
              >
                <Input
                  type="text"
                  inputMode="url"
                  spellCheck={false}
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                  placeholder={envBase || "https://worldline-admin.xxx.workers.dev"}
                  autoComplete="off"
                />
              </Field>
              <div className="flex gap-2">
                <Btn size="sm" onClick={runHealth} loading={healthBusy} className="flex-1">
                  <AdminIcon name="refresh" size={13} />
                  健康检查
                </Btn>
                <Btn size="sm" onClick={resetLocalBase} className="flex-1">
                  <AdminIcon name="close" size={13} /> 重置本机地址
                </Btn>
              </div>
              {healthMsg && (
                <p
                  className="mono break-words text-[11px] leading-relaxed"
                  style={{
                    color:
                      healthOk === true
                        ? "var(--ia-success)"
                        : healthOk === false
                          ? "var(--ia-warning)"
                          : "var(--ia-mist)",
                  }}
                >
                  {healthMsg}
                </p>
              )}
              <p className="mono text-[10px] leading-relaxed text-[var(--ia-mist)] opacity-80">
                // 若登录成功后又跳回本页：多为浏览器第三方 Cookie / SameSite 限制
                （GitHub Pages 与 workers.dev 属跨站）。v5.4.1 起正式方案是同站部署：
                前端绑定自定义域名，Worker 绑定同域 API（api.example.com 或
                前端域名/api/*，此处填 "/"），并在 Worker 侧设 COOKIE_SAME_SITE=Lax。
                步骤见 docs/SAME_SITE_AUTH.md，无需用户关闭 Safari 隐私设置。
              </p>
            </div>
          )}
        </div>

        <a
          href={`${siteBase}/`}
          className="clickable mono mt-2 text-center text-xs text-[var(--ia-mist)]"
        >
          ← 返回前台
        </a>
      </form>
    </div>
  );
}

/* =========================================================================
 * Dashboard（v5.0.2 §12 / §16.6）
 * ========================================================================= */

interface SummaryData {
  generatedAt: string;
  /** v5.0.2：构建来源 commit（GitHub Actions 注入 GITHUB_SHA；本地构建为空） */
  buildSha?: string;
  totals: { records: number; drafts: number };
  counts: Record<string, { total: number; drafts: number; labelZh: string }>;
  worldline: {
    value: string;
    score: number;
    status: string;
    statusLabel: string;
    statusZh: string;
    baseValue: number;
    windowDays: number;
    halfLifeDays?: number;
    stableAfterDays?: number;
    jitterEnabled?: boolean;
    jitterDigits?: number;
    recentEvents: { type: string; title: string; date: string; contribution: number }[];
  };
  recent: { type: string; typeLabel: string; title: string; date: string; href: string; impact: string }[];
}

const STATUS_TONE: Record<string, "success" | "neon" | "warning" | "danger"> = {
  stable: "success",
  observing: "neon",
  unstable: "warning",
  divergence: "danger",
};

type SyncState = "synced" | "pending" | "unknown";

export function DashboardScreen({
  siteBase,
  summaryUrl,
}: {
  siteBase: string;
  summaryUrl: string;
}) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [status, setStatus] = useState<api.AdminStatus | null>(null);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [localDrafts, setLocalDrafts] = useState(0);
  const [profile, setProfile] = useState<Record<string, any> | "err" | null>(null);
  const [healthInfo, setHealthInfo] = useState<api.HealthInfo | "err" | null>(null);
  const toast = useToast();

  const loadStatus = () =>
    api
      .getStatus()
      .then((s) => {
        setStatus(s);
        setStatusErr(null);
      })
      .catch((e) => setStatusErr(e instanceof Error ? e.message : "状态获取失败"));

  useEffect(() => {
    fetch(summaryUrl, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setSummary)
      .catch(() => setSummaryErr("站点摘要读取失败（summary.json）。首次部署前这是正常的。"));
    loadStatus();
    setLocalDrafts(draftsLib.countDrafts());
    api
      .getSettings<Record<string, any>>("profile")
      .then((r) => setProfile(r.data))
      .catch(() => setProfile("err"));
    api
      .health()
      .then(setHealthInfo)
      .catch(() => setHealthInfo("err"));
  }, [summaryUrl]);

  const doSync = async () => {
    setSyncBusy(true);
    setSyncMsg(null);
    try {
      const r = await api.githubSync();
      const sha = r.commitSha.slice(0, 7);
      setSyncMsg(`GitHub 数据已同步并提交：${sha}`);
      toast.success("GitHub 数据已同步", `commit ${sha}`);
      loadStatus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "同步失败";
      setSyncMsg(`同步失败：${msg}`);
      toast.error("GitHub 数据同步失败", msg);
    } finally {
      setSyncBusy(false);
    }
  };

  const wl = summary?.worldline;

  /* §16.6：前台构建（buildSha）与仓库最新 commit 对比 → 是否已同步 / deploy pending */
  const buildSha = summary?.buildSha ?? "";
  const latestSha = status?.latestCommit?.sha ?? "";
  const syncState: SyncState =
    buildSha && latestSha ? (latestSha === buildSha ? "synced" : "pending") : "unknown";

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start lg:gap-5">
      {/* ---------------- 左 / 主区 ---------------- */}
      <div className="flex min-w-0 flex-col gap-4">
        {/* worldline 状态（Frontend Live：与首页读同一引擎输出） */}
        <section className="glass-card adm-static corner-ticks relative rounded-2xl p-4 lg:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="eyebrow">WORLDLINE // 变动率（前台在线值）</span>
            <span className="flex items-center gap-1.5">
              {wl && (
                <StatusPill tone={STATUS_TONE[wl.status] ?? "neon"}>
                  {wl.statusLabel} · {wl.statusZh}
                </StatusPill>
              )}
              {syncState === "synced" && <StatusPill tone="success">已同步前台</StatusPill>}
              {syncState === "pending" && <StatusPill tone="warning">deploy pending</StatusPill>}
            </span>
          </div>
          {wl ? (
            <>
              <div className="mono mt-3 text-3xl font-bold tracking-wider text-[var(--ia-ink)] lg:text-4xl">
                {wl.value}
                <span className="ml-2 align-middle text-xs text-[var(--ia-mist)]">
                  score {wl.score.toFixed(2)}
                </span>
              </div>
              <p className="mono mt-1 text-[11px] text-[var(--ia-mist)]">
                base {wl.baseValue} · 窗口 {wl.windowDays}d · 半衰期 {wl.halfLifeDays ?? "—"}d ·{" "}
                {wl.stableAfterDays ?? wl.windowDays}d 后回归完美世界线
              </p>
              {syncState === "pending" && (
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--ia-warning)]">
                  控制台已看到更新的 commit（{latestSha.slice(0, 7)}），前台仍是旧构建（
                  {buildSha.slice(0, 7)}）。GitHub Pages 部署完成后，首页与此处数值会自动一致。
                </p>
              )}
              {syncState === "unknown" && !buildSha && (
                <p className="mono mt-2 text-[10px] text-[var(--ia-mist)] opacity-70">
                  // 本次构建未携带 GITHUB_SHA（如本地构建），无法自动比对前台同步状态。
                </p>
              )}
              <p className="mono mt-1 text-[10px] text-[var(--ia-mist)] opacity-70">
                // 首页 / 详情页 / 控制台读取同一套引擎输出（/data/summary.json），不存在两套算法。
              </p>
              {wl.recentEvents.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {wl.recentEvents.slice(0, 4).map((ev, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-[var(--ia-mist)]">
                        <span className="mono mr-1.5 text-[10px] uppercase text-[var(--ia-neon)]">{ev.type}</span>
                        {ev.title}
                      </span>
                      <span className="mono shrink-0 text-[var(--ia-nebula)]">+{ev.contribution.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : summaryErr ? (
            <p className="mt-3 text-xs text-[var(--ia-warning)]">{summaryErr}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-3 w-64 max-w-full" />
              <Skeleton className="h-3 w-52 max-w-full" />
            </div>
          )}
        </section>

        {/* 快速发布 */}
        <section className="glass-card adm-static rounded-2xl p-4 lg:p-5">
          <span className="eyebrow">QUICK PUBLISH // 快速发布</span>
          <div className="mt-3 grid grid-cols-4 gap-2 lg:grid-cols-8">
            {RECORD_TYPES.map((t) => (
              <a
                key={t.type}
                href={`${siteBase}/admin/publish/${t.type}`}
                className="group clickable adm-ring flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] text-center transition-all hover:border-current hover:bg-[var(--ia-panel-strong)] active:bg-[color-mix(in_srgb,currentColor_12%,var(--ia-panel))] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97]"
                style={{ color: t.accent }}
              >
                <AdminIcon name={t.icon} size={19} className="transition-transform motion-safe:group-hover:scale-110" />
                <span className="text-[10px] font-semibold text-[var(--ia-mist)] transition-colors group-hover:text-[var(--ia-ink)]">{t.label}</span>
              </a>
            ))}
            <a
              href={`${siteBase}/admin/publish`}
              className="clickable adm-ring flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--ia-line)] text-[var(--ia-mist)] transition-all hover:border-[var(--ia-line-strong)] hover:bg-[var(--ia-panel)] hover:text-[var(--ia-ink)] active:bg-[var(--ia-panel-strong)] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97]"
            >
              <AdminIcon name="plus" size={19} />
              <span className="text-[10px] font-semibold">全部</span>
            </a>
          </div>
        </section>

        {/* 内容统计 */}
        <section className="glass-card adm-static rounded-2xl p-4 lg:p-5">
          <div className="flex items-center justify-between">
            <span className="eyebrow">RECORDS // 存档统计</span>
            {summary && (
              <span className="mono text-[11px] text-[var(--ia-mist)]">
                共 {summary.totals.records} 条 · 仓库 draft {summary.totals.drafts}
              </span>
            )}
          </div>
          {summary ? (
            <div className="mt-3 grid grid-cols-2 gap-x-4 lg:grid-cols-3 lg:gap-x-6">
              {Object.entries(summary.counts).map(([k, v]) => (
                <InfoRow key={k} k={v.labelZh}>
                  {v.total}
                  {v.drafts > 0 && (
                    <span className="mono ml-1 text-[10px] text-[var(--ia-warning)]">+{v.drafts} 稿</span>
                  )}
                </InfoRow>
              ))}
            </div>
          ) : (
            !summaryErr && (
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            )
          )}
        </section>

        {/* 最近记录 */}
        {summary && summary.recent.length > 0 && (
          <section className="glass-card adm-static rounded-2xl p-4 lg:p-5">
            <span className="eyebrow">RECENT // 最近记录</span>
            <ul className="mt-2 flex flex-col">
              {summary.recent.map((r, i) => (
                <li key={i} className="border-b border-[var(--ia-line)] py-2.5 last:border-b-0">
                  <a href={`${siteBase}${r.href}`} className="group clickable adm-ring flex items-baseline justify-between gap-3 rounded-md">
                    <span className="min-w-0 truncate text-sm text-[var(--ia-ink)] transition-colors group-hover:text-[var(--ia-neon)]">
                      <span className="mono mr-1.5 text-[10px] uppercase text-[var(--ia-neon)]">{r.typeLabel}</span>
                      {r.title}
                    </span>
                    <span className="mono shrink-0 text-[10px] text-[var(--ia-mist)]">{r.date.slice(0, 10)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* ---------------- 右侧 rail（lg 起并列；移动端顺排） ---------------- */}
      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[72px]">
        {/* 仓库 / 部署状态（§8 / §12 / §16.6） */}
        <section className="glass-card adm-static rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">DEPLOY // 仓库与部署</span>
            <button
              type="button"
              onClick={loadStatus}
              aria-label="刷新状态"
              className="clickable adm-ring grid size-8 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)] transition-colors hover:border-[var(--ia-line-strong)] hover:bg-[var(--ia-panel-strong)] hover:text-[var(--ia-ink)] active:bg-[var(--ia-panel-strong)] motion-safe:active:scale-[0.95]"
            >
              <AdminIcon name="refresh" size={14} />
            </button>
          </div>
          {status ? (
            <div className="mt-2">
              <InfoRow k="repo">
                <a href={status.repo.url} target="_blank" rel="noreferrer" className="clickable text-[var(--ia-neon)]">
                  {status.repo.owner}/{status.repo.name}@{status.repo.branch}
                </a>
              </InfoRow>
              {status.latestCommit && (
                <InfoRow k="commit">
                  <a href={status.latestCommit.url} target="_blank" rel="noreferrer" className="clickable" title={status.latestCommit.message}>
                    <span className="mono text-[var(--ia-nebula)]">{status.latestCommit.sha.slice(0, 7)}</span>{" "}
                    {status.latestCommit.message.split("\n")[0].slice(0, 22)}
                  </a>
                </InfoRow>
              )}
              <InfoRow k="frontend">
                {syncState === "synced" && <StatusPill tone="success">已同步该 commit</StatusPill>}
                {syncState === "pending" && <StatusPill tone="warning">deploy pending</StatusPill>}
                {syncState === "unknown" && <span className="mono text-[11px] text-[var(--ia-mist)]">无法比对</span>}
              </InfoRow>
              {status.latestRun && (
                <InfoRow k="actions">
                  <a href={status.latestRun.url} target="_blank" rel="noreferrer" className="clickable inline-flex items-center gap-1.5">
                    <StatusPill
                      tone={
                        status.latestRun.conclusion === "success"
                          ? "success"
                          : status.latestRun.conclusion === "failure"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {status.latestRun.conclusion ?? status.latestRun.status}
                    </StatusPill>
                    <span className="mono text-[10px] text-[var(--ia-mist)]">{timeAgo(status.latestRun.createdAt)}</span>
                  </a>
                </InfoRow>
              )}
              {status.latestRunError && (
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--ia-warning)]">{status.latestRunError}</p>
              )}
              <InfoRow k="media">{status.media?.count ?? 0} 项 · R2 {status.r2Enabled ? "已启用" : "未配置"}</InfoRow>
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn size="sm" onClick={doSync} loading={syncBusy} className="flex-1">
                  <AdminIcon name="refresh" size={13} />
                  同步 GitHub 数据
                </Btn>
                <a
                  href={`${status.repo.url}/actions`}
                  target="_blank"
                  rel="noreferrer"
                  className="clickable adm-ring inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--ia-line)] px-3 text-xs font-semibold text-[var(--ia-mist)] transition-colors hover:border-[var(--ia-line-strong)] hover:bg-[var(--ia-panel-strong)] hover:text-[var(--ia-ink)] active:bg-[var(--ia-panel-strong)] motion-safe:active:scale-[0.98]"
                >
                  <AdminIcon name="external" size={12} /> Actions
                </a>
              </div>
              {syncMsg && <p className="mono mt-2 text-[11px] text-[var(--ia-mist)]">{syncMsg}</p>}
            </div>
          ) : statusErr ? (
            <ErrorState
              className="mt-3"
              title="状态获取失败"
              message={statusErr}
              onRetry={() => void loadStatus()}
            />
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-5 w-3/5" />
            </div>
          )}
        </section>

        {/* 草稿箱（§9 / §12） */}
        <section className="glass-card adm-static rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">DRAFTS // 草稿箱</span>
            <span className="mono text-[11px] text-[var(--ia-mist)]">本机 {localDrafts} 条</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--ia-mist)]">
            自动保存的未发布内容 / 发布失败的兜底副本，仅存于本机浏览器，不进前台与世界线计算。
          </p>
          <a
            href={`${siteBase}/admin/drafts`}
            className="clickable adm-ring mt-3 flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[var(--ia-line)] text-xs font-semibold text-[var(--ia-neon)] transition-colors hover:border-[color-mix(in_srgb,var(--ia-neon)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--ia-neon)_10%,transparent)] active:bg-[color-mix(in_srgb,var(--ia-neon)_16%,transparent)] motion-safe:active:scale-[0.98]"
          >
            <AdminIcon name="drafts" size={14} /> 打开草稿箱
          </a>
        </section>

        {/* Profile 完成度（§12） */}
        <section className="glass-card adm-static rounded-2xl p-4">
          <span className="eyebrow">PROFILE // 档案完成度</span>
          {profile === null && (
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          )}
          {profile === "err" && (
            <p className="mono mt-2 text-[10px] text-[var(--ia-mist)]">// 读取失败（不影响使用）</p>
          )}
          {profile && profile !== "err" && (() => {
            const checks: [string, boolean][] = [
              ["名字", Boolean(String(profile.author ?? "").trim())],
              ["Handle", Boolean(String(profile.handle ?? "").trim())],
              ["头像", Boolean(String(profile.avatar ?? "").trim())],
              ["签名", Boolean(String(profile.signature ?? "").trim())],
              ["简介 bio", Boolean(String(profile.bio ?? "").trim())],
              ["GitHub 链接", Boolean(String(profile.links?.github ?? "").trim())],
            ];
            const done = checks.filter(([, ok]) => ok).length;
            const pct = Math.round((done / checks.length) * 100);
            const missing = checks.filter(([, ok]) => !ok).map(([n]) => n);
            return (
              <div className="mt-2">
                <div className="flex items-baseline justify-between">
                  <span className="mono text-2xl font-bold text-[var(--ia-ink)]">{pct}%</span>
                  <span className="mono text-[10px] text-[var(--ia-mist)]">{done}/{checks.length}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ia-line)]">
                  <div className="h-full rounded-full bg-[var(--ia-neon)]" style={{ width: `${pct}%` }} />
                </div>
                {missing.length > 0 && (
                  <p className="mt-2 text-[11px] text-[var(--ia-mist)]">待补齐：{missing.join("、")}</p>
                )}
              </div>
            );
          })()}
        </section>

        {/* 配置健康检查（§11.3 / §12） */}
        <section className="glass-card adm-static rounded-2xl p-4">
          <span className="eyebrow">HEALTH // 配置体检</span>
          {healthInfo === null && (
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          )}
          {healthInfo === "err" && (
            <p className="mt-2 text-[11px] text-[var(--ia-warning)]">无法连接 Worker /api/health。</p>
          )}
          {healthInfo && healthInfo !== "err" && (
            <div className="mt-1">
              {(
                [
                  ["ADMIN_SECRET", healthInfo.config?.adminSecret ? "ok" : "missing"],
                  ["SESSION_SECRET", healthInfo.config?.sessionSecret ?? "?"],
                  ["GITHUB_TOKEN", healthInfo.config?.githubToken ? "ok" : "missing"],
                  ["GITHUB repo", healthInfo.config?.githubRepo ? "ok" : "missing"],
                  ["R2 媒体", healthInfo.config?.r2 ? "ok" : "未配置"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <InfoRow key={k} k={k}>
                  <span
                    className="mono text-[11px]"
                    style={{ color: v === "ok" ? "var(--ia-success)" : v === "未配置" ? "var(--ia-mist)" : "var(--ia-warning)" }}
                  >
                    {v}
                  </span>
                </InfoRow>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* =========================================================================
 * Publish index（§4：桌面 grid）
 * ========================================================================= */

export function PublishIndexScreen({ siteBase }: { siteBase: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="mono text-[11px] text-[var(--ia-mist)]">
        选择一种记录类型。发布后会直接 commit 到仓库并触发部署；写到一半的内容会自动进入本机草稿箱。
      </p>
      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 xl:grid-cols-3">
        {RECORD_TYPES.map((t) => (
          <AdminActionCard
            key={t.type}
            href={`${siteBase}/admin/publish/${t.type}`}
            className="flex items-center gap-3.5 rounded-2xl p-4"
          >
            <span
              className="icon-badge grid size-12 shrink-0 place-items-center rounded-xl"
              style={{ color: t.accent }}
            >
              <AdminIcon name={t.icon} size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-[var(--ia-ink)]">{t.label}</span>
                <span className="mono text-[10px] uppercase text-[var(--ia-mist)]">{t.labelEn}</span>
              </span>
              <span className="mt-0.5 block text-xs text-[var(--ia-mist)]">{t.desc}</span>
            </span>
            <AdminIcon name="arrow" size={16} className="shrink-0 text-[var(--ia-mist)]" />
          </AdminActionCard>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
 * Publish form（v5.0.2 §7 / §8 / §9 / §4）
 * ========================================================================= */

function buildInitialState(fields: FieldDef[]): Record<string, unknown> {
  const s: Record<string, unknown> = {};
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  for (const f of fields) {
    if (f.defaultValue !== undefined) s[f.name] = f.defaultValue;
    else if (f.kind === "tags" || f.kind === "images") s[f.name] = [];
    else if (f.kind === "toggle") s[f.name] = false;
    else if (f.kind === "date")
      s[f.name] = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    else if (f.kind === "datetime")
      s[f.name] = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    else s[f.name] = "";
  }
  return s;
}

function FieldControl({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (def.kind) {
    case "textarea":
      return (
        <Textarea
          value={String(value ?? "")}
          rows={def.rows ?? 3}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "select":
      return (
        <Listbox
          value={String(value ?? "")}
          options={def.options ?? []}
          onChange={(v) => onChange(v)}
          ariaLabel={def.label}
        />
      );
    case "tags":
      return (
        <TagInput value={(value as string[]) ?? []} onChange={onChange} placeholder={def.placeholder} />
      );
    case "images":
      return <ImageListInput value={(value as string[]) ?? []} onChange={onChange} />;
    case "image":
      return (
        <ImageUrlInput
          value={String(value ?? "")}
          onChange={onChange}
          placeholder={def.placeholder}
        />
      );
    case "toggle":
      return <Toggle checked={Boolean(value)} onChange={onChange} label={def.label} />;
    case "number":
      return (
        <Input
          type="number"
          value={value === "" || value === undefined ? "" : String(value)}
          min={def.min}
          max={def.max}
          step={def.step}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          inputMode="decimal"
        />
      );
    case "date":
      return (
        <Input type="date" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      );
    case "datetime":
      return (
        <Input
          type="datetime-local"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <Input
          type="text"
          value={String(value ?? "")}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

interface AniListSearchItem {
  id: number;
  idMal?: number | null;
  title: { romaji?: string | null; english?: string | null; native?: string | null };
  coverImage?: { large?: string | null } | null;
  episodes?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  genres?: string[];
  studios?: { nodes?: Array<{ name?: string | null }> };
  siteUrl?: string | null;
}

/* ---- §8：发布错误分类（每类给不同提示 + 兜底策略） ---- */

type ErrKind = "form" | "worker" | "auth" | "github" | "unknown";

interface PublishErrorInfo {
  kind: ErrKind;
  title: string;
  message: string;
}

function classifyPublishError(e: unknown): PublishErrorInfo {
  if (e instanceof AdminApiError) {
    if (e.code === "UNAUTHORIZED") {
      return { kind: "auth", title: "登录已失效", message: "会话过期，请重新登录。内容已存入本机草稿箱，登录后可从草稿箱恢复。" };
    }
    if (e.code === "NO_API_BASE" || e.code === "NETWORK" || e.code === "NOT_A_WORKER") {
      return {
        kind: "worker",
        title: "Worker API 连接失败",
        message: `${e.message} 内容已保留在表单并写入本机草稿箱，网络恢复后可直接「重新发布」。`,
      };
    }
    if (e.code === "SERVER_MISCONFIGURED" || e.code === "RATE_LIMITED") {
      return { kind: "worker", title: "Worker 配置 / 限流问题", message: `${e.message} 内容已保留，可稍后重试。` };
    }
    if (e.code.startsWith("GITHUB") || e.code === "CONFLICT") {
      return {
        kind: "github",
        title: "GitHub Commit 失败",
        message: `${e.message} 内容已保留并写入草稿箱，可点击「重新发布」重试。`,
      };
    }
    if (e.code === "MISSING_FIELDS" || e.code === "UNKNOWN_TYPE") {
      return { kind: "form", title: "表单校验未通过", message: e.message };
    }
    return { kind: "unknown", title: "发布失败", message: `${e.message} 内容已保留并写入草稿箱。` };
  }
  return {
    kind: "unknown",
    title: "发布失败",
    message: `${e instanceof Error ? e.message : "未知错误"}。内容已保留并写入草稿箱。`,
  };
}

const ERR_KIND_LABEL: Record<ErrKind, string> = {
  form: "表单校验失败",
  worker: "Worker API 失败",
  auth: "会话失效",
  github: "GitHub Commit 失败",
  unknown: "未知错误",
};

export function PublishFormScreen({
  siteBase,
  type,
}: {
  siteBase: string;
  type: string;
}) {
  const def = getRecordType(type);

  const [state, setState] = useState<Record<string, unknown>>(() =>
    buildInitialState(def?.fields ?? []),
  );
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorInfo, setErrorInfo] = useState<PublishErrorInfo | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [result, setResult] = useState<api.PublishResult | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [autosavedAt, setAutosavedAt] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [animeQuery, setAnimeQuery] = useState("");
  const [bangumiBusy, setBangumiBusy] = useState(false);
  const [bangumiResults, setBangumiResults] = useState<api.BangumiSearchItem[]>([]);
  const [bangumiError, setBangumiError] = useState<string | null>(null);
  const [animeBusy, setAnimeBusy] = useState(false);
  const [animeResults, setAnimeResults] = useState<AniListSearchItem[]>([]);
  const [animeError, setAnimeError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState("");
  /* v5.4：dirty=本会话内有过编辑且尚未成功发布；attempted=点过发布（用于必填项红标） */
  const [dirty, setDirty] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const toast = useToast();
  const dialog = useDialog();
  const navigate = useAdminNavigate();

  useEffect(() => {
    if (def?.type !== "project" || new URLSearchParams(location.search).get("repoDraft") !== "1") return;
    try {
      const raw = sessionStorage.getItem("wl-project-repo-draft");
      if (!raw) return;
      const draft = JSON.parse(raw) as { title?: string; description?: string; repo?: string; github?: { owner?: string; repo?: string } };
      if (!draft.github?.owner || !draft.github.repo) return;
      setState((current) => ({ ...current, title: current.title || draft.title || "", description: current.description || draft.description || "", repo: current.repo || draft.repo || "", github: { owner: draft.github!.owner, repo: draft.github!.repo } }));
      sessionStorage.removeItem("wl-project-repo-draft");
      setNoticeMsg("已创建 Project Draft：只预填 GitHub owner / repo，不写入 stars、forks 或 language。");
    } catch { /* storage unavailable */ }
  }, [def]);

  /* ---- 部署状态轮询（§8：commit 后拆分 deploy / frontend） ---- */
  const [deployStatus, setDeployStatus] = useState<api.AdminStatus | null>(null);
  const [frontendState, setFrontendState] = useState<"idle" | "checking" | "live" | "not-ready">("idle");
  const [slowHint, setSlowHint] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  /* ---- 草稿恢复（?draft=<id>，§9） ---- */
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !def) return;
    restoredRef.current = true;
    try {
      const id = new URLSearchParams(location.search).get("draft");
      if (!id) return;
      const d = draftsLib.getDraft(id);
      if (!d) {
        setNoticeMsg("未找到该草稿（可能已在其他页面删除）。");
        return;
      }
      if (d.type !== def.type) {
        setNoticeMsg(`该草稿类型是「${d.type}」，与当前表单不符，请回草稿箱重新打开。`);
        return;
      }
      setState({ ...buildInitialState(def.fields), ...d.state });
      setBody(d.body ?? "");
      setDraftId(d.id);
      if (d.status === "failed" && d.lastError) {
        setErrorInfo({
          kind: (d.lastErrorKind as ErrKind) ?? "unknown",
          title: "上次发布失败",
          message: d.lastError,
        });
      }
      setNoticeMsg("已恢复草稿，可继续编辑或重新发布。");
    } catch {
      /* localStorage 不可用时静默 */
    }
  }, [def]);

  /* ---- 自动保存（§9：表单内容变更即落本机草稿） ---- */
  const autosaveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!def || result) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      if (!draftsLib.hasDraftContent(state, body)) return;
      const id = draftsLib.saveDraft({ id: draftId ?? undefined, type: def.type, state, body });
      if (!draftId) setDraftId(id);
      const t = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setAutosavedAt(`${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`);
    }, 900);
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [state, body, def, draftId, result]);

  /* ---- commit 成功后轮询部署状态（严格按本次 SHA，每 8 秒，最多 15 分钟） ---- */
  useEffect(() => {
    if (!result) return;
    setSlowHint(false);
    setStatusError(null);
    const slowTimer = window.setTimeout(() => setSlowHint(true), 90_000);
    const load = () => api.getStatus({ sha: result.commitSha }).then((status) => {
      setDeployStatus(status);
      setLastCheckedAt(new Date().toLocaleTimeString());
      setStatusError(null);
    }).catch(() => setStatusError("无法刷新部署状态，请检查网络后重新检查。"));
    load();
    pollTimerRef.current = window.setInterval(load, 8_000);
    const refreshNow = () => void load();
    document.addEventListener("visibilitychange", refreshNow);
    window.addEventListener("focus", refreshNow);
    window.addEventListener("online", refreshNow);
    const killTimer = window.setTimeout(() => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }, 15 * 60_000);
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      window.clearTimeout(slowTimer);
      window.clearTimeout(killTimer);
      document.removeEventListener("visibilitychange", refreshNow);
      window.removeEventListener("focus", refreshNow);
      window.removeEventListener("online", refreshNow);
    };
  }, [result]);

  const missing = useMemo(() => {
    if (!def) return [] as FieldDef[];
    return def.fields
      .filter((f) => f.required)
      .filter((f) => {
        const v = state[f.name];
        if (Array.isArray(v)) return v.filter((x) => String(x).trim() !== "").length === 0;
        return v === "" || v === undefined || v === null;
      });
  }, [def, state]);

  /* ---- 部署阶段推导 ---- */
  const run = deployStatus?.latestRun ?? null;
  const runIsOurs = Boolean(run && result && run.headSha === result.commitSha);
  const runPermissionIssue = Boolean(deployStatus?.latestRunError);
  const deployDone = Boolean(runIsOurs && run && run.status === "completed" && run.conclusion === "success");
  const deployFailed = Boolean(
    runIsOurs && run && run.status === "completed" && run.conclusion && run.conclusion !== "success",
  );

  useEffect(() => {
    if (!deployDone || !result?.htmlPath) return;
    let cancelled = false;
    let timer = 0;
    const check = async () => {
      setFrontendState("checking");
      try {
        const separator = result.htmlPath!.includes("?") ? "&" : "?";
        const summaryResponse = await fetch(`${siteBase}/data/summary.json?deploy=${result.commitSha.slice(0, 8)}`, { cache: "no-store" });
        const summary = await summaryResponse.json().catch(() => null) as { buildSha?: string } | null;
        if (!summary?.buildSha || summary.buildSha !== result.commitSha) {
          if (!cancelled) setFrontendState("not-ready");
          return;
        }
        const response = await fetch(`${siteBase}${result.htmlPath}${separator}deploy=${result.commitSha.slice(0, 8)}`, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!cancelled) {
          const live = response.status === 200 && summary.buildSha === result.commitSha;
          setFrontendState(live ? "live" : "not-ready");
          if (live && timer) window.clearInterval(timer);
        }
      } catch {
        if (!cancelled) setFrontendState("not-ready");
      }
    };
    void check();
    timer = window.setInterval(check, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [deployDone, result, siteBase]);

  useEffect(() => {
    if (frontendState === "live" && pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, [frontendState]);

  /* v5.4：未发布的编辑在离开前拦截（先落草稿再询问，避免"误报丢失"） */
  const guardActive = dirty && !result;
  useAdminNavGuard(
    guardActive
      ? async () => {
          if (def && draftsLib.hasDraftContent(state, body)) {
            const id = draftsLib.saveDraft({ id: draftId ?? undefined, type: def.type, state, body });
            if (!draftId) setDraftId(id);
          }
          return dialog.confirm({
            title: "离开当前编辑？",
            message: "改动已自动保存到本机草稿箱，离开后可随时从「草稿箱」恢复继续。",
            confirmLabel: "离开",
            cancelLabel: "留在此页",
          });
        }
      : null,
  );
  useEffect(() => {
    if (!guardActive) return undefined;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [guardActive]);

  /* v5.4：顶栏 SaveStatusPill */
  useReportSaveStatus(
    busy
      ? { tone: "saving", label: "正在提交…" }
      : result
        ? { tone: "saved", label: "已发布" }
        : dirty
          ? { tone: "dirty", label: autosavedAt ? `编辑中 · 草稿 ${autosavedAt}` : "编辑中" }
          : autosavedAt
            ? { tone: "saved", label: `草稿已保存 ${autosavedAt}` }
            : null,
  );

  if (!def) {
    return <ErrorBox>未知的记录类型：{type}</ErrorBox>;
  }

  const set = (name: string) => (v: unknown) => {
    setDirty(true);
    setState((s) => ({ ...s, [name]: v }));
  };

  const searchAnime = async () => {
    const search = animeQuery.trim();
    if (!search) return;
    setAnimeBusy(true);
    setAnimeError(null);
    try {
      const query = `query ($search: String) {
        Page(page: 1, perPage: 6) {
          media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id idMal title { romaji english native } coverImage { large }
            episodes season seasonYear genres studios(isMain: true) { nodes { name } } siteUrl
          }
        }
      }`;
      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables: { search } }),
      });
      if (!response.ok) throw new Error(`AniList 返回 HTTP ${response.status}`);
      const json = await response.json() as { data?: { Page?: { media?: AniListSearchItem[] } }; errors?: Array<{ message?: string }> };
      if (json.errors?.length) throw new Error(json.errors[0]?.message || "AniList 查询失败");
      setAnimeResults(json.data?.Page?.media ?? []);
    } catch (error) {
      setAnimeResults([]);
      setAnimeError(`${error instanceof Error ? error.message : "无法连接 AniList"}。可继续手动填写并使用本地 content。`);
    } finally {
      setAnimeBusy(false);
    }
  };

  const applyAnime = (item: AniListSearchItem) => {
    setDirty(true);
    setState((current) => ({
      ...current,
      title: current.title || item.title.english || item.title.romaji || item.title.native || "",
      cover: current.cover || item.coverImage?.large || "",
      externalIds: { ...((current.externalIds as Record<string, unknown>) ?? {}), anilist: item.id, ...(item.idMal ? { mal: item.idMal } : {}) },
    }));
    setAnimeResults([]);
    setNoticeMsg("已从 AniList 导入真实番剧资料；观看状态、评分与短评仍由你填写。");
  };

  const applyProjectRepo = () => {
    // Bangumi is intentionally scoped to the anime publisher state above.
    const repo = githubReposData.repos.find((item) => item.repo === selectedRepo);
    if (!repo) return;
    setDirty(true);
    setState((current) => ({
      ...current,
      title: current.title || repo.repo,
      description: current.description || repo.description,
      repo: repo.url,
      github: { owner: repo.owner, repo: repo.repo },
    }));
    setNoticeMsg("已关联 GitHub 仓库。stars、forks、language 等技术事实仅从 repos.json 快照读取。");
  };

  const searchBangumi = async () => {
    const search = animeQuery.trim(); if (!search) return;
    setBangumiBusy(true); setBangumiError(null);
    try { setBangumiResults((await api.bangumiSearch(search)).items); } catch (error) { setBangumiResults([]); setBangumiError(error instanceof Error ? error.message : "Bangumi search failed."); } finally { setBangumiBusy(false); }
  };
  const applyBangumi = (item: api.BangumiSearchItem) => {
    setDirty(true);
    setState((current) => ({ ...current, title: item.titleCn || item.titleJP || current.title, titleCn: item.titleCn || current.titleCn, titleJP: item.titleJP || current.titleJP, cover: item.cover || current.cover, episodes: item.episodes ?? current.episodes, year: item.year ?? current.year, bangumiSummary: item.summary || current.bangumiSummary, bangumiAirDate: item.airDate || current.bangumiAirDate, bangumiRank: item.rank ?? current.bangumiRank, bangumiTags: item.tags, bangumiCommunityScore: item.score ?? current.bangumiCommunityScore, externalUrl: item.externalUrl, externalIds: { ...((current.externalIds as Record<string, unknown>) ?? {}), bangumi: item.id } })); setBangumiResults([]); setNoticeMsg("Bangumi metadata applied.");
  };

  const importMarkdown = async (file?: File) => {
    if (!file) return;
    if (body.trim()) {
      const ok = await dialog.confirm({
        title: "覆盖当前正文？",
        message: "重新导入会用文件内容覆盖当前正文与同名 frontmatter 字段。",
        confirmLabel: "覆盖导入",
        cancelLabel: "取消",
      });
      if (!ok) {
        if (importInputRef.current) importInputRef.current.value = "";
        return;
      }
    }
    setImportBusy(true);
    setErrorInfo(null);
    try {
      const parsed = await readMarkdownFile(file);
      const aliases: Record<string, string> = { description: "description", summary: "summary" };
      const allowed = new Set(def.fields.map((field) => field.name));
      setDirty(true);
      setState((current) => {
        const next = { ...current };
        for (const [rawKey, value] of Object.entries(parsed.attributes)) {
          const key = aliases[rawKey] ?? rawKey;
          if (allowed.has(key) && value !== "" && value !== undefined) next[key] = value;
        }
        return next;
      });
      setBody(parsed.body);
      setNoticeMsg(`已导入 ${file.name}，frontmatter 与正文均可继续编辑。`);
    } catch (error) {
      setErrorInfo({
        kind: "form",
        title: "Markdown 导入失败",
        message: error instanceof Error ? error.message : "无法读取该文件；原表单内容未改动。",
      });
    } finally {
      setImportBusy(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const saveDraftNow = () => {
    const id = draftsLib.saveDraft({ id: draftId ?? undefined, type: def.type, state, body, status: "draft" });
    setDraftId(id);
    setDirty(false);
    setNoticeMsg("已保存到本机草稿箱。可随时在「草稿箱」中恢复编辑。");
    toast.success("已保存到草稿箱", "仅存于本机浏览器，不会进入仓库");
  };

  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(state)) {
      if (v === "" || v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        const arr = v
          .map((x) => (typeof x === "string" ? x.trim() : x))
          .filter((x) => x !== "" && x !== undefined && x !== null);
        if (arr.length === 0) continue;
        payload[k] = arr;
        continue;
      }
      payload[k] = v;
    }
    if (def.hasBody && body.trim()) payload.body = body;
    return payload;
  };

  const submit = async () => {
    setErrorInfo(null);
    setNoticeMsg(null);
    setAttempted(true);
    /* Step 1：表单校验（v5.4：toast 汇总 + 滚动定位到第一个缺失字段） */
    if (missing.length) {
      setErrorInfo({
        kind: "form",
        title: "表单校验未通过",
        message: `还有必填项未填：${missing.map((f) => f.label).join("、")}。`,
      });
      toast.error(`还有 ${missing.length} 个必填项未填`, missing.map((f) => f.label).join("、"));
      const firstName = missing[0]?.name;
      if (firstName) {
        requestAnimationFrame(() => {
          const holder = document.querySelector<HTMLElement>(`[data-field="fld-${firstName}"]`);
          if (!holder) return;
          holder.scrollIntoView({ behavior: "smooth", block: "center" });
          const control = holder.querySelector<HTMLElement>(
            "input, textarea, select, button, [tabindex]",
          );
          control?.focus({ preventScroll: true });
        });
      }
      return;
    }
    setBusy(true);
    let safetyDraftId = draftId;
    if (draftsLib.hasDraftContent(state, body)) {
      safetyDraftId = draftsLib.saveDraft({ id: draftId ?? undefined, type: def.type, state, body, status: "draft" });
      setDraftId(safetyDraftId);
    }
    /* Step 2：提交 GitHub Commit */
    try {
      const r = await api.publish(def.type, buildPayload());
      draftsLib.clearDraftAfterPublish(safetyDraftId);
      setDraftId(null);
      setAutosavedAt(null);
      setDirty(false);
      setAttempted(false);
      setResult(r);
      toast.success("已提交到 GitHub", `commit ${r.commitSha.slice(0, 7)} · 部署自动进行`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const info = classifyPublishError(e);
      /* §9：任何失败都先把内容写进草稿箱再说 */
      if (draftsLib.hasDraftContent(state, body)) {
        const id = draftsLib.saveDraft({
          id: safetyDraftId ?? undefined,
          type: def.type,
          state,
          body,
          status: "failed",
          lastError: `${ERR_KIND_LABEL[info.kind]}：${info.message}`,
          lastErrorKind: info.kind,
        });
        setDraftId(id);
      }
      if (info.kind === "auth") {
        location.href = `${siteBase}/admin/login`;
        return;
      }
      setErrorInfo(info);
      toast.error(info.title, `${ERR_KIND_LABEL[info.kind]} · 内容已进入本机草稿箱`);
    } finally {
      setBusy(false);
    }
  };

  /* ===================== 发布结果面板（§8 状态拆分） ===================== */
  if (result) {
    const viewHref = result.htmlPath ? `${siteBase}${result.htmlPath}` : null;
    const actionsUrl =
      (runIsOurs && run?.url) ||
      (deployStatus?.repo ? `${deployStatus.repo.url}/actions` : result.commitUrl.replace(/\/commit\/[^/]+$/, "/actions"));

    const deployState: StepState = runPermissionIssue
      ? "warn"
      : deployFailed
        ? "error"
        : deployDone
          ? "done"
          : "active";

    const steps: { label: string; state: StepState; detail?: React.ReactNode }[] = [
      { label: "表单校验", state: "done" },
      {
        label: "已提交到 GitHub ✅",
        state: "done",
        detail: (
          <div className="flex flex-col gap-0.5">
            <span>
              commit{" "}
              <a href={result.commitUrl} target="_blank" rel="noreferrer" className="clickable mono text-[var(--ia-nebula)] underline">
                {result.commitSha.slice(0, 7)} ↗
              </a>
              <span className="mono ml-2 text-[10px] uppercase text-[var(--ia-neon)]">{result.type}</span>
            </span>
            <span className="mono break-all text-[10px]">{result.path}</span>
          </div>
        ),
      },
      {
        label: "GitHub Actions / Pages 部署",
        state: deployState,
        detail: (
          <div className="flex flex-col gap-1">
            {runPermissionIssue ? (
              <span className="text-[var(--ia-warning)]">{deployStatus?.latestRunError}</span>
            ) : deployFailed ? (
              <span className="text-[var(--ia-danger)]">
                Actions 构建失败（{run?.conclusion}）。内容已成功 commit，未丢失；修复构建后会自动部署。
              </span>
            ) : deployDone ? (
              <span className="text-[var(--ia-success)]">部署完成（{run ? timeAgo(run.createdAt) : ""}）。</span>
            ) : (
              <span>
                {runIsOurs && run ? `构建部署中（${run.status}）…` : "已提交，等待 GitHub Pages 部署…"}
                <span className="mono ml-1 text-[10px] opacity-80">通常 1–5 分钟；hosted runner 异常时可能更久。</span>
              </span>
            )}
            {slowHint && !deployDone && !deployFailed && (
              <span className="text-[var(--ia-warning)]">
                本次部署偏慢——这是 GitHub Actions 排队，不是发布失败；内容已在仓库中。
              </span>
            )}
            <span className="flex flex-wrap gap-3 pt-0.5">
              <a href={actionsUrl} target="_blank" rel="noreferrer" className="clickable underline">查看 Actions ↗</a>
              <a href={result.commitUrl} target="_blank" rel="noreferrer" className="clickable underline">查看 Commit ↗</a>
              <button
                type="button"
                className="clickable inline-flex items-center gap-1 underline"
                onClick={() => result && api.getStatus({ sha: result.commitSha }).then((status) => { setDeployStatus(status); setLastCheckedAt(new Date().toLocaleTimeString()); setStatusError(null); }).catch(() => setStatusError("无法刷新部署状态，请稍后重试。"))}
              >
                <AdminIcon name="refresh" size={11} /> 稍后刷新状态
              </button>
              {lastCheckedAt && <span className="mono text-[11px] text-[var(--ia-mist)]">最后成功检查：{lastCheckedAt}</span>}
              {statusError && <span className="text-xs text-[var(--ia-warning)]">{statusError}</span>}
            </span>
          </div>
        ),
      },
      {
        label: "前台页面可访问",
        state: frontendState === "live" ? "done" : frontendState === "not-ready" ? "warn" : deployDone ? "active" : "pending",
        detail: frontendState === "live" ? (
          <span>
            已通过 HTTP 200 确认前台页面可访问。
            {viewHref && (
              <a href={viewHref} className="clickable ml-1 underline">打开前台页面 ↗</a>
            )}
          </span>
        ) : frontendState === "not-ready" ? (
          <span>GitHub Actions 已成功，但 Pages 仍在同步；当前 URL 尚未返回 200，将自动重试。</span>
        ) : frontendState === "checking" ? (
          <span>正在确认前台页面是否返回 HTTP 200…</span>
        ) : (
          <span>等待 Actions 成功后再检查前台页面。</span>
        ),
      },
    ];

    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <section className="glass-card adm-static corner-ticks relative rounded-2xl p-5 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full border border-[color-mix(in_srgb,var(--ia-success)_50%,transparent)] bg-[color-mix(in_srgb,var(--ia-success)_12%,transparent)] text-[var(--ia-success)]">
            <AdminIcon name="check" size={26} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-[var(--ia-ink)]">已提交至世界线</h2>
          <p className="mono mt-1 text-[11px] text-[var(--ia-mist)]">{result.message}</p>
        </section>

        <section className="glass-card adm-static rounded-2xl p-4">
          <Steps items={steps} />
        </section>

        <div className="flex flex-col gap-2.5">
          {viewHref && (
            <Btn kind="primary" full onClick={() => (location.href = viewHref)} disabled={frontendState !== "live"}>
              <AdminIcon name="external" size={15} />
              {frontendState === "live" ? "查看前台页面" : "部署中，稍后查看"}
            </Btn>
          )}
          <Btn
            full
            onClick={() => {
              setResult(null);
              setDeployStatus(null);
              setFrontendState("idle");
              setState(buildInitialState(def.fields));
              setBody("");
              setErrorInfo(null);
              setNoticeMsg(null);
              setDirty(false);
              setAttempted(false);
            }}
          >
            <AdminIcon name="plus" size={15} /> 再发一条{def.label}
          </Btn>
          <Btn full onClick={() => void navigate({ screen: "dashboard" })}>
            返回总览
          </Btn>
        </div>
      </div>
    );
  }

  /* ===================== 表单主体（§4：lg 起左右分栏） ===================== */
  const TAIL = new Set(["tags", "worldlineImpact", "featured", "draft", "related", "slug", "cover", "coverDay", "coverNight"]);
  const mainFields = def.fields.filter((f) => !TAIL.has(f.name));
  const tailFields = def.fields.filter((f) => TAIL.has(f.name));

  const missingNames = new Set(missing.map((f) => f.name));
  const renderField = (f: FieldDef) =>
    f.kind === "toggle" ? (
      <FieldControl key={f.name} def={f} value={state[f.name]} onChange={set(f.name)} />
    ) : (
      <Field
        key={f.name}
        label={f.label}
        required={f.required}
        help={f.help}
        fieldId={`fld-${f.name}`}
        invalid={attempted && missingNames.has(f.name)}
        error={attempted && missingNames.has(f.name) ? "该必填项还未填写。" : undefined}
      >
        <FieldControl def={f} value={state[f.name]} onChange={set(f.name)} />
      </Field>
    );

  const autosaveLine = autosavedAt && (
    <p className="mono text-[10px] text-[var(--ia-mist)]">
      已自动保存 {autosavedAt} · 本机草稿箱可恢复
    </p>
  );

  return (
    <div className="flex flex-col gap-4 pb-24 lg:pb-4">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
        {/* 左：主编辑区 */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="icon-badge grid size-11 shrink-0 place-items-center rounded-xl" style={{ color: def.accent }}>
              <AdminIcon name={def.icon} size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[var(--ia-ink)]">发布{def.label}</h2>
              <p className="mono text-[10px] uppercase text-[var(--ia-mist)]">{def.labelEn} · {def.desc}</p>
            </div>
          </div>

          <div className="glass-card adm-static flex flex-col gap-4 rounded-2xl p-4 lg:p-5">
            {def.type === "project" && (
              <div className="rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-3">
                <p className="text-sm font-semibold text-[var(--ia-ink)]">从 GitHub 仓库导入</p>
                <p className="mono mt-0.5 text-[10px] text-[var(--ia-mist)]">缓存同步于 {githubReposData.generatedAt?.slice(0, 10) || "unavailable"} · 手动选择才展示</p>
                <div className="mt-3 flex gap-2">
                  <Listbox className="flex-1" value={selectedRepo} onChange={(v) => setSelectedRepo(v)} ariaLabel="选择 GitHub 仓库" options={[{ value: "", label: "选择仓库…" }, ...githubReposData.repos.map((repo) => ({ value: repo.repo, label: `${repo.repo} · ★ ${repo.stars}` }))]} />
                  <Btn onClick={applyProjectRepo} disabled={!selectedRepo}><AdminIcon name="github" size={14} /> 导入</Btn>
                </div>
              </div>
            )}
            {def.type === "anime" && (
              <div className="rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-3">
                <p className="text-sm font-semibold text-[var(--ia-ink)]">AniList 番剧资料导入</p>
                <p className="mono mt-0.5 text-[10px] text-[var(--ia-mist)]">公开 GraphQL API · 无需密钥 · 失败时保留本地表单</p>
                <div className="mt-3 flex gap-2">
                  <Input
                    value={animeQuery}
                    onChange={(event) => setAnimeQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") { event.preventDefault(); void searchBangumi(); }
                    }}
                    placeholder="搜索日文 / 英文标题"
                    className="flex-1"
                  />
                  <Btn onClick={() => void searchBangumi()} loading={bangumiBusy}>
                    <AdminIcon name="search" size={14} /> Bangumi
                  </Btn>
                </div>
                {bangumiError && <p className="mt-2 text-xs text-[var(--ia-warning)]">{bangumiError}</p>}
                {bangumiResults.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {bangumiResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => applyBangumi(item)}
                        className="clickable flex min-h-16 items-center gap-2 rounded-lg border border-[var(--ia-line)] p-2 text-left hover:border-[var(--ia-neon)]"
                      >
                        {item.cover && <img src={item.cover} alt="" className="h-14 w-10 rounded object-cover" />}
                        <span className="min-w-0">
                          <span className="line-clamp-2 text-xs font-semibold text-[var(--ia-ink)]">{item.titleCn || item.titleJP}</span>
                          <span className="mono text-[10px] text-[var(--ia-mist)]">{item.seasonYear ?? "—"} · {item.episodes ?? "?"} 集</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <details className="mt-4 border-t border-[var(--ia-line)] pt-3">
                  <summary className="cursor-pointer text-xs text-[var(--ia-mist)]">AniList optional supplement</summary>
                  <div className="mt-3"><Btn onClick={() => void searchAnime()} loading={animeBusy}>Search AniList</Btn></div>
                  {animeError && <p className="mt-2 text-xs text-[var(--ia-warning)]">{animeError}</p>}
                  {animeResults.length > 0 && <div className="mt-3 grid gap-2">{animeResults.map((item) => <button key={item.id} type="button" onClick={() => applyAnime(item)} className="rounded-lg border border-[var(--ia-line)] p-2 text-left"><b>{item.title.english || item.title.romaji || item.title.native}</b></button>)}</div>}
                </details>
              </div>
            )}
            {(def.type === "post" || def.type === "bug") && (
              <div className="rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ia-ink)]">从 Markdown / MDX 导入</p>
                    <p className="mono text-[10px] text-[var(--ia-mist)]">最大 2 MB · 自动解析 frontmatter</p>
                  </div>
                  <label className="clickable inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--ia-line)] px-3 text-xs text-[var(--ia-ink)]">
                    {importBusy ? <Spinner size={13} /> : <AdminIcon name="upload" size={14} />}
                    选择文件
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".md,.mdx,text/markdown,text/plain"
                      className="sr-only"
                      disabled={importBusy}
                      onChange={(event) => void importMarkdown(event.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            )}
            {mainFields.map(renderField)}
            {def.hasBody && (
              <Field label={def.bodyLabel ?? "正文（Markdown）"}>
                <Textarea
                  value={body}
                  rows={12}
                  onChange={(e) => {
                    setDirty(true);
                    setBody(e.target.value);
                  }}
                  placeholder={"支持 Markdown。\n\n## 小标题\n正文……"}
                  className="mono !text-[13px] lg:min-h-[320px]"
                />
              </Field>
            )}
          </div>
        </div>

        {/* 右：元数据 + 操作（lg 起 sticky rail；移动端顺排） */}
        <aside className="mt-4 flex min-w-0 flex-col gap-4 lg:sticky lg:top-[72px] lg:mt-0">
          <Section title="META // 标签 · 世界线 · 发布选项">
            {tailFields.map(renderField)}
          </Section>

          {/* 桌面操作卡（移动端由 BottomBar 承担） */}
          <div className="glass-card adm-static hidden flex-col gap-2.5 rounded-2xl p-4 lg:flex">
            <Btn kind="primary" full onClick={submit} loading={busy}>
              <AdminIcon name="publish" size={16} />
              发布{def.label}{state.draft ? "（草稿）" : ""}
            </Btn>
            <Btn full onClick={saveDraftNow} disabled={busy}>
              <AdminIcon name="save" size={15} /> 保存到草稿箱
            </Btn>
            {autosaveLine}
          </div>
        </aside>
      </div>

      {errorInfo && (
        <ErrorBox>
          <p className="font-semibold">{errorInfo.title}（{ERR_KIND_LABEL[errorInfo.kind]}）</p>
          <p className="mt-0.5">{errorInfo.message}</p>
          {errorInfo.kind !== "form" && (
            <button type="button" onClick={submit} className="clickable mt-2 inline-flex items-center gap-1.5 rounded-lg border border-current px-3 py-1.5 text-xs font-semibold">
              <AdminIcon name="refresh" size={12} /> 重新发布
            </button>
          )}
        </ErrorBox>
      )}
      {noticeMsg && <Notice tone="neon">{noticeMsg}</Notice>}
      <div className="lg:hidden">{autosaveLine}</div>

      <BottomBar className="lg:hidden">
        <Btn onClick={saveDraftNow} disabled={busy} className="shrink-0 !px-3.5" aria-label="保存到草稿箱">
          <AdminIcon name="save" size={16} />
        </Btn>
        <Btn kind="primary" full onClick={submit} loading={busy}>
          <AdminIcon name="publish" size={16} />
          发布{def.label}{state.draft ? "（草稿）" : ""}
        </Btn>
      </BottomBar>
    </div>
  );
}

/* =========================================================================
 * Drafts（v5.0.2 §9：草稿箱页面）
 * ========================================================================= */

export function DraftsScreen({ siteBase }: { siteBase: string }) {
  const [items, setItems] = useState<draftsLib.DraftRecord[]>([]);
  const toast = useToast();
  const dialog = useDialog();

  useEffect(() => {
    setItems(draftsLib.listDrafts());
  }, []);

  const remove = async (d: draftsLib.DraftRecord) => {
    const ok = await dialog.confirm({
      title: "删除这条草稿？",
      message: (
        <>
          「{d.title || "未命名草稿"}」将从本机浏览器移除，此操作不可恢复。
          已发布到仓库的内容不受影响。
        </>
      ),
      confirmLabel: "删除草稿",
      cancelLabel: "取消",
      danger: true,
    });
    if (!ok) return;
    draftsLib.deleteDraft(d.id);
    setItems(draftsLib.listDrafts());
    toast.success("草稿已删除", "仅移除了本机副本");
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h2 className="text-base font-bold text-[var(--ia-ink)]">草稿箱</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--ia-mist)]">
          自动保存与发布失败的兜底副本。草稿仅存于本机浏览器（localStorage），
          不会出现在前台时间线 / 搜索 / 记录 / 世界线计算中，也不会被提交到仓库。
        </p>
      </div>

      {items.length === 0 && (
        <EmptyState
          icon="drafts"
          title="还没有草稿"
          hint="发布表单会自动把写到一半的内容存到这里。"
        >
          <a
            href={`${siteBase}/admin/publish`}
            className="clickable adm-ring mono inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--ia-neon)]"
          >
            去发布 <AdminIcon name="arrow" size={12} />
          </a>
        </EmptyState>
      )}

      {items.map((d) => {
        const t = getRecordType(d.type);
        const editHref = `${siteBase}/admin/publish/${d.type}?draft=${encodeURIComponent(d.id)}`;
        return (
          <section key={d.id} className="glass-card adm-static rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span
                className="icon-badge grid size-11 shrink-0 place-items-center rounded-xl"
                style={{ color: t?.accent ?? "var(--ia-mist)" }}
              >
                <AdminIcon name={t?.icon ?? "drafts"} size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="mono text-[10px] uppercase text-[var(--ia-neon)]">{t?.label ?? d.type}</span>
                  {d.status === "failed" ? (
                    <StatusPill tone="danger">上次发布失败</StatusPill>
                  ) : (
                    <StatusPill tone="mist">草稿</StatusPill>
                  )}
                  <span className="mono text-[10px] text-[var(--ia-mist)]">编辑于 {timeAgo(d.updatedAt)}</span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-[var(--ia-ink)]">{d.title}</p>
                {d.status === "failed" && d.lastError && (
                  <p className="mt-1 break-words text-[11px] leading-relaxed text-[var(--ia-danger)]">{d.lastError}</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={editHref}
                className="clickable inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--ia-neon)_55%,transparent)] bg-[color-mix(in_srgb,var(--ia-neon)_14%,transparent)] px-3 text-xs font-semibold text-[var(--ia-neon)]"
              >
                <AdminIcon name="arrow" size={13} /> 恢复编辑
              </a>
              {d.status === "failed" && (
                <a
                  href={editHref}
                  className="clickable inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--ia-line)] px-3 text-xs font-semibold text-[var(--ia-ink)]"
                >
                  <AdminIcon name="refresh" size={13} /> 重新发布
                </a>
              )}
              <button
                type="button"
                onClick={() => void remove(d)}
                className="clickable adm-ring inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--ia-danger)_50%,transparent)] px-3 text-xs font-semibold text-[var(--ia-danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--ia-danger)_12%,transparent)]"
              >
                <AdminIcon name="trash" size={13} />
                删除
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* =========================================================================
 * Media（v5.0.2 §14：URL 模式完整管理）
 * ========================================================================= */

type ApplyTarget = "avatar" | "backgroundDay" | "backgroundNight" | "defaultCover";

const APPLY_LABEL: Record<ApplyTarget, string> = {
  avatar: "头像",
  backgroundDay: "白昼背景",
  backgroundNight: "黑夜背景",
  defaultCover: "默认封面",
};

export function MediaScreen() {
  const [items, setItems] = useState<api.MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [r2, setR2] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [applyBusy, setApplyBusy] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null);
  const toast = useToast();
  const dialog = useDialog();

  const load = () =>
    api
      .mediaList()
      .then((r) => {
        setItems(r.items);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "读取失败"));

  useEffect(() => {
    load();
    api.getStatus().then((s) => setR2(Boolean(s.r2Enabled))).catch(() => {});
  }, []);

  const register = async () => {
    const v = url.trim();
    if (!v) return;
    if (!/^https?:\/\/\S+/i.test(v)) {
      setNotice("URL 无效：必须以 http(s):// 开头。");
      toast.warning("URL 无效", "必须以 http(s):// 开头");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await api.mediaRegister(v, label.trim() || undefined);
      setUrl("");
      setLabel("");
      setNotice("已登记并提交（media.json）。");
      toast.success("已登记并提交", "media.json 已更新");
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "登记失败";
      setNotice(`登记失败：${msg}`);
      toast.error("登记失败", msg);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    setNotice(null);
    try {
      const r = await api.mediaUpload(file);
      setNotice(`上传成功：${r.url}`);
      toast.success("上传成功", "URL 已登记进媒体库");
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "上传失败";
      setNotice(`上传失败：${msg}`);
      toast.error("上传失败", msg);
    } finally {
      setUploading(false);
    }
  };

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v).then(
      () => toast.success("已复制 URL"),
      () => toast.warning("复制失败", "请长按 / 选中手动复制"),
    );
  };

  /** §14：设置为头像 / 背景 / 封面（读取现有配置 → 改一个字段 → 提交 commit） */
  const applyAs = async (target: ApplyTarget, imgUrl: string) => {
    const key = `${target}:${imgUrl}`;
    setApplyBusy(key);
    setNotice(null);
    try {
      if (target === "avatar") {
        const { data } = await api.getSettings<Record<string, any>>("profile");
        const r = await api.putSettings("profile", { ...data, avatar: imgUrl });
        setNotice(`已设为头像并提交（${r.commitSha.slice(0, 7)}），部署后前台生效。`);
        toast.success("已设为头像", `commit ${r.commitSha.slice(0, 7)} · 部署后生效`);
      } else {
        const { data } = await api.getSettings<Record<string, any>>("site");
        const r = await api.putSettings("site", { ...data, [target]: imgUrl });
        setNotice(`已设为${APPLY_LABEL[target]}并提交（${r.commitSha.slice(0, 7)}），部署后生效。`);
        toast.success(`已设为${APPLY_LABEL[target]}`, `commit ${r.commitSha.slice(0, 7)} · 部署后生效`);
      }
      setOpenMenuFor(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "设置失败";
      setNotice(`设置失败：${msg}`);
      toast.error("设置失败", msg);
    } finally {
      setApplyBusy(null);
    }
  };

  const remove = async (m: api.MediaItem) => {
    const ok = await dialog.confirm({
      title: "从媒体清单移除？",
      message: (
        <>
          「{m.label || m.url}」将从 <span className="mono">media.json</span> 中移除并提交 commit。
          远端图片文件本身不受影响，已引用它的内容也不会被改写。
        </>
      ),
      confirmLabel: "移除",
      cancelLabel: "取消",
      danger: true,
    });
    if (!ok) return;
    setDeleteBusy(m.url);
    setNotice(null);
    try {
      await api.mediaRemove(m.url);
      setNotice("已从媒体清单移除（远端图片文件本身不受影响）。");
      toast.success("已从清单移除", "远端文件未删除");
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "移除失败";
      setNotice(`移除失败：${msg}`);
      toast.error("移除失败", msg);
    } finally {
      setDeleteBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-5">
      <section className="glass-card adm-static flex flex-col gap-3 rounded-2xl p-4 lg:sticky lg:top-[72px]">
        <span className="eyebrow">REGISTER // 登记外链图片</span>
        <p className="text-[11px] leading-relaxed text-[var(--ia-mist)]">
          把图床 / 对象存储的图片 URL 登记进 <span className="mono">media.json</span>，方便发布时引用。
          大图请勿直接 commit 进 Git 仓库。
        </p>
        <Field label="图片 URL" required>
          <ImageUrlInput value={url} onChange={setUrl} placeholder="https://…" />
        </Field>
        <Field label="备注（可选）">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="如：2026 夏 · 夜空" />
        </Field>
        <Btn kind="primary" onClick={register} loading={busy} disabled={!url.trim()}>
          <AdminIcon name="plus" size={15} /> 登记并提交
        </Btn>
        {r2 ? (
          <label className="clickable flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--ia-line)] text-sm text-[var(--ia-mist)]">
            {uploading ? <Spinner size={15} /> : <AdminIcon name="publish" size={15} />}
            {uploading ? "上传中…" : "或：上传文件到 R2"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
          </label>
        ) : (
          <Notice tone="warning">
            R2 未配置：当前使用 URL 模式（仅登记外链）。要开启直传，需在 Worker 绑定{" "}
            <span className="mono">MEDIA_BUCKET</span>（R2 桶）并设置{" "}
            <span className="mono">R2_PUBLIC_BASE_URL</span>。
          </Notice>
        )}
        {notice && <p className="mono break-all text-[11px] text-[var(--ia-neon)]">{notice}</p>}
      </section>

      <section className="glass-card adm-static rounded-2xl p-4">
        <span className="eyebrow">LIBRARY // 媒体库</span>
        {error && (
          <ErrorState className="mt-3" title="媒体库读取失败" message={error} onRetry={() => void load()} />
        )}
        {items === null && !error && (
          <div className="mt-3 flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}
        {items && items.length === 0 && (
          <EmptyState
            className="mt-3"
            icon="media"
            title="还没有登记任何媒体"
            hint="左侧登记外链图片，或在配置 R2 后直接上传文件。"
          />
        )}
        {items && items.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {items.map((m, i) => (
              <li key={`${m.url}-${i}`} className="rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-2">
                <div className="flex items-center gap-2.5">
                  <ImageThumb url={m.url} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-[var(--ia-ink)]">{m.label || "（未命名）"}</p>
                    <p className="mono truncate text-[10px] text-[var(--ia-mist)]">{m.url}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="复制 URL"
                    title="复制 URL"
                    onClick={() => copy(m.url)}
                    className="clickable adm-ring grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-neon)] transition-colors hover:border-[var(--ia-line-strong)]"
                  >
                    <AdminIcon name="copy" size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="设置为…"
                    title="设置为头像 / 背景 / 封面"
                    onClick={() => setOpenMenuFor((v) => (v === m.url ? null : m.url))}
                    className="clickable adm-ring grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)] transition-colors hover:border-[var(--ia-line-strong)] hover:text-[var(--ia-ink)]"
                    aria-expanded={openMenuFor === m.url}
                  >
                    <AdminIcon name="settings" size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="从清单移除"
                    title="从清单移除"
                    onClick={() => void remove(m)}
                    disabled={deleteBusy === m.url}
                    className="clickable adm-ring grid size-10 shrink-0 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--ia-danger)_40%,transparent)] text-[var(--ia-danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--ia-danger)_12%,transparent)]"
                  >
                    {deleteBusy === m.url ? <Spinner size={14} /> : <AdminIcon name="trash" size={14} />}
                  </button>
                </div>
                {openMenuFor === m.url && (
                  <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[var(--ia-line)] pt-2 sm:grid-cols-4">
                    {(Object.keys(APPLY_LABEL) as ApplyTarget[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        disabled={applyBusy !== null}
                        onClick={() => applyAs(t, m.url)}
                        className="clickable adm-ring flex min-h-[38px] items-center justify-center gap-1 rounded-lg border border-[var(--ia-line)] text-[11px] font-semibold text-[var(--ia-mist)] transition-colors hover:border-[var(--ia-line-strong)] hover:text-[var(--ia-ink)]"
                      >
                        {applyBusy === `${t}:${m.url}` ? <Spinner size={12} /> : <AdminIcon name="check" size={11} />}
                        设为{APPLY_LABEL[t]}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* =========================================================================
 * Settings（通用编辑器 + 三个页面）
 * ========================================================================= */

function useSettings<T extends Record<string, any>>(name: api.SettingsName) {
  const [data, setData] = useState<T | null>(null);
  /** 已提交版本的 JSON 快照，用于 dirty 判定（不误报）。 */
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<api.PublishResult | null>(null);

  const reload = useCallback(() => {
    setLoadError(null);
    api
      .getSettings<T>(name)
      .then((r) => {
        setData(r.data);
        setSnapshot(JSON.stringify(r.data));
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "读取失败"));
  }, [name]);

  useEffect(() => {
    setData(null);
    setSnapshot(null);
    setSaved(null);
    setError(null);
    reload();
  }, [reload]);

  const dirty = data !== null && snapshot !== null && JSON.stringify(data) !== snapshot;

  const save = async (): Promise<boolean> => {
    if (!data) return false;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await api.putSettings(name, data);
      setSaved(r);
      setSnapshot(JSON.stringify(data));
      return true;
    } catch (e) {
      /* §11.2：SETTINGS_INVALID 会带逐字段说明；保留表单不清空 */
      setError(e instanceof Error ? e.message : "保存失败");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { data, setData, error, loadError, busy, saved, dirty, save, reload };
}

function SettingsShell({
  title,
  desc,
  hook,
  children,
}: {
  title: string;
  desc: string;
  hook: ReturnType<typeof useSettings<any>>;
  children: React.ReactNode;
}) {
  const toast = useToast();
  const dialog = useDialog();

  /* v5.4：未保存的设置在离开前拦截（设置不落草稿，真丢失，用 danger） */
  useAdminNavGuard(
    hook.dirty
      ? () =>
          dialog.confirm({
            title: "放弃未保存的设置？",
            message: "这里的更改不会自动保存，离开后将丢失。",
            confirmLabel: "放弃更改",
            cancelLabel: "留在此页",
            danger: true,
          })
      : null,
  );
  useEffect(() => {
    if (!hook.dirty) return undefined;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hook.dirty]);

  /* v5.4：顶栏 SaveStatusPill */
  useReportSaveStatus(
    hook.busy
      ? { tone: "saving", label: "正在提交设置…" }
      : hook.dirty
        ? { tone: "dirty", label: "设置有未保存更改" }
        : hook.saved
          ? { tone: "saved", label: `已提交 ${hook.saved.commitSha.slice(0, 7)}` }
          : null,
  );

  const onSave = async () => {
    const ok = await hook.save();
    if (ok) toast.success("设置已提交", "GitHub Pages 部署完成后生效");
    else toast.error("设置保存失败", "请查看表单上方的错误说明");
  };

  return (
    <div className="flex w-full max-w-[960px] flex-col gap-4 pb-24 lg:pb-4">
      <div>
        <h2 className="text-base font-bold text-[var(--ia-ink)]">{title}</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--ia-mist)]">{desc}</p>
      </div>
      {hook.error && <ErrorBox>{hook.error}</ErrorBox>}
      {hook.saved && !hook.dirty && (
        <Notice tone="success">
          已提交：<span className="mono">{hook.saved.commitSha.slice(0, 7)}</span> · 部署完成后生效。
          <a href={hook.saved.commitUrl} target="_blank" rel="noreferrer" className="clickable ml-1 underline">查看 commit ↗</a>
        </Notice>
      )}
      {hook.loadError ? (
        <ErrorState title="设置读取失败" message={hook.loadError} onRetry={hook.reload} />
      ) : hook.data === null ? (
        <ContentSkeleton lines={6} />
      ) : (
        <>
          {/* §4：设置页桌面端分组两列布局 */}
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">{children}</div>
          <BottomBar>
            <Btn kind="primary" full onClick={() => void onSave()} loading={hook.busy} disabled={!hook.dirty} className="lg:max-w-xs">
              <AdminIcon name="check" size={16} />
              {hook.dirty ? "保存并提交" : "没有未保存的更改"}
            </Btn>
          </BottomBar>
        </>
      )}
    </div>
  );
}

function TextRow({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <Field label={label}>
      {textarea ? (
        <Textarea value={value} rows={2} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

/* ---- §10：GitHub 公共 API 用户信息 ---- */

interface GhUser {
  login?: string;
  avatar_url?: string;
  name?: string | null;
  bio?: string | null;
  html_url?: string;
  public_repos?: number;
  followers?: number;
  following?: number;
  location?: string | null;
  blog?: string | null;
  company?: string | null;
}

function OptRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="clickable flex min-h-[36px] items-center gap-2 text-xs text-[var(--ia-mist)]"
      aria-pressed={checked}
    >
      <span
        className="grid size-4 shrink-0 place-items-center rounded border"
        style={{
          borderColor: checked ? "var(--ia-neon)" : "var(--ia-line)",
          background: checked ? "color-mix(in srgb, var(--ia-neon) 14%, transparent)" : "transparent",
          color: "var(--ia-neon)",
        }}
      >
        {checked && <AdminIcon name="check" size={11} />}
      </span>
      {label}
    </button>
  );
}

export function SettingsProfileScreen() {
  const hook = useSettings<Record<string, any>>("profile");
  const d = hook.data;
  const set = (k: string) => (v: string) => hook.setData({ ...d!, [k]: v });
  const setLink = (k: string) => (v: string) =>
    hook.setData({ ...d!, links: { ...(d!.links ?? {}), [k]: v } });

  /* ---- GitHub 同步（§10）：浏览器直连公共 API，不经 Worker ---- */
  const [ghName, setGhName] = useState("");
  const [ghBusy, setGhBusy] = useState(false);
  const [ghErr, setGhErr] = useState<string | null>(null);
  const [gh, setGh] = useState<GhUser | null>(null);
  const [ghNotice, setGhNotice] = useState<string | null>(null);
  const [onlyFillEmpty, setOnlyFillEmpty] = useState(true);
  const [useAvatar, setUseAvatar] = useState(true);
  const [useGhUrl, setUseGhUrl] = useState(true);
  const [useName, setUseName] = useState(false);
  const [useBio, setUseBio] = useState(false);

  useEffect(() => {
    if (!d || ghName) return;
    const m = String(d.links?.github ?? "").match(/github\.com\/([^/?#]+)/i);
    if (m) setGhName(m[1]);
  }, [d, ghName]);

  const fetchGh = async () => {
    const u = ghName.trim();
    if (!u) {
      setGhErr("请先填写 GitHub 用户名。");
      return;
    }
    setGhBusy(true);
    setGhErr(null);
    setGh(null);
    setGhNotice(null);
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(u)}`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (res.status === 404) throw new Error("用户不存在。");
      if (res.status === 403) throw new Error("GitHub 公共 API 限流，请稍后再试。");
      if (!res.ok) throw new Error(`GitHub API 错误（HTTP ${res.status}）。`);
      setGh((await res.json()) as GhUser);
    } catch (e) {
      setGhErr(e instanceof Error ? e.message : "拉取失败。");
    } finally {
      setGhBusy(false);
    }
  };

  const applyGh = () => {
    if (!gh || !d) return;
    const next: Record<string, any> = { ...d, links: { ...(d.links ?? {}) } };
    const fill = (obj: Record<string, any>, key: string, val: string | undefined | null, allow: boolean) => {
      if (!allow || !val) return;
      const cur = String(obj[key] ?? "").trim();
      if (onlyFillEmpty && cur) return;
      obj[key] = val;
    };
    fill(next, "avatar", gh.avatar_url, useAvatar);
    fill(next.links, "github", gh.html_url, useGhUrl);
    fill(next, "author", gh.name ?? undefined, useName);
    fill(next, "bio", gh.bio ?? undefined, useBio);
    next.githubStats = {
      login: gh.login ?? ghName.trim(),
      publicRepos: gh.public_repos ?? 0,
      followers: gh.followers ?? 0,
      following: gh.following ?? 0,
      ...(gh.location ? { location: gh.location } : {}),
      ...(gh.blog ? { blog: gh.blog } : {}),
      ...(gh.company ? { company: gh.company } : {}),
      syncedAt: new Date().toISOString(),
    };
    hook.setData(next);
    setGhNotice("已应用到表单（尚未保存）。检查无误后点击「保存并提交」；站内自定义中文简介默认不会被覆盖。");
  };

  return (
    <SettingsShell
      title="观测者档案"
      desc="修改后 commit 到 src/config/profile.json，部署后前台 ProfileCard / 关于页 / 社交入口全站生效。"
      hook={hook}
    >
      {d && (
        <>
          <Section title="BASIC // 基本信息">
            <TextRow label="名字（显示名）" value={d.author ?? ""} onChange={set("author")} />
            <TextRow label="Handle（昵称）" value={d.handle ?? ""} onChange={set("handle")} />
            <TextRow label="签名（首页短标语）" value={d.signature ?? ""} onChange={set("signature")} textarea />
            <TextRow label="状态" value={d.status ?? ""} onChange={set("status")} />
            <TextRow label="心情" value={d.mood ?? ""} onChange={set("mood")} />
            <TextRow label="坐标 / 位置" value={d.coordinate ?? ""} onChange={set("coordinate")} />
            <Field label="头像 URL" help="留空时前台回退到默认 user 图标。">
              <ImageUrlInput value={d.avatar ?? ""} onChange={set("avatar")} />
            </Field>
            <Field label="封面 URL">
              <ImageUrlInput value={d.cover ?? ""} onChange={set("cover")} />
            </Field>
            <TextRow label="简介 bio" value={d.bio ?? ""} onChange={set("bio")} textarea />
            <TextRow label="About 标题" value={d.aboutTitle ?? ""} onChange={set("aboutTitle")} />
            <TextRow label="About 副标题" value={d.aboutSubtitle ?? ""} onChange={set("aboutSubtitle")} />
            <TextRow label="About 正文" value={d.aboutBody ?? ""} onChange={set("aboutBody")} textarea />
            <Field label="研究方向"><TagInput value={d.researchAreas ?? []} onChange={(v) => hook.setData({ ...d, researchAreas: v })} /></Field>
            <Field label="技术栈"><TagInput value={d.techStack ?? []} onChange={(v) => hook.setData({ ...d, techStack: v })} /></Field>
            <Field label="兴趣"><TagInput value={d.interests ?? []} onChange={(v) => hook.setData({ ...d, interests: v })} /></Field>
            <TextRow label="GitHub 用户名" value={d.githubUsername ?? ""} onChange={set("githubUsername")} />
            <Toggle checked={d.showGithubContributions !== false} onChange={(v) => hook.setData({ ...d, showGithubContributions: v })} label="显示 GitHub Contributions" />
          </Section>

          <Section title="LINKS // 联络通道" defaultOpen={false}>
            {["github", "email", "qq", "qqQr", "wechat", "wechatQr", "bilibili", "bangumi", "anilist"].map((k) => (
              <TextRow key={k} label={k} value={d.links?.[k] ?? ""} onChange={setLink(k)} />
            ))}
          </Section>

          <Section title="GITHUB SYNC // 从 GitHub 同步">
            <p className="text-[11px] leading-relaxed text-[var(--ia-mist)]">
              调用 GitHub 公共 API 拉取 avatar / name / bio / 统计信息。默认「只填充空字段」，
              不会强制覆盖站内自定义内容。
            </p>
            <div className="flex gap-2">
              <Input
                value={ghName}
                onChange={(e) => setGhName(e.target.value)}
                placeholder="GitHub 用户名"
                className="flex-1"
              />
              <Btn kind="primary" onClick={fetchGh} loading={ghBusy} className="shrink-0">
                <AdminIcon name="github" size={15} /> 拉取
              </Btn>
            </div>
            {ghErr && <ErrorBox>{ghErr}</ErrorBox>}
            {gh && (
              <div className="rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-3">
                <div className="flex items-center gap-3">
                  <ImageThumb url={gh.avatar_url ?? ""} size={48} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ia-ink)]">
                      {gh.name || gh.login}
                      <span className="mono ml-2 text-[10px] text-[var(--ia-mist)]">@{gh.login}</span>
                    </p>
                    <p className="mono mt-0.5 text-[10px] text-[var(--ia-mist)]">
                      repos {gh.public_repos ?? 0} · followers {gh.followers ?? 0} · following {gh.following ?? 0}
                    </p>
                  </div>
                </div>
                {gh.bio && <p className="mt-2 text-[11px] leading-relaxed text-[var(--ia-mist)]">{gh.bio}</p>}
                <p className="mono mt-1 text-[10px] text-[var(--ia-mist)] opacity-80">
                  {[gh.location, gh.company, gh.blog].filter(Boolean).join(" · ") || ""}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-0.5 border-t border-[var(--ia-line)] pt-2 sm:grid-cols-2">
                  <OptRow label="只填充空字段" checked={onlyFillEmpty} onChange={setOnlyFillEmpty} />
                  <OptRow label="应用头像 avatar_url" checked={useAvatar} onChange={setUseAvatar} />
                  <OptRow label="应用 GitHub 链接 html_url" checked={useGhUrl} onChange={setUseGhUrl} />
                  <OptRow label="覆盖 name（默认关）" checked={useName} onChange={setUseName} />
                  <OptRow label="覆盖 bio（默认关）" checked={useBio} onChange={setUseBio} />
                </div>
                <Btn kind="primary" full onClick={applyGh} className="mt-2 !min-h-[40px] !text-xs">
                  <AdminIcon name="check" size={13} /> 应用到表单
                </Btn>
              </div>
            )}
            {ghNotice && <Notice tone="neon">{ghNotice}</Notice>}
            {d.githubStats?.syncedAt && (
              <p className="mono text-[10px] text-[var(--ia-mist)] opacity-80">
                // 上次同步：{String(d.githubStats.syncedAt).slice(0, 19).replace("T", " ")} · repos{" "}
                {d.githubStats.publicRepos ?? 0} · followers {d.githubStats.followers ?? 0}
              </p>
            )}
          </Section>
        </>
      )}
    </SettingsShell>
  );
}

export function SettingsSiteScreen() {
  const hook = useSettings<Record<string, any>>("site");
  const d = hook.data;
  const set = (k: string) => (v: unknown) => hook.setData({ ...d!, [k]: v });
  return (
    <SettingsShell
      title="站点设置"
      desc="修改后 commit 到 src/config/site-settings.json，部署后生效。"
      hook={hook}
    >
      {d && (
        <>
          <Section title="SITE // 站点信息">
            <TextRow label="标题" value={d.title ?? ""} onChange={set("title")} />
            <TextRow label="副标题" value={d.subtitle ?? ""} onChange={set("subtitle")} />
            <TextRow label="描述" value={d.description ?? ""} onChange={set("description")} textarea />
            <TextRow label="Hero 标语" value={d.heroTagline ?? ""} onChange={set("heroTagline")} />
            <TextRow label="建站日期（YYYY-MM-DD）" value={d.foundedAt ?? ""} onChange={set("foundedAt")} />
            <TextRow label="Archive 起始日期（YYYY-MM-DD）" value={d.archiveStartedAt ?? d.foundedAt ?? ""} onChange={set("archiveStartedAt")} />
            <TextRow label="同步状态文案" value={d.archiveSyncLabel ?? ""} onChange={set("archiveSyncLabel")} />
            <TextRow label="版权名称" value={d.copyrightName ?? ""} onChange={set("copyrightName")} />
          </Section>
          <Section title="VISUAL // 背景与封面">
            <Field label="白昼背景 URL">
              <ImageUrlInput value={d.backgroundDay ?? ""} onChange={set("backgroundDay")} />
            </Field>
            <Field label="黑夜背景 URL">
              <ImageUrlInput value={d.backgroundNight ?? ""} onChange={set("backgroundNight")} />
            </Field>
            <Field label="默认封面 URL">
              <ImageUrlInput value={d.defaultCover ?? ""} onChange={set("defaultCover")} />
            </Field>
            <Field label="Footer 徽章" help="回车添加">
              <TagInput value={d.footerBadges ?? []} onChange={set("footerBadges")} />
            </Field>
          </Section>
        </>
      )}
    </SettingsShell>
  );
}

function NumRow({
  label,
  value,
  onChange,
  step = 0.1,
  help,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  help?: string;
}) {
  return (
    <Field label={label} help={help}>
      <Input
        type="number"
        value={Number.isFinite(value) ? String(value) : ""}
        step={step}
        inputMode="decimal"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function SettingsWorldlineScreen() {
  const hook = useSettings<Record<string, any>>("worldline");
  const d = hook.data;
  const set = (k: string) => (v: unknown) => hook.setData({ ...d!, [k]: v });
  const setIn = (group: string, k: string) => (v: number) =>
    hook.setData({ ...d!, [group]: { ...(d![group] ?? {}), [k]: v } });
  return (
    <SettingsShell
      title="世界线引擎"
      desc="调整变动率引擎参数（src/config/worldline.json）。内容影响随时间衰减：impact = weight × impactMultiplier × exp(−daysAgo ÷ halfLifeDays)；超过窗口 / stableAfterDays 的记录归零，长期无更新时世界线精确回到基准值（完美世界线）。"
      hook={hook}
    >
      {d && (
        <>
          <Section title="CORE // 核心参数">
            <NumRow
              label="完美世界线基准 baseValue"
              value={d.baseValue}
              onChange={set("baseValue")}
              step={0.000001}
              help="无近期内容时显示的稳定值（默认 1.048596）。"
            />
            <NumRow label="数值缩放 valueScale" value={d.valueScale} onChange={set("valueScale")} step={0.000001} />
          </Section>

          <Section title="TIME DECAY // 时间衰减与回归（v5.0.2）">
            <NumRow
              label="影响统计窗口 impactWindowDays（天）"
              value={d.windowDays}
              onChange={set("windowDays")}
              step={1}
              help="只有该窗口内的记录会扰动世界线。"
            />
            <NumRow
              label="衰减半衰期 halfLifeDays（天）"
              value={d.halfLifeDays}
              onChange={set("halfLifeDays")}
              step={1}
              help="影响力按 exp(−daysAgo ÷ halfLifeDays) 指数衰减。"
            />
            <NumRow
              label="回归完美世界线 stableAfterDays（天）"
              value={Number.isFinite(d.stableAfterDays) ? d.stableAfterDays : d.windowDays}
              onChange={set("stableAfterDays")}
              step={1}
              help="超过该天数的记录一律不再影响世界线；此后 score 归零，数值回到 baseValue。"
            />
            <Toggle
              checked={Boolean(d.jitterEnabled ?? d.dynamicDisplay)}
              onChange={(v) => hook.setData({ ...d!, jitterEnabled: v, dynamicDisplay: v })}
              label="显示层轻微跳动 jitterEnabled"
            />
            <NumRow
              label="stable 跳动起始小数位 jitterDigits（1–6）"
              value={Number.isFinite(d.jitterDigits) ? d.jitterDigits : 5}
              onChange={set("jitterDigits")}
              step={1}
              help="稳定态只在该位之后做显示跳动；真实值与显示动画分离，跳动不会写回数据。"
            />
          </Section>

          <Section title="WEIGHTS // 类型权重" defaultOpen={false}>
            {Object.entries(d.weights ?? {}).map(([k, v]) => (
              <NumRow key={k} label={k} value={v as number} onChange={setIn("weights", k)} step={0.5} />
            ))}
          </Section>
          <Section title="MULTIPLIERS // 影响倍率" defaultOpen={false}>
            {Object.entries(d.impactMultipliers ?? {}).map(([k, v]) => (
              <NumRow key={k} label={`impact.${k}`} value={v as number} onChange={setIn("impactMultipliers", k)} />
            ))}
            <NumRow label="featured 倍率" value={d.featuredMultiplier} onChange={set("featuredMultiplier")} />
            {Object.entries(d.typeBonus ?? {}).map(([k, v]) => (
              <NumRow key={k} label={`bonus.${k}`} value={v as number} onChange={setIn("typeBonus", k)} />
            ))}
          </Section>
          <Section title="THRESHOLDS // 状态分级阈值" defaultOpen={false}>
            {Object.entries(d.thresholds ?? {}).map(([k, v]) => (
              <NumRow key={k} label={k} value={v as number} onChange={setIn("thresholds", k)} step={1} />
            ))}
            <p className="mono text-[10px] leading-relaxed text-[var(--ia-mist)]">
              // score &lt; observing → stable；&lt; unstable → observing；&lt; divergence → unstable；≥ divergence → shift
            </p>
          </Section>
        </>
      )}
    </SettingsShell>
  );
}

export function ProjectsManagerScreen({ siteBase }: { siteBase: string }) {
  void siteBase;
  const [data, setData] = useState<api.ProjectsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const navigate = useAdminNavigate();

  const load = useCallback(
    () =>
      api
        .projectsOverview()
        .then((r) => {
          setData(r);
          setError(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "读取项目失败")),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const setVisibility = async (slug: string, visibility: string) => {
    setBusy(slug);
    try {
      await api.setProjectVisibility(slug, visibility);
      await load();
      toast.success("可见性已更新", `${slug} → ${visibility}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存失败";
      setError(msg);
      toast.error("可见性更新失败", msg);
    } finally {
      setBusy(null);
    }
  };

  const draftFromRepo = (repo: api.ProjectsOverview["repos"][number]) => {
    sessionStorage.setItem(
      "wl-project-repo-draft",
      JSON.stringify({ title: repo.repo, description: repo.description ?? "", github: { owner: repo.owner, repo: repo.repo }, repo: repo.url }),
    );
    void navigate({ screen: "publish-form", type: "project" }, { search: "?repoDraft=1" });
  };

  const VISIBILITY_OPTIONS = [
    { value: "public", label: "public" },
    { value: "unlisted", label: "unlisted" },
    { value: "hidden", label: "hidden" },
    { value: "private", label: "private" },
  ];

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6 pb-20">
      <div>
        <h2 className="text-base font-bold text-[var(--ia-ink)]">Projects Manager</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--ia-mist)]">
          GitHub 技术事实只读快照；创建草稿只预填 owner / repo。
        </p>
      </div>

      {error && !data && <ErrorState title="项目读取失败" message={error} onRetry={() => void load()} />}
      {error && data && <ErrorBox>{error}</ErrorBox>}

      <section className="flex flex-col gap-3">
        <h3 className="eyebrow">GITHUB REPOSITORIES</h3>
        {data ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.repos.map((repo) => (
              <div className="rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-4" key={`${repo.owner}/${repo.repo}`}>
                <b className="text-sm text-[var(--ia-ink)]">{repo.owner}/{repo.repo}</b>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--ia-mist)]">{repo.description || "无描述"}</p>
                <Btn kind="secondary" size="sm" className="mt-3" onClick={() => draftFromRepo(repo)}>
                  <AdminIcon name="plus" size={13} /> 创建 Project Draft
                </Btn>
              </div>
            ))}
          </div>
        ) : (
          !error && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          )
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="eyebrow">SITE PROJECTS</h3>
        {data ? (
          data.projects.length === 0 ? (
            <EmptyState icon="project" title="还没有站内项目" hint="从上方仓库快照创建草稿，或在「发布」里手动新建。" />
          ) : (
            <div className="flex flex-col gap-2">
              {data.projects.map((project) => (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-3" key={project.slug}>
                  <div className="min-w-40 flex-1">
                    <b className="text-sm text-[var(--ia-ink)]">{project.title}</b>
                    <span className="mono ml-2 text-[11px] text-[var(--ia-mist)]">
                      {project.github ? `${project.github.owner}/${project.github.repo}` : "无关联 repo"}
                    </span>
                  </div>
                  <Listbox
                    ariaLabel={`${project.title} 可见性`}
                    size="sm"
                    className="w-40"
                    value={project.visibility}
                    disabled={busy === project.slug}
                    onChange={(v) => void setVisibility(project.slug, v)}
                    options={VISIBILITY_OPTIONS}
                  />
                  {project.concept && <span className="mono text-[10px] text-[var(--ia-warning)]">CONCEPT</span>}
                </div>
              ))}
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}

export function SettingsBangumiScreen() {
  const hook = useSettings<Record<string, any>>("bangumi");
  const d = hook.data;
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<api.BangumiSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const toast = useToast();
  const toggle = (scope: string) =>
    hook.setData({
      ...d!,
      syncScopes: (d!.syncScopes ?? []).includes(scope)
        ? d!.syncScopes.filter((item: string) => item !== scope)
        : [...(d!.syncScopes ?? []), scope],
    });
  const sync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const r = await api.bangumiSync();
      setResult(r);
      toast.success("Bangumi 同步完成", `扫描 ${r.scanned} · 新增 ${r.created} · 更新 ${r.updated}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "同步失败";
      setSyncError(msg);
      toast.error("Bangumi 同步失败", msg);
    } finally {
      setSyncing(false);
    }
  };
  return (
    <SettingsShell
      title="Bangumi 同步"
      desc="Token 不会也不能在前端输入；如需私有收藏，请使用 Worker Secret BANGUMI_TOKEN。"
      hook={hook}
    >
      {d && (
        <section className="flex flex-col gap-4 rounded-xl border border-[var(--ia-line)] p-4">
          <TextRow label="Bangumi 用户名" value={d.username ?? ""} onChange={(username) => hook.setData({ ...d, username })} />
          <div>
            <span className="text-xs font-semibold text-[var(--ia-mist)]">同步范围</span>
            <div className="mt-2 flex flex-wrap gap-3">
              {["watching", "planned", "completed", "paused", "dropped"].map((scope) => (
                <OptRow key={scope} label={scope} checked={(d.syncScopes ?? []).includes(scope)} onChange={() => toggle(scope)} />
              ))}
            </div>
          </div>
          <Field label="同步频率">
            <Listbox
              ariaLabel="同步频率"
              value={String(d.schedule ?? "manual")}
              onChange={(v) => hook.setData({ ...d, schedule: v })}
              options={[
                { value: "manual", label: "仅手动" },
                { value: "6h", label: "每 6 小时" },
                { value: "daily", label: "每天一次" },
              ]}
            />
          </Field>
          <Field label="远端缺失策略">
            <Listbox
              ariaLabel="远端缺失策略"
              value={String(d.syncMissingPolicy ?? "keep")}
              onChange={(v) => hook.setData({ ...d, syncMissingPolicy: v })}
              options={[
                { value: "keep", label: "保留站内记录" },
                { value: "hide", label: "自动隐藏（不永久删除）" },
              ]}
            />
          </Field>
          <Notice tone="neon">同步会补齐 Bangumi 简介和元数据，但不会覆盖站内评分、短评、长评、角色、关联和手动隐藏状态。</Notice>
          <Btn kind="primary" onClick={() => void sync()} loading={syncing}>
            立即同步
          </Btn>
          {syncError && <ErrorBox>{syncError}</ErrorBox>}
          {result && (
            <Notice tone="success">
              {result.message}（扫描 {result.scanned}，新增 {result.created}，更新 {result.updated}）
            </Notice>
          )}
        </section>
      )}
    </SettingsShell>
  );
}
/* =========================================================================
 * Settings 合并单屏（v5.4 §Settings：site / profile / worldline / bangumi
 * 局部切换，URL 深链接由 router 的 settings section 承担）
 * ========================================================================= */

const SETTINGS_NAV: { section: SettingsSection; label: string; icon: string; desc: string }[] = [
  { section: "site", label: "站点", icon: "home", desc: "标题 / 背景 / 页脚等站点级配置" },
  { section: "profile", label: "档案", icon: "moment", desc: "名字 / 头像 / 链接与自我介绍" },
  { section: "worldline", label: "世界线", icon: "worldline", desc: "变动率引擎参数与展示行为" },
  { section: "bangumi", label: "Bangumi", icon: "anime", desc: "收藏同步范围与频率" },
];

export function SettingsScreen({ section }: { section: SettingsSection }) {
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* 二级导航：移动端横向滚动 pills，lg 起左侧竖列 sticky */}
      <nav
        aria-label="设置分区"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6 lg:sticky lg:top-[72px] lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {SETTINGS_NAV.map((item) => {
          const active = item.section === section;
          return (
            <NavLink
              key={item.section}
              to={{ screen: "settings", section: item.section }}
              aria-current={active ? "page" : undefined}
              className={`clickable adm-ring flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors lg:w-full ${
                active
                  ? "border-[color-mix(in_srgb,var(--ia-neon)_55%,transparent)] bg-[color-mix(in_srgb,var(--ia-neon)_12%,transparent)] text-[var(--ia-neon)]"
                  : "border-[var(--ia-line)] text-[var(--ia-mist)] hover:border-[var(--ia-line-strong)] hover:text-[var(--ia-ink)]"
              }`}
            >
              <AdminIcon name={item.icon} size={14} />
              <span className="flex min-w-0 flex-col text-left">
                <span>{item.label}</span>
                <span className="hidden text-[10px] font-normal leading-snug text-[var(--ia-mist)] lg:block">{item.desc}</span>
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* 面板：section 变化时局部过渡，不整页刷新 */}
      <div key={section} className="adm-panel-enter min-w-0">
        {section === "site" && <SettingsSiteScreen />}
        {section === "profile" && <SettingsProfileScreen />}
        {section === "worldline" && <SettingsWorldlineScreen />}
        {section === "bangumi" && <SettingsBangumiScreen />}
      </div>
    </div>
  );
}
