/**
 * GitHub 数据类型（预留）。
 * 第一版仅用于 mock；未来接 GitHub GraphQL / REST 时复用同一批类型，
 * 让页面层无需改动。
 */

export interface GitHubRepo {
  owner: string;
  repo: string;
  description: string;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  lastCommitAt: string; // ISO
  topics: string[];
}

export type GitHubEventType =
  | "commit"
  | "issue"
  | "pull_request"
  | "release"
  | "star";

export interface GitHubActivity {
  id: string;
  type: GitHubEventType;
  repo: string;
  title: string;
  createdAt: string; // ISO
  url?: string;
}

export interface GitHubProfileStats {
  login: string;
  publicRepos: number;
  followers: number;
  contributionsLastYear: number;
  updatedAt: string; // ISO
}

export interface GitHubSnapshot {
  profile: GitHubProfileStats;
  repos: GitHubRepo[];
  activity: GitHubActivity[];
}
