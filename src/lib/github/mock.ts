import type {
  GitHubActivity,
  GitHubProfileStats,
  GitHubRepo,
  GitHubSnapshot,
} from "./types";

/**
 * GitHub mock 謨ｰ謐ｮ縲・ * 荳・src/data/github/*.json 菫晄戟蜷梧ｺ千炊蠢ｵ・夂ｬｬ荳迚育峩謗･莉手ｿ咎㈹隸ｻ・・ * 譛ｪ譚･逕ｱ scripts/sync-github.ts 逕滓・逵溷ｮ・JSON 蜷主・蛻・困謨ｰ謐ｮ貅舌・ */

export const mockRepos: GitHubRepo[] = [
  {
    owner: "traveler-dev",
    repo: "worldline-archive",
    description: "荳ｪ莠ｺ蠑ゆｸ也阜蟄俶｡｣轤ｹ 窶披・逕ｨ Astro 隶ｰ蠖慕函豢ｻ縲∫分蜑ｧ縲・浹荵舌・｡ｹ逶ｮ荳・Bug縲・,
    url: "https://github.com/your-name/worldline-archive",
    language: "Astro",
    stars: 128,
    forks: 9,
    lastCommitAt: "2025-06-28T21:14:00.000Z",
    topics: ["astro", "personal-site", "cyber", "archive"],
  },
  {
    owner: "traveler-dev",
    repo: "bug-battle-log",
    description: "謚頑ｯ丈ｸ谺｡蜥・Bug 逧・・譁怜・謌仙､咲尨逧・ｰ丞ｷ･蜈ｷ縲・,
    url: "https://github.com/traveler-dev/bug-battle-log",
    language: "TypeScript",
    stars: 64,
    forks: 5,
    lastCommitAt: "2025-06-20T15:02:00.000Z",
    topics: ["cli", "logging", "postmortem"],
  },
  {
    owner: "traveler-dev",
    repo: "anime-memory-shelf",
    description: "逡ｪ蜑ｧ隗よｵ玖ｮｰ蠖慕噪謨ｰ謐ｮ讓｡蝙句ｮ樣ｪ後・,
    url: "https://github.com/traveler-dev/anime-memory-shelf",
    language: "TypeScript",
    stars: 37,
    forks: 2,
    lastCommitAt: "2025-05-30T08:41:00.000Z",
    topics: ["anime", "schema", "experiment"],
  },
];

export const mockActivity: GitHubActivity[] = [
  {
    id: "evt_001",
    type: "commit",
    repo: "your-name/worldline-archive",
    title: "feat: 譏溽ｩｺ隗・ｷｮ + 蠑ｹ蟷募ｱる㍾譫・,
    createdAt: "2025-06-28T21:14:00.000Z",
    url: "https://github.com/your-name/worldline-archive",
  },
  {
    id: "evt_002",
    type: "issue",
    repo: "your-name/worldline-archive",
    title: "遘ｻ蜉ｨ遶ｯ蠎暮Κ TabBar 驕ｮ謖｡豁｣譁・,
    createdAt: "2025-06-27T12:03:00.000Z",
  },
  {
    id: "evt_003",
    type: "pull_request",
    repo: "traveler-dev/bug-battle-log",
    title: "驥肴桷螟咲尨蟇ｼ蜃ｺ荳ｺ Markdown",
    createdAt: "2025-06-24T19:20:00.000Z",
  },
  {
    id: "evt_004",
    type: "release",
    repo: "traveler-dev/bug-battle-log",
    title: "v0.3.0 窶披・謾ｯ謖∝・閨秘｡ｹ逶ｮ",
    createdAt: "2025-06-20T15:02:00.000Z",
  },
  {
    id: "evt_005",
    type: "commit",
    repo: "traveler-dev/anime-memory-shelf",
    title: "chore: 陦･蜈・ｧよｵ玖ｮｰ蠖・seed 謨ｰ謐ｮ",
    createdAt: "2025-05-30T08:41:00.000Z",
  },
];

export const mockProfile: GitHubProfileStats = {
  login: "traveler-dev",
  publicRepos: 24,
  followers: 312,
  contributionsLastYear: 1487,
  updatedAt: "2025-06-28T21:20:00.000Z",
};

export const mockSnapshot: GitHubSnapshot = {
  profile: mockProfile,
  repos: mockRepos,
  activity: mockActivity,
};
