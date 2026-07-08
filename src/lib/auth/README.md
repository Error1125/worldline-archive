# lib/auth

登录 / 权限的**预留模块**。第一版不实现真实登录，`provider.ts` 永远返回未登录。

## 现状

- `types.ts` —— 用户 / 会话 / 角色（`owner` | `visitor`）类型。
- `mock.ts` —— 未登录状态与示例站长用户。
- `provider.ts` —— `getAuthState()` 返回未登录；登录函数抛「尚未接入」。

入口页面：`/login`（占位）、`/admin`（占位，受 `features.auth` 控制是否展示入口）。

## 未来怎么接真实服务

1. **方案优先级**：Supabase Auth（邮箱魔法链接） > GitHub OAuth。
2. **权限模型**：
   - 仅站长本人（`owner`）可进入 `/admin` 做在线发布 / 评论管理；
   - 访客（`visitor`）登录只用于评论 / 点赞。
3. **安全**：会话写 httpOnly cookie；服务端密钥放环境变量，前端不出现任何密钥。
4. 打开 `src/config/features.ts` 里的 `auth: true` 后，Footer / About 的低调入口才展示。
