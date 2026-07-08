import { features } from "@/config/features";

/**
 * 共享的可见性判断，供页面 getStaticPaths 直接过滤 getCollection 使用
 * （与 lib/content.ts 内部逻辑保持一致）。
 * 第一版只放行 public；未来登录后可通过 features.privatePosts 放行 hidden / private。
 */
export function isVisiblePublic(v: "public" | "hidden" | "private"): boolean {
  if (v === "public") return true;
  return features.privatePosts ? v !== "private" : false;
}
