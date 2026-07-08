# lib/storage

图片 / 附件存储的**预留模块**。第一版返回本地占位 SVG 路径，不做真实上传。

## 现状

- `types.ts` —— 资源 / 上传结果类型。
- `mock.ts` —— 指向 `/public/images/photos/*.svg` 的本地占位资源。
- `service.ts` —— `listAssets` 返回 mock；`uploadAsset` 返回未接入。

## 未来怎么接真实服务

1. 用 **Supabase Storage**（或 S3 / Cloudflare R2）作为对象存储。
2. 上传通过**服务端签名 URL**完成，前端不接触密钥。
3. 上传后生成缩略图 / 多档响应式尺寸，页面用 `srcset`。
4. **隐私**：上传前在服务端剥离 EXIF / GPS 信息（与第一版「不暴露地理信息」的原则一致）。
5. `/admin` 接入后，照片可在线上传并写入 `photos` 集合或数据库。
