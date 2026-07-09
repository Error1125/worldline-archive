/**
 * Admin Console API 客户端（v5.0）。
 *
 * 所有请求都带 credentials: "include"（后端 session 是 httpOnly cookie，
 * 前端拿不到、也不需要拿）。错误统一归一化为 AdminApiError，
 * 401 时抛出 code = "UNAUTHORIZED" 供上层跳转登录页。
 */

import { resolveApiBase } from "@/config/admin";

export interface PublishResult {
  success: boolean;
  type: string;
  path: string;
  commitSha: string;
  commitUrl: string;
  message: string;
  htmlPath?: string;
}

export interface SessionInfo {
  authenticated: boolean;
  expiresAt?: number;
}

export interface AdminStatus {
  repo: { owner: string; name: string; branch: string; url: string };
  latestCommit?: { sha: string; message: string; date: string; url: string } | null;
  latestRun?: {
    status: string;
    conclusion: string | null;
    createdAt: string;
    url: string;
  } | null;
  /** v5.0.2（§11.5）：Actions 状态读取失败时的权限 / 网络提示（不代表发布失败） */
  latestRunError?: string;
  media?: { count: number };
  r2Enabled?: boolean;
}

/** v5.0.2（§11.3）：/api/health 的配置体检结果（只有布尔 / 枚举，不含任何密钥值） */
export interface HealthInfo {
  ok: boolean;
  service?: string;
  time?: string;
  config?: {
    adminSecret: boolean;
    sessionSecret: "ok" | "too_short" | "missing";
    githubToken: boolean;
    githubRepo: boolean;
    r2: boolean;
  };
  problems?: string[];
}

export interface MediaItem {
  url: string;
  label?: string;
  addedAt: string;
  source?: "url" | "upload";
}

export class AdminApiError extends Error {
  code: string;
  status: number;
  detail?: unknown;
  constructor(code: string, message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "AdminApiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

async function request<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const base = resolveApiBase();
  if (!base) {
    throw new AdminApiError(
      "NO_API_BASE",
      "尚未配置后端 API 地址。请在登录页填写 Worker 地址（形如 https://xxx.workers.dev）。",
      0,
    );
  }

  let res: Response;
  try {
    res = await fetch(base + path, {
      credentials: "include",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
      ...init,
    });
  } catch (e) {
    throw new AdminApiError(
      "NETWORK",
      "无法连接后端（网络错误或 CORS 未放行当前站点域名）。",
      0,
      e,
    );
  }

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const code =
      data?.code ??
      (res.status === 401
        ? "UNAUTHORIZED"
        : res.status === 409
          ? "CONFLICT"
          : "API_ERROR");
    const message =
      data?.message ??
      (res.status === 401
        ? "未登录或会话已过期，请重新登录。"
        : `请求失败（HTTP ${res.status}）。`);
    throw new AdminApiError(code, message, res.status, data);
  }

  return (data ?? {}) as T;
}

/* ---------------- auth ---------------- */

export function login(secret: string) {
  return request<{ success: boolean }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ secret }),
  });
}

export function logout() {
  return request<{ success: boolean }>("/api/admin/logout", { method: "POST" });
}

export function getSession() {
  return request<SessionInfo>("/api/admin/session");
}

/* ---------------- publish ---------------- */

export function publish(type: string, payload: Record<string, unknown>) {
  return request<PublishResult>(`/api/admin/publish/${type}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ---------------- settings ---------------- */

export type SettingsName = "profile" | "site" | "worldline";

export function getSettings<T = Record<string, unknown>>(name: SettingsName) {
  return request<{ name: string; data: T }>(`/api/admin/settings/${name}`);
}

export function putSettings(name: SettingsName, data: Record<string, unknown>) {
  return request<PublishResult>(`/api/admin/settings/${name}`, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
}

/* ---------------- github / status ---------------- */

export function githubSync() {
  return request<PublishResult>("/api/admin/github/sync", { method: "POST" });
}

export function getStatus() {
  return request<AdminStatus>("/api/admin/status");
}

/** 健康检查：直接 GET {base}/api/health（无需登录）。可显式传入 base 供登录页「测试连接」。 */
export async function health(baseOverride?: string): Promise<HealthInfo> {
  const base = (baseOverride ?? resolveApiBase()).replace(/\/+$/, "");
  if (!base) throw new AdminApiError("NO_API_BASE", "尚未配置后端 API 地址。", 0);
  let res: Response;
  try {
    res = await fetch(base + "/api/health", { cache: "no-store" });
  } catch (e) {
    throw new AdminApiError("NETWORK", "无法连接该地址（网络错误或地址不正确）。", 0, e);
  }
  const data = (await res.json().catch(() => null)) as HealthInfo | null;
  if (!data || typeof data.ok !== "boolean") {
    throw new AdminApiError("NOT_A_WORKER", "该地址有响应，但不是 Worldline Admin Worker。", res.status);
  }
  return data;
}

/* ---------------- media ---------------- */

export function mediaList() {
  return request<{ items: MediaItem[] }>("/api/admin/media");
}

export function mediaRegister(url: string, label?: string) {
  return request<PublishResult>("/api/admin/media/register", {
    method: "POST",
    body: JSON.stringify({ url, label }),
  });
}

export function mediaRemove(url: string) {
  return request<PublishResult>("/api/admin/media/remove", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function mediaUpload(file: File) {
  const base = resolveApiBase();
  if (!base) throw new AdminApiError("NO_API_BASE", "尚未配置后端 API 地址。", 0);
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(base + "/api/admin/media/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });
  } catch (e) {
    throw new AdminApiError("NETWORK", "上传失败：无法连接后端。", 0, e);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AdminApiError(
      data?.code ?? "UPLOAD_FAILED",
      data?.message ?? `上传失败（HTTP ${res.status}）。`,
      res.status,
      data,
    );
  }
  return data as { success: boolean; url: string };
}
