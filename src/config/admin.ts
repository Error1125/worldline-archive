/**
 * Admin Console 前端配置（v5.0）。
 *
 * API base 解析优先级：
 *   1. localStorage["wl-admin-api-base"]（在登录页可填写 / 修改，方便 GitHub Pages
 *      静态部署后随时切换后端地址 —— 这只是「指向哪台后端」，不是鉴权）；
 *   2. 构建期环境变量 PUBLIC_ADMIN_API_BASE（推荐在 GitHub Actions 里注入）。
 *
 * 安全模型：前端不保存任何密钥。登录 = 后端校验 ADMIN_SECRET 后签发
 * httpOnly session cookie；此后所有写操作都由后端逐请求验证 cookie。
 * 前端的「登录态提示」（localStorage wl-admin-hint）只影响 UI 显隐，
 * 伪造它无法通过任何后端校验。
 */

export const ADMIN_API_BASE_ENV: string = (import.meta.env.PUBLIC_ADMIN_API_BASE as string | undefined) ?? "";

export const LS_API_BASE = "wl-admin-api-base";
export const LS_ADMIN_HINT = "wl-admin-hint";

export function resolveApiBase(): string {
  if (typeof localStorage !== "undefined") {
    const v = localStorage.getItem(LS_API_BASE);
    if (v && /^https?:\/\//.test(v)) return v.replace(/\/+$/, "");
  }
  return ADMIN_API_BASE_ENV.replace(/\/+$/, "");
}

export function saveApiBase(v: string) {
  try {
    if (v) localStorage.setItem(LS_API_BASE, v.replace(/\/+$/, ""));
    else localStorage.removeItem(LS_API_BASE);
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
