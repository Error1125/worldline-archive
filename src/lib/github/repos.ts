import snapshots from "@/data/github/repos.json";

export interface RepoSnapshot {
  owner: string;
  repo: string;
  description?: string;
  url: string;
  language?: string | null;
  stars: number;
  forks: number;
  lastCommitAt?: string;
  topics?: string[];
}

export function getRepoSnapshot(github?: { owner: string; repo: string }): RepoSnapshot | undefined {
  if (!github) return undefined;
  return (snapshots.repos as RepoSnapshot[]).find(
    (item) => item.owner.toLowerCase() === github.owner.toLowerCase() && item.repo.toLowerCase() === github.repo.toLowerCase(),
  );
}
