/**
 * scripts/sync-github.ts
 *
 * GitHub 数据同步脚本（v5：真实 API 版）。
 * 运行：`pnpm sync:github`
 *
 * 行为：
 * - 用 GitHub REST API 拉取 GITHUB_USER 的仓库列表与公开动态，
 *   生成 src/data/github/{repos,activity}.json（形状与页面层约定一致）。
 * - GITHUB_TOKEN 可选：无 token 走匿名请求（限流 60 次/时，个人站足够）。
 * - 任一环节失败：保留现有 JSON、打印警告、以 0 退出——绝不中断构建。
 *
 * 与控制台的关系：/api/admin/github/sync（Worker 端）做同一件事并直接
 * commit 回仓库；本脚本供本地 / CI 定时刷新使用，两者可并存。
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GitHubActivity, GitHubRepo } from "../src/lib/github/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../src/data/github");

const USER = process.env.GITHUB_USER || "Error1125";
const TOKEN = process.env.GITHUB_TOKEN || "";
const API = "https://api.github.com";

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "worldline-archive-sync",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub API ${path} -> HTTP ${res.status}`);
  return (await res.json()) as T;
}

/* ---------- 组装（与 worker/src/index.ts 的形状保持一致） ---------- */

function toRepos(raw: any[]): GitHubRepo[] {
  return raw
    .filter((r) => !r.fork)
    .slice(0, 8)
    .map((r) => ({
      owner: r.owner?.login ?? USER,
      repo: r.name ?? "",
      description: r.description ?? "",
      url: r.html_url ?? "",
      language: r.language ?? null,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      lastCommitAt: r.pushed_at ?? r.updated_at ?? new Date().toISOString(),
      topics: Array.isArray(r.topics) ? r.topics : [],
    }));
}

function toActivity(raw: any[]): GitHubActivity[] {
  const out: GitHubActivity[] = [];
  for (const ev of raw) {
    if (out.length >= 12) break;
    const repo: string = ev.repo?.name ?? "";
    const createdAt: string = ev.created_at ?? new Date().toISOString();
    const id = `evt_${ev.id ?? out.length}`;
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
        out.push({ id, type: "issue", repo, title: ev.payload?.issue?.title ?? "issue", createdAt, url: ev.payload?.issue?.html_url });
        break;
      case "PullRequestEvent":
        out.push({ id, type: "pull_request", repo, title: ev.payload?.pull_request?.title ?? "pull request", createdAt, url: ev.payload?.pull_request?.html_url });
        break;
      case "ReleaseEvent":
        out.push({ id, type: "release", repo, title: ev.payload?.release?.name ?? ev.payload?.release?.tag_name ?? "release", createdAt, url: ev.payload?.release?.html_url });
        break;
      case "WatchEvent":
        out.push({ id, type: "star", repo, title: `Starred ${repo}`, createdAt, url: `https://github.com/${repo}` });
        break;
      default:
        break;
    }
  }
  return out;
}

/* ---------- 主流程 ---------- */

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(dataDir, { recursive: true });
  const now = new Date().toISOString();

  const [rawRepos, rawEvents] = await Promise.all([
    getJson<any[]>(`/users/${USER}/repos?sort=updated&per_page=12&type=owner`),
    getJson<any[]>(`/users/${USER}/events/public?per_page=30`).catch(() => [] as any[]),
  ]);
  const rawProfile = await getJson<any>(`/users/${USER}`);
  let contributionCalendar: any = null;
  if (TOKEN) {
    const query = `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount color } } } } } }`;
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { login: USER } }),
    });
    if (response.ok) {
      const json = await response.json() as any;
      contributionCalendar = json.data?.user?.contributionsCollection?.contributionCalendar ?? null;
    }
  }

  const reposPayload = {
    _note: "由 scripts/sync-github.ts 生成（真实 GitHub 数据）。",
    generatedAt: now,
    repos: toRepos(rawRepos),
  };
  const activityPayload = {
    _note: "由 scripts/sync-github.ts 生成（真实 GitHub 数据）。",
    generatedAt: now,
    activity: toActivity(rawEvents),
  };

  await writeFile(resolve(dataDir, "repos.json"), JSON.stringify(reposPayload, null, 2) + "\n", "utf8");
  await writeFile(resolve(dataDir, "activity.json"), JSON.stringify(activityPayload, null, 2) + "\n", "utf8");
  await writeFile(resolve(dataDir, "profile.json"), JSON.stringify({
    generatedAt: now,
    profile: {
      login: rawProfile.login, avatarUrl: rawProfile.avatar_url, name: rawProfile.name,
      bio: rawProfile.bio, url: rawProfile.html_url, publicRepos: rawProfile.public_repos,
      followers: rawProfile.followers, following: rawProfile.following, location: rawProfile.location,
      blog: rawProfile.blog, company: rawProfile.company,
    },
  }, null, 2) + "\n", "utf8");
  await writeFile(resolve(dataDir, "contributions.json"), JSON.stringify({
    generatedAt: now,
    available: Boolean(contributionCalendar),
    ...(contributionCalendar ? { calendar: contributionCalendar } : { reason: "GitHub contributions sync unavailable (GITHUB_TOKEN required)" }),
  }, null, 2) + "\n", "utf8");

  console.log(`[sync-github] OK：${reposPayload.repos.length} 个仓库、${activityPayload.activity.length} 条动态（用户：${USER}${TOKEN ? "，带 token" : "，匿名"}）。`);
}

main().catch(async (err) => {
  const kept =
    (await fileExists(resolve(dataDir, "repos.json"))) &&
    (await fileExists(resolve(dataDir, "activity.json"))) &&
    (await fileExists(resolve(dataDir, "profile.json"))) &&
    (await fileExists(resolve(dataDir, "contributions.json")));
  console.warn(`[sync-github] 拉取失败：${err instanceof Error ? err.message : err}`);
  console.warn(kept
    ? "[sync-github] 已保留现有 JSON，构建继续。"
    : "[sync-github] 警告：本地没有现有 JSON，页面将缺少 GitHub 数据。");
  process.exitCode = 0; // 永不阻断构建；让 Windows 上的 fetch handles 自然关闭
});
