/**
 * src/lib/admin/drafts.ts（v5.0.2 §9）—— 本地草稿箱。
 *
 * 发布失败兜底的核心：任何一次「写了内容」都先落到 localStorage，
 * 网络断开 / Worker 失败 / GitHub 失败 / 页面刷新都不会丢内容。
 *
 * 设计约定：
 * - 存储键 wl-admin-drafts，值为 DraftRecord[]（按 updatedAt 倒序）；
 * - 草稿只存在于本机浏览器，不进 GitHub、不进前台列表、不参与 Worldline 计算
 *   （发布时勾选「存为草稿」的 draft:true 记录是另一回事，由 content schema 过滤）；
 * - 上限 60 条，超限丢弃最旧的（防止撑爆 localStorage）；
 * - 所有读写 try/catch：隐私模式 / 存储被禁用时静默降级为「不保存」。
 */

export type DraftStatus = "draft" | "failed";

export interface DraftRecord {
  id: string;
  /** 记录类型（moment / post / photo / project / music / anime / bug） */
  type: string;
  /** 列表展示用标题 / 摘要（从 state.title 或 state.content 提取） */
  title: string;
  /** 表单字段快照 */
  state: Record<string, unknown>;
  /** markdown 正文（无正文类型为空串） */
  body: string;
  createdAt: string;
  updatedAt: string;
  status: DraftStatus;
  /** 最近一次发布失败的错误说明（status = failed 时展示） */
  lastError?: string;
  /** 最近一次发布失败的错误分类（form / network / worker / github / actions） */
  lastErrorKind?: string;
}

const LS_KEY = "wl-admin-drafts";
const MAX_DRAFTS = 60;

function readAll(): DraftRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (d): d is DraftRecord =>
        !!d && typeof d === "object" && typeof d.id === "string" && typeof d.type === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(list: DraftRecord[]): boolean {
  try {
    const sorted = [...list]
      .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
      .slice(0, MAX_DRAFTS);
    localStorage.setItem(LS_KEY, JSON.stringify(sorted));
    return true;
  } catch {
    return false;
  }
}

export function listDrafts(): DraftRecord[] {
  return readAll().sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
}

export function getDraft(id: string): DraftRecord | null {
  return readAll().find((d) => d.id === id) ?? null;
}

export function countDrafts(): number {
  return readAll().length;
}

export function newDraftId(): string {
  try {
    return `d_${crypto.randomUUID()}`;
  } catch {
    return `d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** 从表单状态提取展示标题（moment 用 content 前 40 字，其余用 title） */
export function draftTitleOf(state: Record<string, unknown>): string {
  const t = state.title;
  if (typeof t === "string" && t.trim()) return t.trim().slice(0, 60);
  const c = state.content;
  if (typeof c === "string" && c.trim()) {
    const line = c.trim().split("\n")[0];
    return line.length > 40 ? line.slice(0, 40) + "…" : line;
  }
  return "（未命名草稿）";
}

/** 表单是否有值得保存的内容（避免把空表单塞进草稿箱） */
export function hasDraftContent(state: Record<string, unknown>, body: string): boolean {
  if (body.trim()) return true;
  for (const [k, v] of Object.entries(state)) {
    if (k === "date" || k === "draft" || k === "featured" || k === "worldlineImpact") continue;
    if (typeof v === "string" && v.trim()) return true;
    if (Array.isArray(v) && v.some((x) => typeof x === "string" && x.trim())) return true;
  }
  return false;
}

export interface SaveDraftInput {
  id?: string;
  type: string;
  state: Record<string, unknown>;
  body: string;
  status?: DraftStatus;
  lastError?: string;
  lastErrorKind?: string;
}

/** 保存 / 更新草稿；返回草稿 id（存储不可用时仍返回 id，但不落盘） */
export function saveDraft(input: SaveDraftInput): string {
  const now = new Date().toISOString();
  const id = input.id ?? newDraftId();
  const list = readAll();
  const idx = list.findIndex((d) => d.id === id);
  const prev = idx >= 0 ? list[idx] : null;
  const rec: DraftRecord = {
    id,
    type: input.type,
    title: draftTitleOf(input.state),
    state: input.state,
    body: input.body,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    status: input.status ?? prev?.status ?? "draft",
    ...(input.lastError !== undefined
      ? { lastError: input.lastError }
      : prev?.lastError
        ? { lastError: prev.lastError }
        : {}),
    ...(input.lastErrorKind !== undefined
      ? { lastErrorKind: input.lastErrorKind }
      : prev?.lastErrorKind
        ? { lastErrorKind: prev.lastErrorKind }
        : {}),
  };
  if (idx >= 0) list[idx] = rec;
  else list.unshift(rec);
  writeAll(list);
  return id;
}

export function deleteDraft(id: string): void {
  writeAll(readAll().filter((d) => d.id !== id));
}

/** 发布成功后清掉对应草稿 */
export function clearDraftAfterPublish(id: string | null | undefined): void {
  if (id) deleteDraft(id);
}
