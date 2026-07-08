/**
 * 存储类型（预留）。第一版返回本地 mock 图片路径。
 */

export interface StoredAsset {
  id: string;
  /** 第一版指向 /public 下的本地占位 SVG */
  url: string;
  kind: "image" | "file";
  width?: number;
  height?: number;
  createdAt: string; // ISO
}

export interface UploadResult {
  ok: boolean;
  asset?: StoredAsset;
  error?: string;
}
