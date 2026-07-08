# TODO · Worldline Archive

这条世界线的开发进度与决策记录。

---

## ✅ 已完成（第一版）

- [x] Astro 5 + TS + Tailwind v4 + React 19 + MDX + Motion 项目搭建，`pnpm build` 通过。
- [x] 7 个内容集合（posts / moments / bugs / projects / anime / music / photos）+ Zod schema 校验。
- [x] 配置层：`site` / `features` / `nav` / `theme` / `danmaku`。
- [x] 设计系统：`global.css`（CSS 变量、毛玻璃、spotlight、tag chip、status badge、弹幕动画、`.ia-prose` 正文排版）。
- [x] 特效 islands：Starfield（星空视差 + 流星）、DanmakuBackground（弹幕）、CustomCursor（自定义光标）、ClickSpark（点击火花）、PageEnter（进场扫光）。
- [x] 通用组件：Icon / GlassCard / SectionTitle / TagList / StatusBadge / EmptyState / PageHeader。
- [x] 布局：SiteLayout（View Transitions + 持久化特效）/ Header / MobileNav / Footer。
- [x] 首页「存档点大厅」：ProfileCard / TerminalLog / RecentTimeline / NowPlayingCard / GitHubActivityCard + 档案分区入口。
- [x] 卡片：Article / Moment / Bug / Project / Anime / Music / Photo。
- [x] 其他组件：TimelineView（按年份分组）/ ArchiveGrid / SearchBox（客户端检索）/ MusicPlayer / AppleMusicBadge / AppleMusicConnectButton。
- [x] 全部 16 个页面：`/` `/timeline` `/posts` `/posts/[slug]` `/moments` `/anime` `/music` `/projects` `/bugs` `/bugs/[slug]` `/photos` `/archive` `/about` `/search` `/login` `/admin`。
- [x] 预留服务模块：github / apple-music / auth / comments / storage（types + mock + client/provider/service + README）。
- [x] `scripts/sync-github.ts`（mock 生成器）+ `src/data/github/*.json`。
- [x] 相册 SVG 占位图（无 EXIF / 地理信息）。
- [x] 移动端：单列、底部 TabBar、触摸关闭光标、降量弹幕、无横向滚动、`prefers-reduced-motion` 支持。
- [x] mock 内容填充（每个集合数条示例）。

---

## ⏳ 未完成 / 下一步

- [ ] **Pagefind** 全文搜索（当前仅标题/描述/标签的客户端匹配）。
- [ ] **GitHub 真实同步**：把 mock 换成 GraphQL + REST，配 Actions cron。
- [ ] **Apple Music**：MusicKit 授权 + 服务端 developer token。
- [ ] **AniList / Bangumi**：番剧元数据 / 进度自动同步。
- [ ] **Supabase Auth**：登录（站长进后台，访客评论/点赞）。
- [ ] **Supabase Storage**：照片上传（服务端剥离 EXIF）。
- [ ] **评论系统**：Postgres + RLS + 审核。
- [ ] **在线后台**：发布文章 / 说说 / 照片，管理评论。
- [ ] SEO：sitemap / OG 图 / 结构化数据（可选）。
- [ ] 内容详情页的「关联项目 / 关联 Bug」双向链接（schema 已预留字段）。

---

## 🧪 mock 功能列表（第一版不是真的）

| 模块 | 现状 | 位置 |
| --- | --- | --- |
| GitHub 仓库 / 活动 | mock JSON | `src/data/github/*.json`, `src/lib/github` |
| Apple Music 曲目 / Now Playing | mock（原创虚构） | `src/lib/apple-music` |
| Apple Music 连接按钮 | disabled 占位 | `src/components/music/AppleMusicConnectButton.tsx` |
| 登录 / 权限 | 永远未登录 | `src/lib/auth` |
| 评论 | 返回空线程 | `src/lib/comments` |
| 图片存储 / 上传 | 返回本地占位路径 | `src/lib/storage` |
| 相册 | SVG 占位图 | `public/images/photos/` |
| 搜索 | 客户端静态 index | `src/components/search/SearchBox.tsx` |

---

## 🧭 重要设计决策

1. **纯静态 + Content Collections**：内容即 Markdown，schema 用 Zod 强校验；封面/图片一律用**字符串路径**（不绑定 Astro image 优化管线），降低第一版构建风险。
2. **React 只用于特效 / 交互**：Starfield、Danmaku、CustomCursor、ClickSpark、PageEnter、SearchBox、MusicPlayer、AppleMusicConnectButton。其余全部 `.astro`，避免整站 SPA。
3. **特效岛的加载策略**：所有依赖 `window` / Canvas 的特效用 `client:only="react"` 避免 SSR 报错，并用 `transition:persist` 让它们在 View Transitions 路由切换间保持存活、背景不闪烁；交互 island（SearchBox / MusicPlayer / ConnectButton）用 `client:load`。
4. **可见性模型**：所有集合支持 `public | hidden | private`，第一版只渲染 `public`，`hidden/private` 交给未来 `features.privatePosts` + 登录放行。共享判断在 `src/lib/visibility.ts`。
5. **整卡链接不嵌套 `<a>`**：TagList / StatusBadge 均为非交互装饰；含内部外链的卡片（Project / Music）本体渲染为 `div` 而非整卡链接。
6. **主题集中**：Tailwind v4 无 config 文件，设计 token 与组件类集中在 `global.css`（`@theme` + `:root` 变量）。
7. **隐私 & 版权红线**：相册不放真实照片 / 不暴露 EXIF；音乐不搬运真实歌词，只写原创氛围短句；番剧标题为原创示例。
8. **气质优先**：即使功能不完整，也要「有灵魂」——深夜、星光、毛玻璃、终端、档案馆。

---

## 🔧 后续外部服务配置（接真实功能时）

- `GITHUB_TOKEN`：只读 PAT，供 `scripts/sync-github.ts` 拉取真实数据（放环境变量 / Actions secret）。
- **Apple Developer**：Team ID / Key ID / 私钥，服务端签发 MusicKit developer token（私钥切勿进前端）。
- **Supabase**：`SUPABASE_URL` / `SUPABASE_ANON_KEY`（前端）+ service role key（仅服务端），用于 Auth / Storage / 评论。
- **Pagefind**：构建后执行索引命令（`pagefind --site dist`），在 `/search` 加载生成的索引。

> 原则：任何密钥都通过环境变量注入，绝不写死在仓库里。

---

## 🎯 下一轮最适合做什么

**建议顺序：Pagefind → GitHub 同步 → Supabase Auth + 评论 → 在线后台。**

- Pagefind 纯静态、零后端、见效快，优先做。
- GitHub 同步把「代码轨迹」变真实，只需脚本 + Actions，不引入运行时依赖。
- 需要互动时再引入 Supabase（Auth 打通后评论 / 点赞 / 上传都顺理成章）。
- 后台放最后，因为它依赖 Auth + Storage 两块地基。
