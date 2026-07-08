/**
 * 评论类型（预留）。第一版返回空数组 / mock。
 */

export interface Comment {
  id: string;
  targetType: "post" | "moment" | "bug" | "project";
  targetId: string;
  authorName: string;
  authorAvatar?: string;
  body: string;
  createdAt: string; // ISO
  approved: boolean;
}

export interface CommentThread {
  targetType: Comment["targetType"];
  targetId: string;
  comments: Comment[];
  count: number;
}
