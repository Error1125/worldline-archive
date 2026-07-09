# Worldline Admin API（Cloudflare Worker）

控制台后端。负责登录会话、内容发布（commit 到 GitHub 触发 Actions 部署）、
站点设置读写、GitHub 数据同步、媒体清单管理。

**GitHub token 只存在于 Worker secrets，永远不会进入前端或仓库。**

## 一、准备

1. Cloudflare 账号（免费版即可）。
2. GitHub Fine-grained Personal Access Token：
   - Settings → Developer settings → Fine-grained tokens → Generate new token
   - Repository access：**Only select repositories → `Error1125/worldline-archive`**
   - Permissions：**Contents → Read and write**（其余全部不勾）
   - 有效期按需（到期后重新 `secret put` 即可）

## 二、部署（首次约 5 分钟）

```bash
cd worker
npm install
npx wrangler login          # 浏览器授权 Cloudflare

# 注入三个 secret（逐条执行，按提示粘贴值）
npx wrangler secret put ADMIN_SECRET     # 你的控制台登录口令
npx wrangler secret put SESSION_SECRET   # 随机 32+ 字符，如 openssl rand -hex 32
npx wrangler secret put GITHUB_TOKEN     # 上一步生成的 PAT

npx wrangler deploy
```

部署成功后输出形如 `https://worldline-admin-api.<你的子域>.workers.dev` 的地址——
这就是控制台登录页要填的「后端 API 地址」。

验证存活：浏览器打开 `https://…workers.dev/api/health`，应返回 `{"ok":true,…}`。

## 三、接通前端

两种方式任选（登录页填写的地址会存 localStorage，优先级最高）：

1. **零配置**：直接在 `/admin/login` 页面的「后端 API 地址」输入框填 Worker 地址。
2. **构建期注入**：GitHub 仓库 → Settings → Secrets and variables → Actions →
   Variables 新增 `PUBLIC_ADMIN_API_BASE = https://…workers.dev`，
   并确认 `.github/workflows/deploy.yml` 已把它传入构建环境（见主仓库 docs/V5_ADMIN.md）。

## 四、配置项速查

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` | var | 目标仓库坐标 |
| `ALLOWED_ORIGIN` | var | CORS 白名单，逗号分隔；必须含 `https://error1125.github.io` |
| `GITHUB_COMMITTER_NAME` / `_EMAIL` | var | commit 署名（可选） |
| `ADMIN_SECRET` | secret | 登录口令 |
| `SESSION_SECRET` | secret | 会话 HMAC 密钥 |
| `GITHUB_TOKEN` | secret | Fine-grained PAT（仅 Contents RW） |
| `MEDIA_BUCKET` + `R2_PUBLIC_BASE_URL` | 可选 | R2 直传；不配则媒体页只提供 URL 登记 |

## 五、API 一览（除 login/session/logout 外均需登录态）

| 方法 路径 | 作用 |
| --- | --- |
| `POST /api/admin/login` | 口令换 httpOnly session cookie（10 分钟 10 次限流） |
| `POST /api/admin/logout` | 清 cookie |
| `GET /api/admin/session` | `{authenticated, expiresAt}` |
| `POST /api/admin/publish/:type` | type ∈ moment/post/photo/project/music/anime/bug；成功返回 `{success,type,path,commitSha,commitUrl,htmlPath,message}` |
| `GET/PUT /api/admin/settings/:name` | name ∈ profile/site/worldline |
| `POST /api/admin/github/sync` | 拉真实 repos/events 写回 `src/data/github/*.json` |
| `GET /api/admin/status` | 仓库 / 最新 commit / Actions 状态 / 媒体数 / R2 开关 |
| `GET /api/admin/media` · `POST /api/admin/media/register` · `POST /api/admin/media/upload` | 媒体清单 |

错误统一 `{code, message}`：`UNAUTHORIZED` 401 · `MISSING_FIELDS`/`INVALID_FIELD` 400 ·
`SLUG_CONFLICT` 409 · `GITHUB_TOKEN_INVALID` 502 · `BRANCH_NOT_FOUND` 502 · `RATE_LIMITED` 429。

## 六、常见问题

- **登录报网络错误**：检查 `ALLOWED_ORIGIN` 是否与站点源完全一致（协议+域名，无末尾斜杠）。
- **发布报 401 但已登录**：cookie 是 `SameSite=None; Secure`，必须通过 **https** 访问站点。
- **发布报 502 GITHUB_TOKEN_INVALID**：PAT 过期或权限不足，重新生成后 `wrangler secret put GITHUB_TOKEN`。
- **同名冲突 409**：换 slug 或标题；同一天同标题会生成相同文件名。
