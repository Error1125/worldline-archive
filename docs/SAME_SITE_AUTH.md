# v5.4.1 Hotfix-02 —— 同站（same-site）认证部署指南

> 解决：iPhone Safari 默认开启「防止跨网站追踪」时无法登录控制台。

## 1. 问题回顾

当前部署结构：

```text
前端：https://error1125.github.io/worldline-archive   （GitHub Pages）
后台：https://worldline-admin-api.error1125.workers.dev（Cloudflare Worker）
```

`github.io` 与 `workers.dev` 属于**不同站点**。Worker 签发的 session cookie
（`SameSite=None`）在 Safari 默认隐私策略下被当作第三方 Cookie 拦截，于是出现：

1. 登录接口返回成功；
2. 紧接着 `/api/admin/session` 却返回未认证；
3. 页面提示「登录成功但浏览器未保存会话」。

## 2. 正式修复：同站部署

让前端与 API 属于**同一注册域名**，cookie 变为第一方 Cookie，
`SameSite=Lax` 即可在所有浏览器默认设置下工作。两种结构任选其一：

| 方案 | 前端 | API | 前端 `PUBLIC_ADMIN_API_BASE` |
| --- | --- | --- | --- |
| A（推荐） | `archive.example.com` | `api.example.com` | `https://api.example.com` |
| B | `archive.example.com` | `archive.example.com/api/*` | `/` |

## 3. 操作步骤

### 3.1 GitHub Pages 绑定自定义域名

1. 域名 DNS 添加记录：`archive` → CNAME → `error1125.github.io`；
2. 仓库 **Settings → Pages → Custom domain** 填 `archive.example.com`，
   勾选 **Enforce HTTPS**（GitHub 会自动在部署产物写入 CNAME）。

> Astro 侧记得同步 `site` 配置（`astro.config.mjs`），否则 OG/绝对链接仍指向 github.io。

### 3.2 Worker 绑定同域 API

编辑 `worker/wrangler.toml`（文件内已留好注释模板）：

- 方案 A：启用
  ```toml
  [[routes]]
  pattern = "api.example.com"
  custom_domain = true
  ```
- 方案 B：启用
  ```toml
  [[routes]]
  pattern = "archive.example.com/api/*"
  zone_name = "example.com"
  ```
  （方案 B 要求该域名的 DNS 托管在 Cloudflare，且 `archive` 记录开启橙云代理。）

### 3.3 更新 Worker vars 并重新部署

```toml
ALLOWED_ORIGIN = "https://archive.example.com"
COOKIE_SAME_SITE = "Lax"
```

```powershell
cd worker
npx wrangler deploy
```

`COOKIE_SAME_SITE` 未配置时默认仍为 `None`，**不改配置不影响现有跨站部署**。

### 3.4 更新前端 API base 并重建

GitHub Actions（或本地 `.env`）注入：

```text
方案 A：PUBLIC_ADMIN_API_BASE=https://api.example.com
方案 B：PUBLIC_ADMIN_API_BASE=/
```

登录页「高级设置」里手填同样支持这两种写法（`/` 即同站路由）。

### 3.5 Cookie 属性核对

登录响应的 `Set-Cookie` 应为：

```http
wl_admin_session=…; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
```

预检 / 正式响应应包含：

```http
Access-Control-Allow-Origin: https://archive.example.com
Access-Control-Allow-Credentials: true
Vary: Origin
```

> 方案 B（同源）下浏览器可能根本不发预检 —— 属正常现象。

### 3.6 诊断工具

`GET {API_BASE}/api/health` 现在会回报（不含任何密钥值）：

- `config.cookieSameSite`：当前生效的 SameSite；
- `config.allowedOrigins`：CORS 白名单条数；
- `requestOrigin / requestOriginAllowed`：本次请求 Origin 是否被放行。

登录页「健康检查」按钮走的就是这个端点。

## 4. 验收标准（对应 Hotfix 计划 §2.5）

- iPhone Safari 默认开启「防止跨网站追踪」时可登录；
- 登录后立即进入控制台；刷新当前 Admin 页面仍保持登录；
- Sidebar 内部导航不丢 Session；Settings / Content / Publish 请求正常；
- 登出后 Session 正确失效（清除 cookie 的 SameSite 与签发一致）;
- 桌面 Chrome / Edge / Safari 不回归；
- 全程不要求用户修改系统隐私设置，管理员 Token 不进 `localStorage`。
