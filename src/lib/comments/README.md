# lib/comments

评论系统的**预留模块**。第一版 `features.comments = false`，`getThread` 返回空线程。

## 现状

- `types.ts` —— 评论 / 评论线程类型。
- `mock.ts` —— 一条示例评论，供未来 UI 联调。
- `service.ts` —— 关闭时返回空数组；`submitComment` 抛「尚未接入」。

## 未来怎么接真实服务

1. 打开 `src/config/features.ts` 的 `comments: true`。
2. 用 **Supabase**（Postgres）存评论，开启 Row Level Security：
   - 任何人可读 `approved = true` 的评论；
   - 仅登录访客可插入（默认 `approved = false`）；
   - 仅站长可更新 `approved`。
3. 评论提交前要求访客登录（见 `lib/auth`）。
4. 站长在 `/admin` 审核 / 删除。
5. 加基础反垃圾：频率限制、关键词过滤、可选人机验证。
