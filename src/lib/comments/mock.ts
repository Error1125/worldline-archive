import type { Comment } from "./types";

/**
 * 评论 mock。第一版评论功能关闭，这里仅保留一两条示例，
 * 方便未来 UI 联调时有数据可看。
 */
export const mockComments: Comment[] = [
  {
    id: "cmt_01",
    targetType: "post",
    targetId: "welcome-to-the-archive",
    authorName: "路过的旅人",
    body: "这个存档点的气质很对，收藏了。",
    createdAt: "2025-06-15T10:00:00.000Z",
    approved: true,
  },
];
