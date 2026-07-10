import reposData from "@/data/github/repos.json";
import activityData from "@/data/github/activity.json";
import profileData from "@/data/github/profile.json";
import contributionsData from "@/data/github/contributions.json";
import type { GitHubActivity, GitHubRepo } from "./types";

/**
 * 构建期 GitHub 快照读取器。网络同步由 Worker 或 scripts/sync-github.ts 完成；
 * 页面只读最后一次成功缓存，因此 GitHub API 故障不会让静态站崩溃。
 */
export function getRepos(): GitHubRepo[] {
  return (reposData.repos ?? []) as GitHubRepo[];
}

export function getRecentActivity(): GitHubActivity[] {
  return (activityData.activity ?? []) as GitHubActivity[];
}

export function getProfileSnapshot() {
  return profileData;
}

export function getContributionSnapshot() {
  return contributionsData;
}
