/**
 * GitHub API 封装（v5.0）—— 只在 Worker 侧使用，token 永不出后端。
 *
 * - putFile：Contents API 创建 / 更新文件（自动带旧 sha）；
 *   createOnly 模式下如文件已存在 → 抛 SLUG_CONFLICT。
 * - getFile / getJsonFile：读文件（base64 解码，正确处理 UTF-8）。
 * - repoInfo / latestCommit / latestWorkflowRun：Dashboard 状态。
 */

export interface GitHubEnvLike {
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  GITHUB_COMMITTER_NAME?: string;
  GITHUB_COMMITTER_EMAIL?: string;
}

export class GitHubError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const API = "https://api.github.com";

function headers(env: GitHubEnvLike): Record<string, string> {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "worldline-archive-admin-worker",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function gh(env: GitHubEnvLike, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers(env), ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    throw new GitHubError("GITHUB_TOKEN_INVALID", "GitHub token 无效或已过期。", 502);
  }
  if (res.status === 403) {
    const body = await res.text();
    const msg = body.includes("rate limit")
      ? "GitHub API 触发限流，请稍后重试。"
      : "GitHub token 权限不足（需要 repo contents 写权限）。";
    throw new GitHubError("GITHUB_FORBIDDEN", msg, 502);
  }
  return res;
}

/* ------------ base64（UTF-8 安全） ------------ */

export function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function fromBase64Utf8(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* ------------ contents ------------ */

export interface FileMeta {
  sha: string;
  content: string; // 已解码文本
}

export async function getFile(env: GitHubEnvLike, path: string): Promise<FileMeta | null> {
  const res = await gh(
    env,
    `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${env.GITHUB_BRANCH}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError("GITHUB_READ_FAILED", `读取 ${path} 失败（${res.status}）。`, 502);
  const data = (await res.json()) as { sha: string; content: string; encoding: string };
  return { sha: data.sha, content: fromBase64Utf8(data.content) };
}

export async function getJsonFile<T = unknown>(env: GitHubEnvLike, path: string): Promise<{ sha: string; data: T } | null> {
  const f = await getFile(env, path);
  if (!f) return null;
  try {
    return { sha: f.sha, data: JSON.parse(f.content) as T };
  } catch {
    throw new GitHubError("GITHUB_JSON_INVALID", `${path} 不是合法 JSON。`, 502);
  }
}

export interface PutResult {
  path: string;
  commitSha: string;
  commitUrl: string;
}

export async function putFile(
  env: GitHubEnvLike,
  path: string,
  content: string,
  message: string,
  opts: { createOnly?: boolean } = {},
): Promise<PutResult> {
  // 分支存在性 / 文件现状检查
  let sha: string | undefined;
  const existing = await getFile(env, path).catch((e) => {
    throw e;
  });
  if (existing) {
    if (opts.createOnly) {
      throw new GitHubError(
        "SLUG_CONFLICT",
        `文件已存在：${path}。换一个 slug 或标题再发布。`,
        409,
      );
    }
    sha = existing.sha;
  }

  const body: Record<string, unknown> = {
    message,
    content: toBase64Utf8(content),
    branch: env.GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;
  if (env.GITHUB_COMMITTER_NAME && env.GITHUB_COMMITTER_EMAIL) {
    body.committer = { name: env.GITHUB_COMMITTER_NAME, email: env.GITHUB_COMMITTER_EMAIL };
  }

  const res = await gh(
    env,
    `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
    { method: "PUT", body: JSON.stringify(body) },
  );

  if (res.status === 409) {
    throw new GitHubError("GITHUB_CONFLICT", "提交冲突（sha 过期或并发写入），请重试。", 409);
  }
  if (res.status === 404) {
    throw new GitHubError(
      "BRANCH_NOT_FOUND",
      `仓库或分支不存在：${env.GITHUB_OWNER}/${env.GITHUB_REPO}@${env.GITHUB_BRANCH}。检查 Worker 环境变量。`,
      502,
    );
  }
  if (res.status === 422) {
    const detail = await res.text();
    throw new GitHubError("GITHUB_UNPROCESSABLE", `GitHub 拒绝提交：${detail.slice(0, 160)}`, 502);
  }
  if (!res.ok) {
    throw new GitHubError("GITHUB_WRITE_FAILED", `提交失败（HTTP ${res.status}）。`, 502);
  }
  const data = (await res.json()) as { commit: { sha: string; html_url: string } };
  return { path, commitSha: data.commit.sha, commitUrl: data.commit.html_url };
}

/* ------------ status ------------ */

export async function repoInfo(env: GitHubEnvLike) {
  return {
    owner: env.GITHUB_OWNER,
    name: env.GITHUB_REPO,
    branch: env.GITHUB_BRANCH,
    url: `https://github.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
  };
}

export async function latestCommit(env: GitHubEnvLike) {
  const res = await gh(
    env,
    `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/commits?sha=${env.GITHUB_BRANCH}&per_page=1`,
  );
  if (!res.ok) return null;
  const arr = (await res.json()) as any[];
  const c = arr[0];
  if (!c) return null;
  return {
    sha: c.sha as string,
    message: (c.commit?.message ?? "") as string,
    date: (c.commit?.committer?.date ?? "") as string,
    url: c.html_url as string,
  };
}

export async function latestWorkflowRun(env: GitHubEnvLike) {
  const res = await gh(
    env,
    `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/runs?branch=${env.GITHUB_BRANCH}&per_page=1`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { workflow_runs?: any[] };
  const r = data.workflow_runs?.[0];
  if (!r) return null;
  return {
    status: r.status as string,
    conclusion: (r.conclusion ?? null) as string | null,
    createdAt: r.created_at as string,
    url: r.html_url as string,
    headSha: r.head_sha as string,
  };
}

/* ------------ github data sync（供 /api/admin/github/sync） ------------ */

export async function fetchOwnerRepos(env: GitHubEnvLike) {
  const res = await gh(env, `/users/${env.GITHUB_OWNER}/repos?sort=updated&per_page=12&type=owner`);
  if (!res.ok) throw new GitHubError("GITHUB_SYNC_FAILED", "拉取仓库列表失败。", 502);
  return (await res.json()) as any[];
}

export async function fetchOwnerEvents(env: GitHubEnvLike) {
  const res = await gh(env, `/users/${env.GITHUB_OWNER}/events/public?per_page=30`);
  if (!res.ok) return [];
  return (await res.json()) as any[];
}

export async function fetchOwnerProfile(env: GitHubEnvLike) {
  const res = await gh(env, `/users/${env.GITHUB_OWNER}`);
  if (!res.ok) throw new GitHubError("GITHUB_SYNC_FAILED", "拉取 GitHub Profile 失败。", 502);
  return (await res.json()) as any;
}

export async function fetchContributionCalendar(env: GitHubEnvLike) {
  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount color } }
        }
      }
    }
  }`;
  const res = await gh(env, "/graphql", {
    method: "POST",
    body: JSON.stringify({ query, variables: { login: env.GITHUB_OWNER } }),
  });
  if (!res.ok) throw new GitHubError("GITHUB_CONTRIBUTIONS_FAILED", "拉取 GitHub Contributions 失败。", 502);
  const data = (await res.json()) as any;
  if (data.errors?.length) {
    throw new GitHubError("GITHUB_CONTRIBUTIONS_FAILED", data.errors[0]?.message ?? "GraphQL 查询失败。", 502);
  }
  return data.data?.user?.contributionsCollection?.contributionCalendar ?? null;
}
