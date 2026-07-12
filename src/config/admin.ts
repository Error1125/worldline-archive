/**
 * Admin Console 前端配置（v5.0，v5.4.1 支持同站部署）。
 *
 * API base 解析优先级：
 *   1. localStorage["wl-admin-api-base"]（在登录页可填写 / 修改，方便 GitHub Pages
 *      静态部署后随时切换后端地址 —— 这只是「指向哪台后端」，不是鉴权）；
 *   2. 构建期环境变量 PUBLIC_ADMIN_API_BASE（推荐在 GitHub Actions 里注入）。
 *
 * 两种写法（v5.4.1 Hotfix-02）：
 *   - 绝对地址：https://worldline-admin-api.xxx.workers.dev 或 https://api.example.com；
 *   - 同站相对：Worker Route 绑定在「前端同一主机名/api/*」时填 "/"。
 *
 * 安全模型：前端不保存任何密钥。登录 = 后端校验 ADMIN_SECRET 后签发
 * httpOnly session cookie；此后所有写操作都由后端逐请求验证 cookie。
 * 前端的「登录态提示」（localStorage wl-admin-hint）只影响 UI 显隐，
 * 伪造它无法通过任何后端校验。
 */

export const ADMIN_API_BASE_ENV: string = (import.meta.env.PUBLIC_ADMIN_API_BASE as string | undefined) ?? "";

export const LS_API_BASE = "wl-admin-api-base";
export const LS_ADMIN_HINT = "wl-admin-hint";

/**
 * v5.4.1 Hotfix-02：归一化 API base，新增同站（same-site）写法：
 * - "https://api.example.com"           → 原样（去尾斜杠）；
 * - "/"                                 → 当前站点源（Worker Route 绑定在
 *                                         archive.example.com/api/* 时用它）；
 * - "/some-prefix"                      → 当前站点源 + 前缀；
 * 其余值视为未配置，返回 ""。
 */
export function normalizeApiBase(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v.replace(/\/+$/, "");
  if (v.startsWith("/")) {
    if (typeof location === "undefined") return "";
    const path = v.replace(/\/+$/, "");
    return path === "" || path === "/" ? location.origin : location.origin + path;
  }
  return "";
}

export function resolveApiBase(): string {
  if (typeof localStorage !== "undefined") {
    const fromLocal = normalizeApiBase(localStorage.getItem(LS_API_BASE));
    if (fromLocal) return fromLocal;
  }
  return normalizeApiBase(ADMIN_API_BASE_ENV);
}

export function saveApiBase(v: string) {
  try {
    const trimmed = v.trim().replace(/\/+$/, "");
    // 允许保存绝对地址或同站相对写法（"/" / "/prefix"），空值清除本机覆盖。
    if (trimmed && (/^https?:\/\//i.test(trimmed) || v.trim().startsWith("/"))) {
      localStorage.setItem(LS_API_BASE, trimmed || "/");
    } else localStorage.removeItem(LS_API_BASE);
  } catch { /* ignore */ }
}

export function setAdminHint(on: boolean) {
  try {
    if (on) localStorage.setItem(LS_ADMIN_HINT, "1");
    else localStorage.removeItem(LS_ADMIN_HINT);
  } catch { /* ignore */ }
}

export function hasAdminHint(): boolean {
  try {
    return localStorage.getItem(LS_ADMIN_HINT) === "1";
  } catch {
    return false;
  }
}
