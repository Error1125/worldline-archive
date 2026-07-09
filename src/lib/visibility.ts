import { features } from "@/config/features";

/** 与 content schema 的 visibility 枚举保持同步 */
export type Visibility = "public" | "hidden" | "private" | "unlisted";

/**
 * 共享的可见性判断，供页面 getStaticPaths 直接过滤 getCollection 使用
 * （与 lib/content.ts 内部逻辑保持一致）。
 * - public：正常展示；
 * - unlisted：不进列表，但详情页照常生成（发布 API 支持的「不列出」态）；
 * - hidden / private：默认不放行；未来登录后可通过 features.privatePosts 放行 hidden。
 */
export function isVisiblePublic(v: Visibility): boolean {
  if (v === "public" || v === "unlisted") return true;
  return features.privatePosts ? v !== "private" : false;
}

/** 列表页专用：unlisted 不进列表 */
export function isListedPublic(v: Visibility): boolean {
  return v === "public" || (features.privatePosts && v === "hidden");
}
