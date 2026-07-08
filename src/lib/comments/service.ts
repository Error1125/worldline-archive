import type { Comment, CommentThread } from "./types";
import { mockComments } from "./mock";
import { features } from "@/config/features";

/**
 * 评论 service（预留）。
 * features.comments 关闭时返回空线程；打开时（未来）返回真实数据。
 *
 * TODO(未来接真实服务)：
 * - 用 Supabase（Postgres + Row Level Security）存评论；
 * - 访客需登录后评论（见 lib/auth）；
 * - 站长在 /admin 审核（approved 字段）；
 * - 加基础反垃圾（频率限制 / 关键词）。
 */

export async function getThread(
  targetType: Comment["targetType"],
  targetId: string,
): Promise<CommentThread> {
  if (!features.comments) {
    return { targetType, targetId, comments: [], count: 0 };
  }
  const comments = mockComments.filter(
    (c) => c.targetType === targetType && c.targetId === targetId && c.approved,
  );
  return { targetType, targetId, comments, count: comments.length };
}

export async function submitComment(
  _input: Omit<Comment, "id" | "createdAt" | "approved">,
): Promise<never> {
  throw new Error("评论功能尚未接入：第一版为预留占位。");
}
