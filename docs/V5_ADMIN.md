# V5 观测台（Admin Console）设置指南

v5.0 把静态展示站升级为「可发布、可管理」的世界线存档系统：
浏览器里的隐藏控制台 → Cloudflare Worker → GitHub commit → Actions 部署 → 前台更新 → Worldline 数值变化。

```
┌──────────────┐  口令登录（httpOnly cookie）  ┌───────────────────┐
│ /admin/*     │ ───────────────────────────▶ │ Cloudflare Worker │
│ (GitHub Pages│  POST /api/admin/publish/*   │  · 校验 session    │
│  纯静态页面) │ ◀─────────────────────────── │  · 生成 MD/JSON    │
└──────────────┘   {commitSha, htmlPath…}     │  · commit 到 GitHub│
                                              └─────────┬─────────┘
                                                        ▼
                                     GitHub Actions 构建 → Pages 部署
                                                        ▼
                                         前台新记录出现，Worldline 跳变
```

安全模型：GitHub token（写权限）与登录口令只存在 Worker secrets；
浏览器只持有 httpOnly、Secure、SameSite=None 的签名 cookie，前端代码与仓库里没有任何秘密。

---

## 一次性设置（约 10 分钟）

### 1. 部署 Worker

按 [`worker/README.md`](../worker/README.md) 操作：`wrangler login` → 注入三个 secret
（`ADMIN_SECRET` 登录口令、`SESSION_SECRET` 随机串、`GITHUB_TOKEN` 仅本仓库 Contents RW 的
fine-grained PAT）→ `wrangler deploy`，记下产出的 `https://…workers.dev` 地址。

### 2. 让前端知道后端在哪（二选一）

- **方式 A（免配置）**：直接进 `https://error1125.github.io/worldline-archive/admin/login`，
  展开「后端 API 地址」填入 Worker 地址。存 localStorage，本机一次即可。
- **方式 B（构建注入）**：仓库 Settings → Secrets and variables → Actions → **Variables**
  新增 `PUBLIC_ADMIN_API_BASE`，值为 Worker 地址。`deploy.yml` 已把它传入构建。

### 3. 首次登录

打开 `/admin/login`，输入 `ADMIN_SECRET` 设定的口令。成功后：

- 跳转总览页（Worldline 状态、仓库/部署状态、内容统计、最近记录）；
- 本机记下低调入口标记——之后页脚与 About 页角落会出现「观测台 / console」，
  其他访客永远看不到该入口（未登录直接访问 /admin/* 会被弹回登录页）。

---

## 日常使用

| 想做什么 | 去哪里 |
| --- | --- |
| 发说说 / 文章 / 照片 / 项目 / 音乐 / 番剧 / Bug | 发布 Tab → 选类型 → 填必填项 → 底部「发布」 |
| 看部署到哪一步 | 总览页「仓库状态」卡（最新 commit + Actions 状态，可刷新） |
| 改昵称、签名、社交链接 | 设置 → 档案 |
| 改站点标题、Hero 标语、页脚徽章 | 设置 → 站点 |
| 调世界线权重 / 阈值 / 衰减 | 设置 → 世界线 |
| 登记图床外链 / 上传图片（需 R2） | 媒体 Tab |
| 刷新首页 GitHub 卡片数据 | 总览页「GitHub 同步」按钮 |

发布成功面板会给出：仓库文件路径、commit 短 sha（可点开）、部署提示与「查看前台页面」
链接（Actions 跑完约 1–2 分钟后生效）。同名冲突（同日同 slug）返回 409，换个 slug 即可。

### 各类型必填项

| 类型 | 必填 | 落盘路径 |
| --- | --- | --- |
| 说说 moment | 内容 | `src/content/moments/YYYY-MM-DD-slug.md` |
| 文章 post | 标题、描述 | `src/content/posts/YYYY-MM-DD-slug.md` |
| 照片 photo | 标题、≥1 张图片 URL | `src/content/photos/YYYY-MM-DD-slug.md` |
| 项目 project | 标题、描述、状态 | `src/content/projects/slug.md` |
| 音乐 music | 标题、艺术家 | `src/content/music/YYYY-MM-DD-slug.md` |
| 番剧 anime | 标题、状态 | `src/content/anime/slug.md` |
| Bug bug | 标题、摘要、状态 | `src/content/bugs/YYYY-MM-DD-slug.md` |

所有类型共享的 META 折叠区：标签、世界线影响（low/medium/high/critical）、精选、
草稿、关联记录、自定义 slug、封面（含昼/夜双封面）。

---

## Worldline 引擎速记

发布会立刻影响首页 Worldline 数值（基线 1.048596）：

- 权重：Project 5 · Post 4 · Photo 3 · Bug 3 · Moment 2 · Anime 1 · Music 1
- 时间衰减 `exp(-daysAgo/14)`，只看最近 30 天
- 倍率：featured ×1.5 · critical ×2 · high ×1.5 · low ×0.5 · 相册(≥3图) ×1.2 ·
  长文(≥800字) ×1.2 · 活跃项目 ×1.3
- 分级：0–4 stable → 4–10 observing → 10–18 unstable → 18+ divergence

以上参数全部可在 设置 → 世界线 调整（写回 `src/config/worldline.json`）。

---

## 排障

| 症状 | 处理 |
| --- | --- |
| 登录页报「无法连接后端」 | Worker 地址写错 / 未部署；先开 `…workers.dev/api/health` 验证 |
| 登录成功但发布 401 | 站点必须 https 访问（cookie 是 Secure）；或 Worker `ALLOWED_ORIGIN` 与站点源不一致 |
| 发布 502 GITHUB_TOKEN_INVALID | PAT 过期/权限不足，重新 `wrangler secret put GITHUB_TOKEN` |
| 发布 409 SLUG_CONFLICT | 当日已有同名文件，改 slug 或标题 |
| 发布成功但前台没变 | 等 Actions 跑完（总览页可看状态）；浏览器强刷 |
| 换了浏览器看不到隐藏入口 | 入口标记存 localStorage，本机登录一次即可 |
| 登录报 500 SERVER_MISCONFIGURED | Worker 缺 `ADMIN_SECRET`，或 `SESSION_SECRET` 未配置 / 过短（需 32+ 字符）；用 `wrangler secret put` 补齐后重试 |
| 手机端登录成功又被弹回 / 反复循环 | 多为跨站第三方 Cookie 被移动浏览器拦截，见下方「跨站 Cookie 与移动端登录」 |

### 跨站 Cookie 与移动端登录

默认部署是**跨站**结构：前台在 GitHub Pages（`*.github.io`），后端 Worker 在
`*.workers.dev`，两者属于不同站点。登录态是一枚 `SameSite=None; Secure` 的
httpOnly cookie，只有这样才能在跨站请求里被带上——桌面浏览器通常没问题，但
**部分移动浏览器**（如 iOS Safari 的 ITP，以及各类「阻止跨站跟踪 / 屏蔽第三方
Cookie」开关）会把它当作第三方 Cookie 拦掉。表现为：手机上输入口令后短暂进入
控制台又被弹回登录页，或反复登录循环（此时桌面端一般完全正常，基本即可判定是本原因）。

遇到时，任选其一让前后端**同站**即可（cookie 不再算第三方）：

- **同站自定义域名**：给站点绑定自定义域名（如 `example.com`），Worker 挂到同一
  父域的子域（如 `api.example.com`，用 Worker Routes 绑定）。前后端同站后，cookie
  不再受第三方 Cookie 策略影响。
- **Cloudflare Pages Functions**：把前台迁到 Cloudflare Pages，用 Pages Functions
  承载 `/api/admin/*`。此时前后端同源，最省心，移动端也不再有 Cookie 问题。

## 已知边界（v5.0）

- 媒体上传需自行开通 R2 并配置公开域名；未配置时仅提供 URL 登记（外链图床）。
- 登录限流为单实例内存版（10 分钟 10 次），Worker 冷启动会重置计数——对个人站足够。
- 控制台不做已发布内容的在线编辑/删除（v5.1 候选），需要时直接改仓库文件。
