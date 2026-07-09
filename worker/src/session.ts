/**
 * Session（v5.0）—— HMAC-SHA256 签名的 httpOnly cookie。
 *
 * cookie 值 = base64url(JSON{iat,exp}) + "." + base64url(HMAC(payload, SESSION_SECRET))
 * - httpOnly：前端 JS 读不到；
 * - Secure + SameSite=None：GitHub Pages（跨站）也能带上；
 * - 无状态：Worker 不需要 KV，验证只靠签名 + exp。
 */

const COOKIE_NAME = "wl_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 天

/**
 * session 签名密钥的最小长度。低于此值视为「未正确配置」：
 * 空 / 过短的 secret 会让 HMAC 签名形同虚设（空密钥是公开已知的，
 * 攻击者可据此自行伪造出「合法」cookie），因此签发与校验前都必须
 * 先通过 isUsableSessionSecret 检查。与部署文档一致
 * （worker/README.md 建议 `openssl rand -hex 32`，即 64 个十六进制字符）。
 */
export const MIN_SESSION_SECRET_LENGTH = 32;

/** SESSION_SECRET 是否可安全用于签名 / 校验（已配置且长度达标） */
export function isUsableSessionSecret(secret: string | undefined | null): boolean {
  return typeof secret === "string" && secret.length >= MIN_SESSION_SECRET_LENGTH;
}

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeToString(s: string): string | null {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    return atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64url(sig);
}

export interface SessionPayload {
  iat: number;
  exp: number;
}

/** 签发 session，返回 Set-Cookie 值 */
export async function issueSessionCookie(secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { iat: now, exp: now + SESSION_TTL_SECONDS };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await sign(body, secret);
  const value = `${body}.${sig}`;
  return [
    `${COOKIE_NAME}=${value}`,
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].join("; ");
}

/** 清除 session 的 Set-Cookie 值 */
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`;
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/** 校验请求的 session cookie。合法返回 payload，否则 null。 */
export async function verifySession(
  req: Request,
  secret: string,
): Promise<SessionPayload | null> {
  // secret 未配置 / 过短：判为无有效会话，绝不用弱密钥校验，
  // 否则攻击者可用公开已知的空密钥伪造 cookie 绕过鉴权。
  if (!isUsableSessionSecret(secret)) return null;
  const raw = parseCookies(req.headers.get("Cookie"))[COOKIE_NAME];
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expect = await sign(body, secret);
  // 常数时间比较（长度相同才可能相等）
  if (sig.length !== expect.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expect.charCodeAt(i);
  if (diff !== 0) return null;
  const json = b64urlDecodeToString(body);
  if (!json) return null;
  try {
    const payload = JSON.parse(json) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

/** 常数时间字符串比较（用于口令校验） */
export function timingSafeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) {
    // 仍旧完整走一遍，避免长度短路的时序差异被放大
    let d = 1;
    const n = Math.max(ab.length, bb.length);
    for (let i = 0; i < n; i++) d |= (ab[i % (ab.length || 1)] ?? 0) ^ (bb[i % (bb.length || 1)] ?? 0);
    return false;
  }
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}
