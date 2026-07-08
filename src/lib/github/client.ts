import type { GitHubActivity, GitHubRepo, GitHubSnapshot } from "./types";
import { mockActivity, mockRepos, mockSnapshot } from "./mock";

/**
 * GitHub client（预留）。
 *
 * 第一版全部返回 mock，同步为异步签名，方便未来直接替换成真实网络请求
 * 而不影响调用方。
 *
 * TODO(未来接真实服务)：
 * - 使用 GitHub GraphQL API 拉 repository / 贡献图；
 * - 使用 GitHub REST API 拉 commits / issues / pull requests；
 * - 用环境变量注入 token（GITHUB_TOKEN），切勿写死；
 * - 建议由 scripts/sync-github.ts 定时生成静态 JSON，页面只读 JSON。
 */

export interface GitHubClientOptions {
  token?: string;
  login?: string;
}

export async function getRepos(_opts?: GitHubClientOptions): Promise<GitHubRepo[]> {
  // TODO: 换成 GraphQL 查询用户仓库
  return mockRepos;
}

export async function getRecentActivity(
  _opts?: GitHubClientOptions,
): Promise<GitHubActivity[]> {
  // TODO: 换成 REST /users/{login}/events
  return mockActivity;
}

export async function getSnapshot(
  _opts?: GitHubClientOptions,
): Promise<GitHubSnapshot> {
  // TODO: 组合 profile + repos + activity 的真实数据
  return mockSnapshot;
}
