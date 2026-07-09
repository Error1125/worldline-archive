/**
 * Admin Console 屏幕组件（v5.0）。
 *
 * LoginScreen / DashboardScreen / PublishIndexScreen / PublishFormScreen /
 * MediaScreen / SettingsProfileScreen / SettingsSiteScreen / SettingsWorldlineScreen
 *
 * 全部真实调用 Worker 后端（src/lib/admin/api.ts），无 mock。
 */

import React, { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/admin/api";
import { AdminApiError } from "@/lib/admin/api";
import { saveApiBase, setAdminHint, resolveApiBase, LS_API_BASE } from "@/config/admin";
import { RECORD_TYPES, getRecordType, type FieldDef } from "./adminFields";
import {
  AdminIcon,
  Btn,
  BottomBar,
  ErrorBox,
  Field,
  ImageListInput,
  InfoRow,
  Input,
  Section,
  Select,
  Spinner,
  StatusPill,
  TagInput,
  Textarea,
  Toggle,
} from "./ui";

/* =========================================================================
 * Login
 * ========================================================================= */

export function LoginScreen({ siteBase }: { siteBase: string }) {
  const [secret, setSecret] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setApiBase(resolveApiBase());
  }, []);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!secret) {
      setError("请输入访问口令。");
      return;
    }
    setBusy(true);
    try {
      saveApiBase(apiBase.trim());
      await api.login(secret);
      setAdminHint(true);
      location.href = `${siteBase}/admin/dashboard`;
    } catch (err) {
      const msg =
        err instanceof AdminApiError
          ? err.code === "UNAUTHORIZED"
            ? "口令错误。"
            : err.message
          : "登录失败，请稍后再试。";
      setError(msg);
      setBusy(false);
    }
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
        <Field
          label="后端 API 地址"
          help="Cloudflare Worker 地址（https://xxx.workers.dev）。构建时若已注入 PUBLIC_ADMIN_API_BASE 可留空；此处填写会保存在本机浏览器。"
        >
          <Input
            type="url"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="https://worldline-admin.xxx.workers.dev"
            autoComplete="off"
          />
        </Field>
        <ErrorBox>{error}</ErrorBox>
        <Btn kind="primary" type="submit" full disabled={busy}>
          {busy ? <Spinner /> : <AdminIcon name="arrow" size={16} />}
          {busy ? "验证中…" : "登录"}
        </Btn>
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
 * Dashboard
 * ========================================================================= */

interface SummaryData {
  generatedAt: string;
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

  const loadStatus = () =>
    api
      .getStatus()
      .then(setStatus)
      .catch((e) => setStatusErr(e instanceof Error ? e.message : "状态获取失败"));

  useEffect(() => {
    fetch(summaryUrl, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setSummary)
      .catch(() => setSummaryErr("站点摘要读取失败（summary.json）。首次部署前这是正常的。"));
    loadStatus();
  }, [summaryUrl]);

  const doSync = async () => {
    setSyncBusy(true);
    setSyncMsg(null);
    try {
      const r = await api.githubSync();
      setSyncMsg(`GitHub 数据已同步并提交：${r.commitSha.slice(0, 7)}`);
      loadStatus();
    } catch (e) {
      setSyncMsg(e instanceof Error ? `同步失败：${e.message}` : "同步失败");
    } finally {
      setSyncBusy(false);
    }
  };

  const wl = summary?.worldline;

  return (
    <div className="flex flex-col gap-4">
      {/* worldline 状态 */}
      <section className="glass-card corner-ticks relative rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">WORLDLINE // 变动率</span>
          {wl && (
            <StatusPill tone={STATUS_TONE[wl.status] ?? "neon"}>
              {wl.statusLabel} · {wl.statusZh}
            </StatusPill>
          )}
        </div>
        {wl ? (
          <>
            <div className="mono mt-3 text-3xl font-bold tracking-wider text-[var(--ia-ink)]">
              {wl.value}
              <span className="ml-2 align-middle text-xs text-[var(--ia-mist)]">
                score {wl.score.toFixed(2)}
              </span>
            </div>
            <p className="mono mt-1 text-[11px] text-[var(--ia-mist)]">
              base {wl.baseValue} · 最近 {wl.windowDays} 天记录驱动
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
          <div className="mt-3 text-[var(--ia-mist)]"><Spinner /></div>
        )}
      </section>

      {/* 快速发布 */}
      <section className="glass-card rounded-2xl p-4">
        <span className="eyebrow">QUICK PUBLISH // 快速发布</span>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {RECORD_TYPES.map((t) => (
            <a
              key={t.type}
              href={`${siteBase}/admin/publish/${t.type}`}
              className="clickable flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] text-center"
              style={{ color: t.accent }}
            >
              <AdminIcon name={t.icon} size={19} />
              <span className="text-[10px] font-semibold text-[var(--ia-mist)]">{t.label}</span>
            </a>
          ))}
          <a
            href={`${siteBase}/admin/publish`}
            className="clickable flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--ia-line)] text-[var(--ia-mist)]"
          >
            <AdminIcon name="plus" size={19} />
            <span className="text-[10px] font-semibold">全部</span>
          </a>
        </div>
      </section>

      {/* 内容统计 */}
      <section className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">RECORDS // 存档统计</span>
          {summary && (
            <span className="mono text-[11px] text-[var(--ia-mist)]">
              共 {summary.totals.records} 条 · 草稿 {summary.totals.drafts}
            </span>
          )}
        </div>
        {summary ? (
          <div className="mt-3 grid grid-cols-2 gap-x-4">
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
          !summaryErr && <div className="mt-3 text-[var(--ia-mist)]"><Spinner /></div>
        )}
      </section>

      {/* 仓库 / 部署状态 */}
      <section className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">DEPLOY // 仓库与部署</span>
          <button
            type="button"
            onClick={loadStatus}
            aria-label="刷新状态"
            className="clickable grid size-8 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)]"
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
                <a href={status.latestCommit.url} target="_blank" rel="noreferrer" className="clickable">
                  <span className="mono text-[var(--ia-nebula)]">{status.latestCommit.sha.slice(0, 7)}</span>{" "}
                  {status.latestCommit.message.split("\n")[0].slice(0, 26)}
                </a>
              </InfoRow>
            )}
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
                </a>
              </InfoRow>
            )}
            <InfoRow k="media">{status.media?.count ?? 0} 项 · R2 {status.r2Enabled ? "已启用" : "未配置"}</InfoRow>
            <div className="mt-3 flex gap-2">
              <Btn onClick={doSync} disabled={syncBusy}>
                {syncBusy ? <Spinner size={14} /> : <AdminIcon name="refresh" size={14} />}
                同步 GitHub 数据
              </Btn>
            </div>
            {syncMsg && <p className="mono mt-2 text-[11px] text-[var(--ia-mist)]">{syncMsg}</p>}
          </div>
        ) : statusErr ? (
          <ErrorBox>{statusErr}</ErrorBox>
        ) : (
          <div className="mt-3 text-[var(--ia-mist)]"><Spinner /></div>
        )}
      </section>

      {/* 最近记录 */}
      {summary && summary.recent.length > 0 && (
        <section className="glass-card rounded-2xl p-4">
          <span className="eyebrow">RECENT // 最近记录</span>
          <ul className="mt-2 flex flex-col">
            {summary.recent.map((r, i) => (
              <li key={i} className="border-b border-[var(--ia-line)] py-2.5 last:border-b-0">
                <a href={`${siteBase}${r.href}`} className="clickable flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-[var(--ia-ink)]">
                    <span className="mono mr-1.5 text-[10px] uppercase text-[var(--ia-neon)]">{r.typeLabel}</span>
                    {r.title}
                  </span>
                  <span className="mono shrink-0 text-[10px] text-[var(--ia-mist)]">{r.date}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* =========================================================================
 * Publish index
 * ========================================================================= */

export function PublishIndexScreen({ siteBase }: { siteBase: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="mono text-[11px] text-[var(--ia-mist)]">
        选择一种记录类型。发布后会直接 commit 到仓库并触发部署。
      </p>
      {RECORD_TYPES.map((t) => (
        <a
          key={t.type}
          href={`${siteBase}/admin/publish/${t.type}`}
          className="glass-card clickable flex items-center gap-3.5 rounded-2xl p-4"
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
        </a>
      ))}
    </div>
  );
}

/* =========================================================================
 * Publish form
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
        <Select
          value={String(value ?? "")}
          options={def.options ?? []}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "tags":
      return (
        <TagInput value={(value as string[]) ?? []} onChange={onChange} placeholder={def.placeholder} />
      );
    case "images":
      return <ImageListInput value={(value as string[]) ?? []} onChange={onChange} />;
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
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<api.PublishResult | null>(null);

  const missing = useMemo(() => {
    if (!def) return [];
    return def.fields
      .filter((f) => f.required)
      .filter((f) => {
        const v = state[f.name];
        if (Array.isArray(v)) return v.length === 0;
        return v === "" || v === undefined || v === null;
      })
      .map((f) => f.label);
  }, [def, state]);

  if (!def) {
    return <ErrorBox>未知的记录类型：{type}</ErrorBox>;
  }

  const set = (name: string) => (v: unknown) => setState((s) => ({ ...s, [name]: v }));

  const submit = async () => {
    setError(null);
    if (missing.length) {
      setError(`还有必填项未填：${missing.join("、")}`);
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(state)) {
        if (v === "" || v === undefined || v === null) continue;
        if (Array.isArray(v) && v.length === 0) continue;
        payload[k] = v;
      }
      if (def.hasBody && body.trim()) payload.body = body;
      const r = await api.publish(def.type, payload);
      setResult(r);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (e instanceof AdminApiError && e.code === "UNAUTHORIZED") {
        location.href = `${siteBase}/admin/login`;
        return;
      }
      setError(e instanceof Error ? e.message : "发布失败。");
    } finally {
      setBusy(false);
    }
  };

  /* 发布成功结果面板 */
  if (result) {
    const viewHref = result.htmlPath ? `${siteBase}${result.htmlPath}` : null;
    return (
      <div className="flex flex-col gap-4">
        <section className="glass-card corner-ticks relative rounded-2xl p-5 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full border border-[color-mix(in_srgb,var(--ia-success)_50%,transparent)] bg-[color-mix(in_srgb,var(--ia-success)_12%,transparent)] text-[var(--ia-success)]">
            <AdminIcon name="check" size={26} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-[var(--ia-ink)]">已提交至世界线</h2>
          <p className="mono mt-1 text-[11px] text-[var(--ia-mist)]">{result.message}</p>
        </section>
        <section className="glass-card rounded-2xl p-4">
          <InfoRow k="file">
            <span className="mono text-[11px]">{result.path}</span>
          </InfoRow>
          <InfoRow k="commit">
            <a href={result.commitUrl} target="_blank" rel="noreferrer" className="clickable mono text-[var(--ia-nebula)]">
              {result.commitSha.slice(0, 7)} ↗
            </a>
          </InfoRow>
          <InfoRow k="deploy">
            <span className="text-xs text-[var(--ia-mist)]">GitHub Actions 构建中，约 1–3 分钟后前台可见</span>
          </InfoRow>
        </section>
        <div className="flex flex-col gap-2.5">
          {viewHref && (
            <Btn kind="primary" full onClick={() => (location.href = viewHref)}>
              <AdminIcon name="external" size={15} /> 查看前台页面（部署完成后）
            </Btn>
          )}
          <Btn
            full
            onClick={() => {
              setResult(null);
              setState(buildInitialState(def.fields));
              setBody("");
            }}
          >
            <AdminIcon name="plus" size={15} /> 再发一条{def.label}
          </Btn>
          <Btn full onClick={() => (location.href = `${siteBase}/admin/dashboard`)}>
            返回总览
          </Btn>
        </div>
      </div>
    );
  }

  /* 表单主体：主字段 + 折叠的通用尾部字段 */
  const TAIL = new Set(["tags", "worldlineImpact", "featured", "draft", "related", "slug", "cover", "coverDay", "coverNight"]);
  const mainFields = def.fields.filter((f) => !TAIL.has(f.name));
  const tailFields = def.fields.filter((f) => TAIL.has(f.name));

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center gap-3">
        <span className="icon-badge grid size-11 shrink-0 place-items-center rounded-xl" style={{ color: def.accent }}>
          <AdminIcon name={def.icon} size={20} />
        </span>
        <div>
          <h2 className="text-base font-bold text-[var(--ia-ink)]">发布{def.label}</h2>
          <p className="mono text-[10px] uppercase text-[var(--ia-mist)]">{def.labelEn} · {def.desc}</p>
        </div>
      </div>

      <div className="glass-card flex flex-col gap-4 rounded-2xl p-4">
        {mainFields.map((f) =>
          f.kind === "toggle" ? (
            <FieldControl key={f.name} def={f} value={state[f.name]} onChange={set(f.name)} />
          ) : (
            <Field key={f.name} label={f.label} required={f.required} help={f.help}>
              <FieldControl def={f} value={state[f.name]} onChange={set(f.name)} />
            </Field>
          ),
        )}
        {def.hasBody && (
          <Field label={def.bodyLabel ?? "正文（Markdown）"}>
            <Textarea
              value={body}
              rows={10}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"支持 Markdown。\n\n## 小标题\n正文……"}
              className="mono !text-[13px]"
            />
          </Field>
        )}
      </div>

      <Section title="META // 标签 · 世界线 · 发布选项" defaultOpen={false}>
        {tailFields.map((f) =>
          f.kind === "toggle" ? (
            <FieldControl key={f.name} def={f} value={state[f.name]} onChange={set(f.name)} />
          ) : (
            <Field key={f.name} label={f.label} required={f.required} help={f.help}>
              <FieldControl def={f} value={state[f.name]} onChange={set(f.name)} />
            </Field>
          ),
        )}
      </Section>

      <ErrorBox>{error}</ErrorBox>

      <BottomBar>
        <Btn kind="primary" full onClick={submit} disabled={busy}>
          {busy ? <Spinner /> : <AdminIcon name="publish" size={16} />}
          {busy ? "正在提交至仓库…" : `发布${def.label}${state.draft ? "（草稿）" : ""}`}
        </Btn>
      </BottomBar>
    </div>
  );
}

/* =========================================================================
 * Media
 * ========================================================================= */

export function MediaScreen() {
  const [items, setItems] = useState<api.MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [r2, setR2] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () =>
    api
      .mediaList()
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "读取失败"));

  useEffect(() => {
    load();
    api.getStatus().then((s) => setR2(Boolean(s.r2Enabled))).catch(() => {});
  }, []);

  const register = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      await api.mediaRegister(url.trim(), label.trim() || undefined);
      setUrl("");
      setLabel("");
      setNotice("已登记并提交（media.json）。");
      load();
    } catch (e) {
      setNotice(e instanceof Error ? `登记失败：${e.message}` : "登记失败");
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
      load();
    } catch (e) {
      setNotice(e instanceof Error ? `上传失败：${e.message}` : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v).then(
      () => setNotice("已复制 URL。"),
      () => setNotice("复制失败，请手动复制。"),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-card flex flex-col gap-3 rounded-2xl p-4">
        <span className="eyebrow">REGISTER // 登记外链图片</span>
        <p className="text-[11px] leading-relaxed text-[var(--ia-mist)]">
          把图床 / 对象存储的图片 URL 登记进 <span className="mono">media.json</span>，方便发布时引用。
        </p>
        <Field label="图片 URL" required>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" type="url" />
        </Field>
        <Field label="备注（可选）">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="如：2026 夏 · 夜空" />
        </Field>
        <Btn kind="primary" onClick={register} disabled={busy || !url.trim()}>
          {busy ? <Spinner size={14} /> : <AdminIcon name="plus" size={15} />} 登记并提交
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
          <p className="mono text-[10px] text-[var(--ia-mist)]">
            // R2 未配置：仅支持 URL 登记。绑定 MEDIA_BUCKET 后可直接上传。
          </p>
        )}
        {notice && <p className="mono break-all text-[11px] text-[var(--ia-neon)]">{notice}</p>}
      </section>

      <section className="glass-card rounded-2xl p-4">
        <span className="eyebrow">LIBRARY // 媒体库</span>
        {error && <ErrorBox>{error}</ErrorBox>}
        {items === null && !error && <div className="mt-3 text-[var(--ia-mist)]"><Spinner /></div>}
        {items && items.length === 0 && (
          <p className="mt-3 text-xs text-[var(--ia-mist)]">还没有登记任何媒体。</p>
        )}
        {items && items.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {items.map((m, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-2">
                <img
                  src={m.url}
                  alt={m.label ?? ""}
                  loading="lazy"
                  className="size-12 shrink-0 rounded-lg border border-[var(--ia-line)] object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.25")}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-[var(--ia-ink)]">{m.label || "（未命名）"}</p>
                  <p className="mono truncate text-[10px] text-[var(--ia-mist)]">{m.url}</p>
                </div>
                <button
                  type="button"
                  aria-label="复制 URL"
                  onClick={() => copy(m.url)}
                  className="clickable grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-neon)]"
                >
                  <AdminIcon name="copy" size={15} />
                </button>
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<api.PublishResult | null>(null);

  useEffect(() => {
    api
      .getSettings<T>(name)
      .then((r) => setData(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : "读取失败"));
  }, [name]);

  const save = async () => {
    if (!data) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await api.putSettings(name, data);
      setSaved(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };

  return { data, setData, error, busy, saved, save };
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
  return (
    <div className="flex flex-col gap-4 pb-24">
      <div>
        <h2 className="text-base font-bold text-[var(--ia-ink)]">{title}</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--ia-mist)]">{desc}</p>
      </div>
      {hook.error && <ErrorBox>{hook.error}</ErrorBox>}
      {hook.saved && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--ia-success)_45%,transparent)] bg-[color-mix(in_srgb,var(--ia-success)_10%,transparent)] p-3 text-xs text-[var(--ia-success)]">
          已提交：<span className="mono">{hook.saved.commitSha.slice(0, 7)}</span> · 部署完成后生效。
          <a href={hook.saved.commitUrl} target="_blank" rel="noreferrer" className="clickable ml-1 underline">查看 commit ↗</a>
        </div>
      )}
      {hook.data === null && !hook.error ? (
        <div className="text-[var(--ia-mist)]"><Spinner /></div>
      ) : hook.data ? (
        <>
          {children}
          <BottomBar>
            <Btn kind="primary" full onClick={hook.save} disabled={hook.busy}>
              {hook.busy ? <Spinner /> : <AdminIcon name="check" size={16} />}
              {hook.busy ? "提交中…" : "保存并提交"}
            </Btn>
          </BottomBar>
        </>
      ) : null}
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

export function SettingsProfileScreen() {
  const hook = useSettings<Record<string, any>>("profile");
  const d = hook.data;
  const set = (k: string) => (v: string) => hook.setData({ ...d!, [k]: v });
  const setLink = (k: string) => (v: string) =>
    hook.setData({ ...d!, links: { ...(d!.links ?? {}), [k]: v } });
  return (
    <SettingsShell
      title="观测者档案"
      desc="修改后 commit 到 src/config/profile.json，部署后全站生效。"
      hook={hook}
    >
      {d && (
        <>
          <Section title="BASIC // 基本信息">
            <TextRow label="名字" value={d.author ?? ""} onChange={set("author")} />
            <TextRow label="Handle" value={d.handle ?? ""} onChange={set("handle")} />
            <TextRow label="签名" value={d.signature ?? ""} onChange={set("signature")} textarea />
            <TextRow label="状态" value={d.status ?? ""} onChange={set("status")} />
            <TextRow label="心情" value={d.mood ?? ""} onChange={set("mood")} />
            <TextRow label="坐标" value={d.coordinate ?? ""} onChange={set("coordinate")} />
            <TextRow label="头像 URL" value={d.avatar ?? ""} onChange={set("avatar")} />
            <TextRow label="简介" value={d.bio ?? ""} onChange={set("bio")} textarea />
          </Section>
          <Section title="LINKS // 联络通道" defaultOpen={false}>
            {["github", "email", "qq", "qqQr", "wechat", "wechatQr", "bilibili", "bangumi", "anilist"].map((k) => (
              <TextRow key={k} label={k} value={d.links?.[k] ?? ""} onChange={setLink(k)} />
            ))}
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
          </Section>
          <Section title="VISUAL // 背景与封面" defaultOpen={false}>
            <TextRow label="白昼背景 URL" value={d.backgroundDay ?? ""} onChange={set("backgroundDay")} />
            <TextRow label="黑夜背景 URL" value={d.backgroundNight ?? ""} onChange={set("backgroundNight")} />
            <TextRow label="默认封面 URL" value={d.defaultCover ?? ""} onChange={set("defaultCover")} />
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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <Field label={label}>
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
      desc="调整变动率引擎参数（src/config/worldline.json）。改动会重新计算全站 Worldline 数值与状态分级。"
      hook={hook}
    >
      {d && (
        <>
          <Section title="CORE // 核心参数">
            <NumRow label="基准值 baseValue" value={d.baseValue} onChange={set("baseValue")} step={0.000001} />
            <NumRow label="统计窗口（天）windowDays" value={d.windowDays} onChange={set("windowDays")} step={1} />
            <NumRow label="半衰期（天）halfLifeDays" value={d.halfLifeDays} onChange={set("halfLifeDays")} step={1} />
            <NumRow label="数值缩放 valueScale" value={d.valueScale} onChange={set("valueScale")} step={0.000001} />
            <Toggle
              checked={Boolean(d.dynamicDisplay)}
              onChange={set("dynamicDisplay")}
              label="前台动态跳变显示 dynamicDisplay"
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
