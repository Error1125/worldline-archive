# Worldline Archive / 个人异世界存档点

> 一个把生活、番剧、音乐、项目、Bug 和深夜念头混在一起的**个人异世界存档点**。
> 不是普通博客，不是技术博客，也不是 Dashboard —— 追求「有灵魂」：深夜、星光、毛玻璃、终端、档案馆。

---

## ✨ 项目介绍

Worldline Archive 是一个纯静态个人站点，用来给自己的「世界线」做存档：

- 写长文（文章）、发碎碎念（说说）；
- 记录番剧观测、音乐碎片、造物项目；
- 把每一次和 Bug 的战斗写成复盘；
- 屏幕之外的一些光（占位相册）。

视觉气质：深蓝黑夜空 + 星空视差 + 弹幕 + 自定义光标 + 毛玻璃卡片 + 终端日志，二次元但不幼稚、赛博但不冰冷。

---

## 🧱 技术栈

- **Astro 5**（静态输出 + Content Collections + View Transitions）
- **TypeScript**
- **Tailwind CSS v4**（通过 `@tailwindcss/vite`，无 `tailwind.config`，主题写在 `global.css` 的 `@theme`）
- **React 19**（仅用于少量特效 / 交互 islands）
- **@astrojs/mdx**（内容支持 md / mdx）
- **Motion**（`motion/react`，用于 island 内的微动效）
- **Canvas**（星空 / 点击火花）
- **pnpm**（包管理）

> 明确不使用：Next.js / Nuxt、大型 UI 库（AntD/MUI）、shadcn 皮肤、真实数据库 / 鉴权、富文本编辑器、three.js / 3D、重型状态库、整站 SPA。

---

## 📁 项目结构

```txt
worldline-archive/
├─ astro.config.mjs
├─ tsconfig.json               # @/* -> src/*
├─ package.json
├─ public/
│  ├─ favicon.svg
│  └─ images/photos/*.svg      # 相册占位图（无 EXIF）
├─ scripts/
│  └─ sync-github.ts           # GitHub 同步（第一版 mock）
└─ src/
   ├─ config/                  # 站点 / 功能开关 / 导航 / 主题 / 弹幕 配置
   ├─ content/                 # 7 个内容集合 + config.ts（schema）
   │  ├─ posts/ moments/ bugs/ projects/ anime/ music/ photos/
   ├─ components/
   │  ├─ effects/              # Starfield / Danmaku / CustomCursor / ClickSpark / PageEnter
   │  ├─ common/               # Icon / GlassCard / SectionTitle / TagList / StatusBadge / EmptyState / PageHeader
   │  ├─ layout/               # SiteLayout / Header / MobileNav / Footer
   │  ├─ home/                 # ProfileCard / TerminalLog / RecentTimeline / NowPlayingCard / GitHubActivityCard
   │  ├─ cards/                # Article / Moment / Bug / Project / Anime / Music / Photo
   │  ├─ timeline/  archive/  search/  music/
   ├─ lib/                     # 内容读取 + 预留服务模块（github/apple-music/auth/comments/storage）
   ├─ data/github/             # repos.json / activity.json（mock）
   └─ styles/global.css        # Tailwind v4 + 设计 token + 组件类
```

---

## 🚀 启动 & 构建命令

```bash
# 安装依赖
pnpm install

# 本地开发（默认 http://localhost:4321）
pnpm dev

# 生产构建（输出到 dist/）
pnpm build

# 预览构建产物
pnpm preview

# 生成 GitHub mock 数据（写入 src/data/github/*.json）
pnpm sync:github
```

---

## ✍️ 内容添加方式

所有内容都是 `src/content/<集合>/` 下的 Markdown（`.md` / `.mdx`）。frontmatter 由 `src/content/config.ts` 里的 Zod schema 校验，**字段不合法会导致 build 失败**。所有集合都支持 `visibility: public | hidden | private`（默认 `public`，第一版只渲染 public）。日期写 `YYYY-MM-DD` 即可。

### 如何新增文章（posts）
`src/content/posts/my-post.md`：
```md
---
title: "标题"
description: "一句话摘要"
date: 2025-06-01
tags: ["astro", "随笔"]
mood: "平静"          # 可选
draft: false          # 可选，true 不出现在列表
---
正文用 Markdown 书写……
```

### 如何新增说说（moments）
`src/content/moments/m09.md`（内容写在 frontmatter 的 `content`）：
```md
---
content: "今天调了一整天的布局，终于对齐了。"
date: 2025-06-02
mood: "疲惫但满足"    # 可选
weather: "多云"        # 可选
tags: ["日常"]         # 可选
---
```

### 如何新增 Bug 记录（bugs）
`src/content/bugs/my-bug.md`（`status` 必填）：
```md
---
title: "表单重复提交"
date: 2025-06-03
status: "fixed"        # fixed | investigating | wontfix | note
severity: "high"       # 可选 low|medium|high|critical
summary: "一句话现象"
project: "worldline-archive"  # 可选
cause: "根因摘要"       # 可选
solution: "修复摘要"    # 可选
tags: ["frontend"]
---
## 现象
## 根因
## 修复方案
## 复盘
```

### 如何新增番剧（anime）
`src/content/anime/a09.md`（`status` 必填，`score` 0–10）：
```md
---
title: "作品名"
titleJP: "日文名"      # 可选
date: 2025-06-04
status: "watching"     # watching|completed|planned|paused|dropped
score: 8.5             # 可选
episodes: 12           # 可选
currentEpisode: 5      # 可选
season: "2025 春"       # 可选
year: 2025             # 可选
tags: ["原创"]
thoughts: "短评"        # 可选
---
```

### 如何新增音乐（music）
`src/content/music/mu09.md`（`type` 必填；**歌词只写原创短句，勿搬运真实歌词**）：
```md
---
title: "曲名"
artist: "艺人"
album: "专辑"          # 可选
date: 2025-06-05
type: "song"           # song | album | playlist
mood: "深夜"           # 可选
comment: "一句感想"     # 可选
lyricsQuote: "原创氛围短句"  # 可选，禁止真实歌词
appleMusicUrl: ""       # 可选外链
tags: ["citypop"]
---
```

### 如何新增照片（photos）
先把占位图（SVG/图片）放到 `public/images/photos/`，再建 `src/content/photos/my-album.md`（`images` 至少 1 张）：
```md
---
title: "夜空观测"
date: 2025-06-06
album: "night-sky"     # 可选
description: "描述"     # 可选
images:
  - /images/photos/ns-01.svg
  - /images/photos/ns-02.svg
tags: ["夜空"]
mood: "安静"
---
```
> 隐私：不要放真实照片，不要暴露 EXIF / 地理信息。

---

## 🎨 UI 风格说明

- **配色**：深蓝黑夜空（`--ia-bg` `#05070f`）、星白、青（neon）、紫（nebula）、成功绿 / 警告黄 / 危险粉。全部集中在 `global.css` 的 CSS 变量与 `@theme`。
- **卡片**：`.glass` / `.glass-card`（毛玻璃 + 悬浮聚光 spotlight，跟随鼠标）、`.corner-ticks`（四角刻线）。
- **终端感**：`.terminal-line`（◆）、`.diamond`（◇）、等宽数字 `.mono`、双语标签（如 `ARCHIVE // 档案`）。
- **特效**：星空视差（Canvas）、弹幕层、自定义光标、点击火花、路由进场扫光。均可被 `prefers-reduced-motion` 关闭。
- **动效**：`.reveal` 进场浮现（IntersectionObserver）、View Transitions 页面切换。

---

## 📱 移动端适配说明

- 布局单列优先，栅格在 `sm/lg` 断点展开；
- 底部 `MobileNav` TabBar（`md` 以下显示），正文用 `.main-has-tabbar` 预留底部空间，避免被遮挡；
- 触摸设备自动**关闭自定义光标**（仅 `pointer:fine` 启用）；
- hover 效果在移动端转为可见即可的静态样式；
- 弹幕 / 星星数量在移动端自动降量；
- 全局 `overflow-x: hidden`，无横向滚动。

---

## 🚩 Feature Flags（`src/config/features.ts`）

| flag | 默认 | 说明 |
| --- | --- | --- |
| `auth` | `false` | 是否显示登录 / 后台入口（Footer / About 角落） |
| `comments` | `false` | 评论系统（关闭时返回空线程） |
| `onlineEditor` | `false` | 在线发布器 |
| `appleMusic` | `false` | Apple Music 真实接入 |
| `githubSync` | `true` | GitHub 数据展示（第一版读 mock JSON） |
| `privatePosts` | `false` | 是否放行 hidden / private 内容（未来登录后） |
| `pagefindSearch` | `false` | 是否启用 Pagefind 全文搜索 |

---

## 🧪 mock / 预留说明

第一版以下内容为 **mock 或纯 UI 预留**，详见各 `src/lib/*/README.md`：

- GitHub 仓库 / 活动数据（`src/data/github/*.json` + `src/lib/github`）
- Apple Music 曲目、Now Playing、连接按钮（`src/lib/apple-music`）
- 登录 / 权限（`src/lib/auth`，永远未登录）
- 评论系统（`src/lib/comments`，返回空）
- 图片存储（`src/lib/storage`，返回本地占位）
- 相册全部为 SVG 占位图

---

## 🗺 未来计划

- [ ] **GitHub API 同步**：GraphQL 拉仓库 + REST 拉 commits/issues/PR，GitHub Actions 定时生成静态 JSON。
- [ ] **Apple Music 接入**：MusicKit 授权 + 服务端签发 developer token。
- [ ] **AniList / Bangumi 接入**：番剧自动同步观看进度与元数据。
- [ ] **Supabase Auth**：邮箱魔法链接 / GitHub OAuth，仅站长进后台。
- [ ] **Supabase Storage**：照片上传（服务端剥离 EXIF）。
- [ ] **评论系统**：Postgres + RLS，访客登录后评论，站长审核。
- [ ] **在线后台**：在线发布文章 / 说说 / 照片，管理评论。
- [ ] **Pagefind 搜索**：构建期生成静态全文索引，支持正文级检索。

---

## ⚠️ 已知限制

- GitHub / Apple Music / 评论 / 登录 / 存储均为 mock 或 UI 预留，无真实数据。
- 搜索仅覆盖标题 / 描述 / 标签，未覆盖正文（等 Pagefind）。
- 相册为占位图，非真实照片。
- 无 RSS / sitemap 之外的 SEO 深度优化（可后续补）。

---

## 👉 下一步开发建议

1. 先接 **Pagefind**（纯静态、成本最低，体验提升明显）。
2. 再接 **GitHub 同步**（把 `scripts/sync-github.ts` 换成真实 API + Actions cron）。
3. 需要互动时再上 **Supabase Auth + 评论**。
4. 最后做 **在线后台**（依赖 Auth + Storage）。

更详细的进度与决策见 [`TODO_WORLDLINE_ARCHIVE.md`](./TODO_WORLDLINE_ARCHIVE.md)。
