/**
 * 功能开关 —— V1 只开启 GitHub 静态数据展示，其余为未来预留。
 * Feature flags. V1 only exposes static GitHub data; the rest are reserved.
 */
export const features = {
  auth: false,
  comments: false,
  onlineEditor: false,
  appleMusic: false,
  githubSync: true,
  privatePosts: false,
  pagefindSearch: false,
} as const;

export type FeatureFlags = typeof features;
