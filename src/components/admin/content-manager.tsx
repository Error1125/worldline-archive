/**
 * v5.4 Content Manager（重写）。
 *
 * 相比 v5.3 的压缩原型：
 * - loading 骨架 / 空态 / 错误重试三态齐备；筛选（类型 / 状态 / 搜索）用 Listbox；
 * - 移动端表格转卡片；行内操作有 busy 反馈与 Toast 结果；
 * - 隐藏 / 恢复走确认弹窗（可逆操作，非 danger）；永久删除需输入 slug 确认（danger）；
 * - 行内编辑器：dirty 跟踪 + 未保存离开守卫（内部导航 + beforeunload）；
 * - sessionStorage 记忆筛选与滚动位置，从编辑返回列表不丢上下文。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/admin/api";
import { RECORD_TYPES } from "./adminFields";
import {
  AdminIcon,
  Btn,
  EmptyState,
  ErrorState,
  Input,
  Listbox,
  Skeleton,
  StatusPill,
  timeAgo,
} from "./ui";
import { useDialog, useToast } from "./feedback";
import { NavLink, useAdminNavGuard } from "./router";
import { useReportSaveStatus } from "./shell";

const MEM_KEY = "wl-admin-content-mem";

type Mem = { type: api.ContentType; query: string; status: string; scrollY: number };

function readMem(): Partial<Mem> {
  try {
    const raw = sessionStorage.getItem(MEM_KEY);
    return raw ? (JSON.parse(raw) as Partial<Mem>) : {};
  } catch {
    return {};
  }
}

function writeMem(patch: Partial<Mem>) {
  try {
    sessionStorage.setItem(MEM_KEY, JSON.stringify({ ...readMem(), ...patch }));
  } catch {
    /* ignore */
  }
}

const TYPE_OPTIONS = RECORD_TYPES.map((t) => ({ value: t.type, label: t.label }));

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "public", label: "公开" },
  { value: "hidden", label: "已隐藏" },
  { value: "draft", label: "草稿" },
];

function matchStatus(row: api.ContentRow, status: string): boolean {
  switch (status) {
    case "public":
      return row.visibility !== "hidden" && !row.draft;
    case "hidden":
      return row.visibility === "hidden";
    case "draft":
      return row.draft;
    default:
      return true;
  }
}

function rowStatusPills(row: api.ContentRow) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {row.visibility === "hidden" ? (
        <StatusPill tone="warning">hidden</StatusPill>
      ) : (
        <StatusPill tone="success">public</StatusPill>
      )}
      {row.draft && <StatusPill tone="mist">draft</StatusPill>}
      {row.status ? <StatusPill tone="neon">{row.status}</StatusPill> : null}
    </span>
  );
}

export function ContentManagerScreen({ siteBase }: { siteBase: string }) {
  const toast = useToast();
  const dialog = useDialog();

  const mem = useMemo(readMem, []);
  const [type, setType] = useState<api.ContentType>(
    TYPE_OPTIONS.some((o) => o.value === mem.type) ? (mem.type as api.ContentType) : "post",
  );
  const [query, setQuery] = useState(mem.query ?? "");
  const [status, setStatus] = useState(
    STATUS_OPTIONS.some((o) => o.value === mem.status) ? (mem.status as string) : "all",
  );

  const [rows, setRows] = useState<api.ContentRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  // ---- editor state ----
  const [editing, setEditing] = useState<{ type: api.ContentType; slug: string } | null>(null);
  const [detail, setDetail] = useState<api.ContentDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [snapshot, setSnapshot] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editorRef = useRef<HTMLElement | null>(null);

  const editorDirty = Boolean(detail) && `${detail!.frontmatter}\u0000${detail!.body}` !== snapshot;

  /* ------------------------- list loading ------------------------- */

  const restoredScroll = useRef(false);
  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) {
        setRows(null);
        setListError(null);
      }
      setRefreshing(true);
      try {
        const r = await api.contentList(type);
        setRows(r.items);
        setListError(null);
        if (!restoredScroll.current) {
          restoredScroll.current = true;
          const y = readMem().scrollY;
          if (typeof y === "number" && y > 0) {
            requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
          }
        }
      } catch (e) {
        setListError(e instanceof Error ? e.message : "读取失败");
        if (!opts?.soft) setRows(null);
      } finally {
        setRefreshing(false);
      }
    },
    [type],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // 记忆筛选与滚动位置（节流写入）。
  useEffect(() => {
    writeMem({ type, query, status });
  }, [type, query, status]);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (t) return;
      t = setTimeout(() => {
        t = null;
        writeMem({ scrollY: window.scrollY });
      }, 250);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (t) clearTimeout(t);
      writeMem({ scrollY: window.scrollY });
    };
  }, []);

  /* ----------------------- unsaved guard ------------------------- */

  const confirmDiscard = useCallback(
    () =>
      dialog.confirm({
        title: "放弃未保存的修改？",
        message: "当前记录的编辑尚未保存到 GitHub，离开后修改将丢失。",
        confirmLabel: "放弃修改",
        cancelLabel: "继续编辑",
        danger: true,
      }),
    [dialog],
  );

  useAdminNavGuard(editorDirty ? () => confirmDiscard() : null);
  useEffect(() => {
    if (!editorDirty) return undefined;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editorDirty]);

  useReportSaveStatus(
    detail
      ? saving
        ? { tone: "saving", label: "正在保存…" }
        : editorDirty
          ? { tone: "dirty", label: `编辑中 · ${detail.slug}` }
          : { tone: "saved", label: "无未保存修改" }
      : null,
  );

  /* -------------------------- editor ------------------------------ */

  const closeEditor = useCallback(() => {
    setEditing(null);
    setDetail(null);
    setDetailError(null);
    setSnapshot("");
  }, []);

  const openEditor = useCallback(
    async (row: api.ContentRow) => {
      if (editorDirty) {
        const ok = await confirmDiscard();
        if (!ok) return;
      }
      setEditing({ type, slug: row.slug });
      setDetail(null);
      setDetailError(null);
      setDetailLoading(true);
      try {
        const d = await api.contentDetail(type, row.slug);
        setDetail(d);
        setSnapshot(`${d.frontmatter}\u0000${d.body}`);
        requestAnimationFrame(() =>
          editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      } catch (e) {
        setDetailError(e instanceof Error ? e.message : "读取失败");
      } finally {
        setDetailLoading(false);
      }
    },
    [type, editorDirty, confirmDiscard],
  );

  const reloadDetail = useCallback(async () => {
    if (!editing) return;
    setDetailError(null);
    setDetailLoading(true);
    try {
      const d = await api.contentDetail(editing.type, editing.slug);
      setDetail(d);
      setSnapshot(`${d.frontmatter}\u0000${d.body}`);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "读取失败");
    } finally {
      setDetailLoading(false);
    }
  }, [editing]);

  const save = useCallback(async () => {
    if (!detail || saving) return;
    setSaving(true);
    try {
      const res = await api.updateContent(detail.type, detail.slug, {
        frontmatter: detail.frontmatter,
        body: detail.body,
        blobSha: detail.blobSha,
      });
      toast.success("修改已提交", `commit ${res.commitSha.slice(0, 7)} · 部署完成后前台生效`);
      // 重新拉取详情刷新 blobSha / snapshot，避免下次保存 409。
      try {
        const d = await api.contentDetail(detail.type, detail.slug);
        setDetail(d);
        setSnapshot(`${d.frontmatter}\u0000${d.body}`);
      } catch {
        setSnapshot(`${detail.frontmatter}\u0000${detail.body}`);
      }
      void load({ soft: true });
    } catch (e) {
      toast.error("保存失败", e instanceof Error ? e.message : "未知错误");
    } finally {
      setSaving(false);
    }
  }, [detail, saving, toast, load]);

  const removePermanently = useCallback(async () => {
    if (!detail || deleting) return;
    const ok = await dialog.confirm({
      title: "永久删除这条记录？",
      message: (
        <>
          将从 GitHub 删除 <span className="mono break-all">{detail.path}</span>
          ，并触发一次部署使其从前台下线。此操作不可恢复。
        </>
      ),
      confirmLabel: "永久删除",
      cancelLabel: "取消",
      danger: true,
      confirmInput: {
        label: "输入 slug 以确认",
        expected: detail.slug,
        placeholder: detail.slug,
        help: "为防误删，需完整输入该记录的 slug。",
      },
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.deleteContent(detail.type, detail.slug, detail.blobSha);
      toast.success("已永久删除", `${detail.slug} · 部署完成后前台下线`);
      setRows((cur) => (cur ? cur.filter((r) => r.slug !== detail.slug) : cur));
      closeEditor();
    } catch (e) {
      toast.error("删除失败", e instanceof Error ? e.message : "未知错误");
    } finally {
      setDeleting(false);
    }
  }, [detail, deleting, dialog, toast, closeEditor]);

  const requestCloseEditor = useCallback(async () => {
    if (editorDirty) {
      const ok = await confirmDiscard();
      if (!ok) return;
    }
    closeEditor();
  }, [editorDirty, confirmDiscard, closeEditor]);

  /* --------------------- row-level actions ------------------------ */

  const changeType = useCallback(
    async (next: string) => {
      if (next === type) return;
      if (editorDirty) {
        const ok = await confirmDiscard();
        if (!ok) return;
      }
      closeEditor();
      setType(next as api.ContentType);
    },
    [type, editorDirty, confirmDiscard, closeEditor],
  );

  const patchVisibility = useCallback(
    async (row: api.ContentRow) => {
      const toHidden = row.visibility !== "hidden";
      const ok = await dialog.confirm({
        title: toHidden ? `隐藏「${row.title || row.slug}」？` : `恢复「${row.title || row.slug}」？`,
        message: toHidden
          ? "记录会从前台下线，但文件保留在仓库中，可随时恢复。"
          : "记录将重新出现在前台（部署完成后生效）。",
        confirmLabel: toHidden ? "隐藏" : "恢复",
        cancelLabel: "取消",
      });
      if (!ok) return;
      setRowBusy(row.slug);
      try {
        const d = await api.contentDetail(type, row.slug);
        const next = toHidden ? "hidden" : "public";
        const frontmatter = /^visibility:.*$/m.test(d.frontmatter)
          ? d.frontmatter.replace(/^visibility:.*$/m, `visibility: "${next}"`)
          : `${d.frontmatter}\nvisibility: "${next}"`;
        await api.updateContent(type, row.slug, {
          frontmatter,
          body: d.body,
          blobSha: d.blobSha,
        });
        setRows((cur) =>
          cur ? cur.map((r) => (r.slug === row.slug ? { ...r, visibility: next } : r)) : cur,
        );
        toast.success(toHidden ? "已隐藏" : "已恢复", `${row.slug} · 部署完成后前台生效`);
        if (editing?.slug === row.slug) void reloadDetail();
      } catch (e) {
        toast.error(toHidden ? "隐藏失败" : "恢复失败", e instanceof Error ? e.message : "未知错误");
      } finally {
        setRowBusy(null);
      }
    },
    [type, dialog, toast, editing, reloadDetail],
  );

  /* --------------------------- render ------------------------------ */

  const shown = useMemo(() => {
    if (!rows) return null;
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) => matchStatus(r, status) && (!q || `${r.title} ${r.slug}`.toLowerCase().includes(q)),
    );
  }, [rows, query, status]);

  const hasFilter = query.trim() !== "" || status !== "all";

  const rowActions = (row: api.ContentRow) => (
    <span className="inline-flex items-center gap-1.5">
      <Btn
        kind="secondary"
        size="sm"
        onClick={() => void openEditor(row)}
        disabled={rowBusy === row.slug}
      >
        编辑
      </Btn>
      <Btn
        kind="ghost"
        size="sm"
        loading={rowBusy === row.slug}
        onClick={() => void patchVisibility(row)}
      >
        <AdminIcon name={row.visibility === "hidden" ? "eye" : "eyeOff"} size={13} />
        {row.visibility === "hidden" ? "恢复" : "隐藏"}
      </Btn>
      <a
        href={`${siteBase}${row.htmlPath}`}
        target="_blank"
        rel="noreferrer"
        title="在前台查看"
        aria-label="在前台查看"
        className="adm-ring clickable grid size-9 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)] transition-colors hover:border-[var(--ia-line-strong)] hover:text-[var(--ia-ink)]"
      >
        <AdminIcon name="external" size={14} />
      </a>
      <a
        href={row.githubUrl}
        target="_blank"
        rel="noreferrer"
        title="在 GitHub 查看"
        aria-label="在 GitHub 查看"
        className="adm-ring clickable grid size-9 place-items-center rounded-lg border border-[var(--ia-line)] text-[var(--ia-mist)] transition-colors hover:border-[var(--ia-line-strong)] hover:text-[var(--ia-ink)]"
      >
        <AdminIcon name="github" size={14} />
      </a>
    </span>
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold text-[var(--ia-ink)]">内容管理</h1>
        <p className="mt-1 text-xs leading-relaxed text-[var(--ia-mist)]">
          编辑保留原始 frontmatter、未知字段与 Markdown 正文；保存与永久删除均校验 GitHub blob
          SHA，避免覆盖并发修改。
        </p>
      </div>

      {/* 工具栏：搜索 / 类型 / 状态 / 刷新 */}
      <div className="glass-card sticky top-[64px] z-30 flex flex-col gap-2.5 rounded-2xl p-3 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ia-mist)]">
            <AdminIcon name="search" size={14} />
          </span>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题或 slug"
            aria-label="搜索标题或 slug"
            className="!py-2.5 pl-9"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <Listbox
            value={type}
            onChange={(v) => void changeType(v)}
            options={TYPE_OPTIONS}
            ariaLabel="内容类型"
            size="sm"
            className="w-32"
          />
          <Listbox
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
            ariaLabel="状态筛选"
            size="sm"
            className="w-32"
          />
          <Btn
            kind="icon"
            size="sm"
            loading={refreshing && rows !== null}
            onClick={() => void load({ soft: true })}
            aria-label="刷新列表"
            title="刷新列表"
          >
            <AdminIcon name="refresh" size={14} />
          </Btn>
        </div>
      </div>

      {/* 列表三态 */}
      {rows === null && !listError ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : listError && rows === null ? (
        <ErrorState message={listError} onRetry={() => void load()} retrying={refreshing} />
      ) : shown && shown.length === 0 ? (
        hasFilter ? (
          <EmptyState icon="search" title="没有匹配的记录" hint="试试更换关键字或状态筛选。">
            <Btn
              kind="secondary"
              size="sm"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
            >
              清除筛选
            </Btn>
          </EmptyState>
        ) : (
          <EmptyState
            icon="drafts"
            title="这个类型还没有记录"
            hint="发布第一条记录后，就可以在这里管理它。"
          >
            <NavLink
              to={{ screen: "publish-form", type }}
              className="adm-ring clickable inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--ia-neon)_55%,transparent)] bg-[color-mix(in_srgb,var(--ia-neon)_16%,transparent)] px-3 text-[13px] font-semibold text-[var(--ia-neon)]"
            >
              <AdminIcon name="plus" size={13} />
              去发布
            </NavLink>
          </EmptyState>
        )
      ) : shown ? (
        <>
          {/* 桌面表格 */}
          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--ia-line)] md:block">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="mono text-[10px] uppercase tracking-wider text-[var(--ia-mist)]">
                <tr className="border-b border-[var(--ia-line)]">
                  <th className="p-3 font-medium">标题</th>
                  <th className="p-3 font-medium">slug</th>
                  <th className="p-3 font-medium">状态</th>
                  <th className="p-3 font-medium">更新时间</th>
                  <th className="p-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr
                    key={row.slug}
                    className={`border-t border-[var(--ia-line)] transition-colors first:border-t-0 hover:bg-[color-mix(in_srgb,var(--ia-neon)_4%,transparent)] ${
                      editing?.slug === row.slug
                        ? "bg-[color-mix(in_srgb,var(--ia-neon)_7%,transparent)]"
                        : ""
                    }`}
                  >
                    <td className="max-w-[260px] p-3">
                      <span className="block truncate font-medium text-[var(--ia-ink)]">
                        {row.title || row.slug}
                      </span>
                    </td>
                    <td className="mono max-w-[180px] p-3">
                      <span className="block truncate text-[var(--ia-mist)]">{row.slug}</span>
                    </td>
                    <td className="p-3">{rowStatusPills(row)}</td>
                    <td className="mono whitespace-nowrap p-3 text-[var(--ia-mist)]">
                      {row.updatedAt ? timeAgo(row.updatedAt) : "—"}
                    </td>
                    <td className="p-3">{rowActions(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端卡片 */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {shown.map((row) => (
              <div
                key={row.slug}
                className={`glass-card rounded-2xl p-3.5 ${
                  editing?.slug === row.slug
                    ? "border border-[color-mix(in_srgb,var(--ia-neon)_45%,transparent)]"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ia-ink)]">
                      {row.title || row.slug}
                    </p>
                    <p className="mono mt-0.5 truncate text-[11px] text-[var(--ia-mist)]">
                      {row.slug}
                      {row.updatedAt ? ` · ${timeAgo(row.updatedAt)}` : ""}
                    </p>
                  </div>
                  {rowStatusPills(row)}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">{rowActions(row)}</div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* 行内编辑面板 */}
      {editing && (
        <section
          ref={editorRef}
          className="corner-ticks glass-card adm-panel-enter scroll-mt-20 rounded-2xl p-4"
          aria-label={`编辑 ${editing.slug}`}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 truncate text-sm font-bold text-[var(--ia-ink)]">
              编辑 <span className="mono text-[var(--ia-neon)]">{editing.slug}</span>
            </h2>
            <Btn kind="icon" size="sm" onClick={() => void requestCloseEditor()} aria-label="关闭编辑" title="关闭编辑">
              <AdminIcon name="close" size={14} />
            </Btn>
          </div>

          {detailLoading ? (
            <div className="mt-4 flex flex-col gap-3" aria-hidden="true">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : detailError ? (
            <ErrorState className="mt-4" message={detailError} onRetry={() => void reloadDetail()} />
          ) : detail ? (
            <div className="mt-4 flex flex-col gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[var(--ia-mist)]">
                  Frontmatter（原样保留，未知字段不会丢失）
                </span>
                <textarea
                  value={detail.frontmatter}
                  onChange={(e) => setDetail({ ...detail, frontmatter: e.target.value })}
                  spellCheck={false}
                  className="mono min-h-56 w-full rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-3 text-xs leading-relaxed text-[var(--ia-ink)] outline-none transition-colors focus:border-[var(--ia-neon)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[var(--ia-mist)]">
                  Markdown 正文
                </span>
                <textarea
                  value={detail.body}
                  onChange={(e) => setDetail({ ...detail, body: e.target.value })}
                  spellCheck={false}
                  className="mono min-h-56 w-full rounded-xl border border-[var(--ia-line)] bg-[var(--ia-panel)] p-3 text-xs leading-relaxed text-[var(--ia-ink)] outline-none transition-colors focus:border-[var(--ia-neon)]"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                <Btn kind="primary" size="sm" loading={saving} disabled={!editorDirty || deleting} onClick={() => void save()}>
                  <AdminIcon name="save" size={13} />
                  保存修改
                </Btn>
                <Btn kind="danger" size="sm" loading={deleting} disabled={saving} onClick={() => void removePermanently()}>
                  <AdminIcon name="trash" size={13} />
                  永久删除
                </Btn>
                <span className="mono ml-auto text-[10px] text-[var(--ia-mist)]" aria-live="polite">
                  {editorDirty ? "有未保存修改" : `blob ${detail.blobSha.slice(0, 7)}`}
                </span>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
