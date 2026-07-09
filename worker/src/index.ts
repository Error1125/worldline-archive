/**
 * worker/src/index.ts
 *
 * Worldline Archive Admin API（Cloudflare Worker）。
 *
 * 职责：
 * - 登录 / 登出 / 会话校验（httpOnly cookie，见 session.ts）
 * - 发布内容：生成 Markdown 并 commit 到 GitHub 仓库（github.ts + content-files.ts）
 * - 站点设置读写（三份 JSON 配置）
 * - GitHub 数据同步（repos.json / activity.json）
 * - 媒体清单登记 + 可选 R2 直传
 * - 仓库 / 部署状态查询
 *
 * 安全要点：
 * - GITHUB_TOKEN / ADMIN_SECRET / SESSION_SECRET 只存在于 Worker secrets，
 *   永不出现在任何响应体里。
 * - 除 login/session 外的所有端点都要求合法 session cookie。
 * - CORS 只允许 ALLOWED_ORIGIN（GitHub Pages 站点源），带 credentials。
 */

import {
  issueSessionCookie,
  clearSessionCookie,
  verifySession,
  timingSafeEqual,
  isUsableSessionSecret,
} from "./session";
import {
  GitHubError,
  getJsonFile,
  putFile,
  repoInfo,
  latestCommit,
  latestWorkflowRun,
  fetchOwnerRepos,
  fetchOwnerEvents,
  type GitHubEnvLike,
} from "./github";
import {
  ValidationError,
  RECORD_TYPES,
  buildContentFile,
  SETTINGS_FILES,
  MEDIA_MANIFEST_PATH,
  type RecordType,
} from "./content-files";
import { SettingsValidationError, validateSettings } from "./settings-schema";

/* ---------------- Env ---------------- */

export interface Env extends GitHubEnvLike {
  /* vars（wrangler.toml [vars]） */
  ALLOWED_ORIGIN: string; // 例：https://error1125.github.io
  /* secrets（wrangler secret put …） */
  ADMIN_SECRET: string; // 控制台登录口令
  SESSION_SECRET: string; // session 签名密钥
  /* 可选：R2 媒体桶 */
  MEDIA_BUCKET?: R2Bucket;
  R2_PUBLIC_BASE_URL?: string; // 例：https://media.example.com
}

/* Cloudflare R2 最小类型（避免依赖 @cloudflare/workers-types） */
interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}

/* ---------------- 小工具 ---------------- */

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

function err(code: string, message: string, status: number, detail?: unknown): Response {
  return json({ code, message, ...(detail !== undefined ? { detail } : {}) }, status);
}

function corsHeaders(env: Env, req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = (env.ALLOWED_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const h: Record<string, string> = { Vary: "Origin" };
  if (origin && allowed.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Credentials"] = "true";
  }
  return h;
}

function withCors(res: Response, cors: Record<string, string>): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
  return out;
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const data = (await req.json()) as unknown;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
  } catch {
    /* fallthrough */
  }
  return {};
}

/* ---------------- 登录限流（单实例内存，足够挡爆破） ---------------- */

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 分钟
const LOGIN_MAX_ATTEMPTS = 10;

function loginRateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec || rec.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > LOGIN_MAX_ATTEMPTS;
}

/* ---------------- media manifest ---------------- */

interface MediaManifest {
  generatedAt: string;
  items: Array<{ url: string; label?: string; addedAt: string; source?: string }>;
}

async function loadMediaManifest(env: Env): Promise<{ sha?: string; data: MediaManifest }> {
  const file = await getJsonFile<MediaManifest>(env, MEDIA_MANIFEST_PATH);
  if (!file) return { data: { generatedAt: new Date().toISOString(), items: [] } };
  const data = file.data;
  if (!Array.isArray(data.items)) data.items = [];
  return { sha: file.sha, data };
}

async function saveMediaManifest(env: Env, data: MediaManifest, message: string) {
  data.generatedAt = new Date().toISOString();
  return putFile(env, MEDIA_MANIFEST_PATH, JSON.stringify(data, null, 2) + "\n", message);
}

/* ---------------- github sync：组装前台 JSON ---------------- */

function buildReposJson(raw: any[], generatedAt: string) {
  const repos = raw
    .filter((r) => !r.fork)
    .slice(0, 8)
    .map((r) => ({
      owner: r.owner?.login ?? "",
      repo: r.name ?? "",
      description: r.description ?? "",
      url: r.html_url ?? "",
      language: r.language ?? null,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      lastCommitAt: r.pushed_at ?? r.updated_at ?? generatedAt,
      topics: Array.isArray(r.topics) ? r.topics : [],
    }));
  return { _note: "由控制台 GitHub 同步生成（真实数据）。", generatedAt, repos };
}

function buildActivityJson(raw: any[], generatedAt: string) {
  const out: Array<{ id: string; type: string; repo: string; title: string; createdAt: string; url?: string }> = [];
  for (const ev of raw) {
    if (out.length >= 12) break;
    const repo: string = ev.repo?.name ?? "";
    const createdAt: string = ev.created_at ?? generatedAt;
    const id: string = `evt_${ev.id ?? out.length}`;
    switch (ev.type) {
      case "PushEvent": {
        const commits = ev.payload?.commits ?? [];
        const head = commits[commits.length - 1];
        if (!head) break;
        out.push({
          id,
          type: "commit",
          repo,
          title: String(head.message ?? "").split("\n")[0].slice(0, 96) || "commit",
          createdAt,
          url: `https://github.com/${repo}/commit/${head.sha ?? ""}`,
        });
        break;
      }
      case "IssuesEvent":
        out.push({
          id,
          type: "issue",
          repo,
          title: ev.payload?.issue?.title ?? "issue",
          createdAt,
          url: ev.payload?.issue?.html_url,
        });
        break;
      case "PullRequestEvent":
        out.push({
          id,
          type: "pull_request",
          repo,
          title: ev.payload?.pull_request?.title ?? "pull request",
          createdAt,
          url: ev.payload?.pull_request?.html_url,
        });
        break;
      case "ReleaseEvent":
        out.push({
          id,
          type: "release",
          repo,
          title: ev.payload?.release?.name ?? ev.payload?.release?.tag_name ?? "release",
          createdAt,
          url: ev.payload?.release?.html_url,
        });
        break;
      case "WatchEvent":
        out.push({ id, type: "star", repo, title: `Starred ${repo}`, createdAt, url: `https://github.com/${repo}` });
        break;
      default:
        break;
    }
  }
  return { _note: "由控制台 GitHub 同步生成（真实数据）。", generatedAt, activity: out };
}

/* ---------------- 路由 ---------------- */

const AUTH_FREE = new Set(["POST /api/admin/login", "GET /api/admin/session", "POST /api/admin/logout"]);

async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const routeKey = `${req.method} ${path}`;

  /* 健康检查（无需鉴权，便于确认 Worker 存活）。
     v5.0.2（§11.3）：附带配置体检（只报「有没有 / 够不够长」，绝不回显任何值），
     让「Worker 部署了但 secrets 没配全」不再表现为一个模糊错误。 */
  if (req.method === "GET" && (path === "/" || path === "/api/health")) {
    const problems: string[] = [];
    if (!env.ADMIN_SECRET) problems.push("ADMIN_SECRET missing");
    if (!env.SESSION_SECRET) problems.push("SESSION_SECRET missing");
    else if (!isUsableSessionSecret(env.SESSION_SECRET)) problems.push("SESSION_SECRET too short (need 32+)");
    if (!env.GITHUB_TOKEN) problems.push("GITHUB_TOKEN missing");
    if (!env.GITHUB_OWNER) problems.push("GITHUB_OWNER missing");
    if (!env.GITHUB_REPO) problems.push("GITHUB_REPO missing");
    if (!env.GITHUB_BRANCH) problems.push("GITHUB_BRANCH missing");
    return json({
      ok: problems.length === 0,
      service: "worldline-admin-api",
      time: new Date().toISOString(),
      config: {
        adminSecret: Boolean(env.ADMIN_SECRET),
        sessionSecret: !env.SESSION_SECRET
          ? "missing"
          : isUsableSessionSecret(env.SESSION_SECRET)
            ? "ok"
            : "too_short",
        githubToken: Boolean(env.GITHUB_TOKEN),
        githubRepo: Boolean(env.GITHUB_OWNER && env.GITHUB_REPO && env.GITHUB_BRANCH),
        r2: Boolean(env.MEDIA_BUCKET && env.R2_PUBLIC_BASE_URL),
      },
      ...(problems.length > 0 ? { code: "SERVER_MISCONFIGURED", problems } : {}),
    });
  }

  if (!path.startsWith("/api/admin/")) {
    return err("NOT_FOUND", "未知路径。", 404);
  }

  /* 鉴权门 */
  const needsAuth = !AUTH_FREE.has(routeKey);
  if (needsAuth) {
    const session = await verifySession(req, env.SESSION_SECRET);
    if (!session) return err("UNAUTHORIZED", "未登录或会话已过期，请重新登录。", 401);
  }

  /* ---- session ---- */
  if (routeKey === "GET /api/admin/session") {
    const session = await verifySession(req, env.SESSION_SECRET);
    return json(session ? { authenticated: true, expiresAt: session.exp } : { authenticated: false });
  }

  if (routeKey === "POST /api/admin/login") {
    const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
    if (loginRateLimited(ip)) {
      return err("RATE_LIMITED", "尝试过于频繁，请 10 分钟后再试。", 429);
    }
    const body = await readJson(req);
    const secret = typeof body.secret === "string" ? body.secret : "";
    if (!env.ADMIN_SECRET) {
      return err("SERVER_MISCONFIGURED", "服务端未配置 ADMIN_SECRET。", 500);
    }
    if (!isUsableSessionSecret(env.SESSION_SECRET)) {
      // 不用空 / 过短 secret 签 cookie（否则签名形同虚设，会话可被伪造）
      return err("SERVER_MISCONFIGURED", "服务端未配置 SESSION_SECRET 或长度不足（需 32+ 字符）。", 500);
    }
    if (!secret || !timingSafeEqual(secret, env.ADMIN_SECRET)) {
      return err("INVALID_SECRET", "口令错误。El Psy Kongroo.", 401);
    }
    const cookie = await issueSessionCookie(env.SESSION_SECRET);
    return json({ authenticated: true }, 200, { "Set-Cookie": cookie });
  }

  if (routeKey === "POST /api/admin/logout") {
    return json({ authenticated: false }, 200, { "Set-Cookie": clearSessionCookie() });
  }

  /* ---- publish ---- */
  const publishMatch = path.match(/^\/api\/admin\/publish\/([a-z]+)$/);
  if (publishMatch && req.method === "POST") {
    const type = publishMatch[1] as RecordType;
    if (!RECORD_TYPES.includes(type)) {
      return err("UNKNOWN_TYPE", `不支持的内容类型：${type}`, 400);
    }
    const payload = await readJson(req);
    const built = buildContentFile(type, payload); // 可能抛 ValidationError
    const put = await putFile(env, built.path, built.content, built.message, { createOnly: true });
    return json({
      success: true,
      type,
      path: put.path,
      commitSha: put.commitSha,
      commitUrl: put.commitUrl,
      htmlPath: built.htmlPath,
      message: `${built.labelZh}已发布，GitHub Actions 正在部署（约 1-2 分钟后可见）。`,
    });
  }

  /* ---- settings ---- */
  const settingsMatch = path.match(/^\/api\/admin\/settings\/([a-z]+)$/);
  if (settingsMatch) {
    const name = settingsMatch[1];
    const target = SETTINGS_FILES[name];
    if (!target) return err("UNKNOWN_SETTINGS", `不支持的设置项：${name}`, 400);

    if (req.method === "GET") {
      const file = await getJsonFile<Record<string, unknown>>(env, target.path);
      if (!file) return err("SETTINGS_NOT_FOUND", `仓库中不存在 ${target.path}。`, 404);
      return json({ name, data: file.data });
    }

    if (req.method === "PUT") {
      const body = await readJson(req);
      const data = body.data;
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return err("MISSING_FIELDS", "请求体需要 { data: {...} }。", 400, { fields: ["data"] });
      }
      // v5.0.2（§11.2）：schema 校验不通过 → 不写 GitHub，直接 400 逐字段报错
      validateSettings(name, data);
      const content = JSON.stringify(data, null, 2) + "\n";
      const put = await putFile(env, target.path, content, `config: 更新${target.label} [via console]`);
      return json({
        success: true,
        type: `settings:${name}`,
        path: put.path,
        commitSha: put.commitSha,
        commitUrl: put.commitUrl,
        message: `${target.label}已更新，部署完成后生效。`,
      });
    }
  }

  /* ---- github sync ---- */
  if (routeKey === "POST /api/admin/github/sync") {
    const generatedAt = new Date().toISOString();
    const rawRepos = await fetchOwnerRepos(env);
    const rawEvents = await fetchOwnerEvents(env);
    const reposJson = buildReposJson(rawRepos, generatedAt);
    const activityJson = buildActivityJson(rawEvents, generatedAt);

    await putFile(
      env,
      "src/data/github/repos.json",
      JSON.stringify(reposJson, null, 2) + "\n",
      "data(github): 同步仓库列表 [via console]",
    );
    const put2 = await putFile(
      env,
      "src/data/github/activity.json",
      JSON.stringify(activityJson, null, 2) + "\n",
      "data(github): 同步动态时间线 [via console]",
    );

    return json({
      success: true,
      type: "github-sync",
      path: "src/data/github/",
      commitSha: put2.commitSha,
      commitUrl: put2.commitUrl,
      message: `已同步 ${reposJson.repos.length} 个仓库、${activityJson.activity.length} 条动态。`,
    });
  }

  /* ---- status ---- */
  if (routeKey === "GET /api/admin/status") {
    // v5.0.2（§11.5）：读取 Actions 状态失败 ≠ 系统失败。
    // token 缺少 Actions: Read 时返回权限提示字段，发布 commit 不受影响。
    let latestRunError: string | null = null;
    const [commit, run, media] = await Promise.all([
      latestCommit(env).catch(() => null),
      latestWorkflowRun(env).catch((e) => {
        latestRunError =
          e instanceof GitHubError && (e.code === "GITHUB_FORBIDDEN" || e.code === "GITHUB_TOKEN_INVALID")
            ? "GitHub token 可能缺少 Actions: Read 权限，无法读取部署状态；发布 commit 不受影响。"
            : "Actions 状态暂时不可读（不影响发布）。";
        return null;
      }),
      loadMediaManifest(env).catch(() => ({ data: { generatedAt: "", items: [] } as MediaManifest })),
    ]);
    return json({
      repo: await repoInfo(env),
      latestCommit: commit,
      latestRun: run,
      ...(latestRunError ? { latestRunError } : {}),
      media: { count: media.data.items.length },
      r2Enabled: Boolean(env.MEDIA_BUCKET && env.R2_PUBLIC_BASE_URL),
    });
  }

  /* ---- media ---- */
  if (routeKey === "GET /api/admin/media") {
    const { data } = await loadMediaManifest(env);
    return json({ items: data.items });
  }

  if (routeKey === "POST /api/admin/media/register") {
    const body = await readJson(req);
    const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
    const label = typeof body.label === "string" ? body.label.trim() : "";
    if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
      return err("MISSING_FIELDS", "需要合法的图片 URL（http/https）。", 400, { fields: ["url"] });
    }
    const { data } = await loadMediaManifest(env);
    if (!data.items.some((it) => it.url === rawUrl)) {
      data.items.unshift({
        url: rawUrl,
        ...(label ? { label } : {}),
        addedAt: new Date().toISOString(),
        source: "url",
      });
    }
    const put = await saveMediaManifest(env, data, "data(media): 登记外链图片 [via console]");
    return json({
      success: true,
      type: "media-register",
      path: put.path,
      commitSha: put.commitSha,
      commitUrl: put.commitUrl,
      message: "已登记到媒体清单。",
    });
  }

  if (routeKey === "POST /api/admin/media/remove") {
    const body = await readJson(req);
    const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
    if (!rawUrl) {
      return err("MISSING_FIELDS", "需要要移除的图片 URL。", 400, { fields: ["url"] });
    }
    const { data } = await loadMediaManifest(env);
    const before = data.items.length;
    data.items = data.items.filter((it) => it.url !== rawUrl);
    if (data.items.length === before) {
      return err("MEDIA_NOT_FOUND", "媒体清单中不存在该 URL。", 404);
    }
    const put = await saveMediaManifest(env, data, "data(media): 移除媒体项 [via console]");
    return json({
      success: true,
      type: "media-remove",
      path: put.path,
      commitSha: put.commitSha,
      commitUrl: put.commitUrl,
      message: "已从媒体清单移除（不会删除远端图片文件本身）。",
    });
  }

  if (routeKey === "POST /api/admin/media/upload") {
    if (!env.MEDIA_BUCKET || !env.R2_PUBLIC_BASE_URL) {
      return err("R2_NOT_CONFIGURED", "未配置 R2 媒体桶，请先用「URL 登记」方式。", 501);
    }
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") {
      return err("MISSING_FIELDS", "缺少文件字段 file。", 400, { fields: ["file"] });
    }
    const f = file as File;
    if (f.size > 8 * 1024 * 1024) {
      return err("FILE_TOO_LARGE", "文件超过 8MB 上限。", 413);
    }
    const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
    const stamp = new Date().toISOString().slice(0, 10);
    const key = `uploads/${stamp}/${crypto.randomUUID()}.${ext}`;
    await env.MEDIA_BUCKET.put(key, f.stream(), {
      httpMetadata: { contentType: f.type || "application/octet-stream" },
    });
    const publicUrl = `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;

    const { data } = await loadMediaManifest(env);
    data.items.unshift({
      url: publicUrl,
      label: f.name,
      addedAt: new Date().toISOString(),
      source: "upload",
    });
    const put = await saveMediaManifest(env, data, "data(media): 上传图片到 R2 [via console]");
    return json({
      success: true,
      type: "media-upload",
      path: put.path,
      commitSha: put.commitSha,
      commitUrl: put.commitUrl,
      url: publicUrl,
      message: "已上传并登记。",
    });
  }

  return err("NOT_FOUND", "未知路径或方法。", 404);
}

/* ---------------- 入口 ---------------- */

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(env, req);

    /* CORS 预检 */
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    try {
      const res = await handle(req, env);
      return withCors(res, cors);
    } catch (e) {
      if (e instanceof ValidationError) {
        return withCors(err(e.code, e.message, 400, { fields: e.fields }), cors);
      }
      if (e instanceof SettingsValidationError) {
        return withCors(err(e.code, e.message, 400, { fields: e.fields }), cors);
      }
      if (e instanceof GitHubError) {
        return withCors(err(e.code, e.message, e.status), cors);
      }
      console.error("[admin-api] unhandled:", e);
      return withCors(err("INTERNAL", "服务器内部错误。", 500), cors);
    }
  },
};
