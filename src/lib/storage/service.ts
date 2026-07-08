import type { StoredAsset, UploadResult } from "./types";
import { mockAssets } from "./mock";

/**
 * Storage service（预留）。第一版返回本地 mock 图片路径，不做真实上传。
 *
 * TODO(未来接真实服务)：
 * - 用 Supabase Storage（或 S3 / R2）存照片与附件；
 * - 上传走服务端签名 URL，避免暴露密钥；
 * - 生成缩略图 / 响应式尺寸；
 * - 上传前剥离 EXIF / 地理信息（隐私）。
 */

export async function listAssets(): Promise<StoredAsset[]> {
  return mockAssets;
}

export async function getAsset(id: string): Promise<StoredAsset | null> {
  return mockAssets.find((a) => a.id === id) ?? null;
}

export async function uploadAsset(_file: unknown): Promise<UploadResult> {
  // TODO: 换成 Supabase Storage 上传
  return { ok: false, error: "存储上传尚未接入：第一版为预留占位。" };
}
