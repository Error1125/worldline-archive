# v5.1 Anime API 调查结论

更新时间：2026-07-10

| 方案 | Key / 鉴权 | 标题与封面 | 搜索与番剧字段 | 静态站适配 | 结论 |
| --- | --- | --- | --- | --- | --- |
| AniList GraphQL | 公开查询不需要 key；用户列表写入才需 OAuth | romaji / english / native，封面完整 | 搜索、集数、季度、年份、类型、制作公司齐全 | 官方示例允许浏览器 `POST https://graphql.anilist.co`；当前常规上限 90/min，官方公告处于降级时为 30/min | **v5.1 选用**。无私密 key，适合 Admin 导入 POC；故障时保留本地 content |
| Jikan | 无 key，MAL 的非官方只读 API | 日/英标题与 MAL 图片较好，中文较弱 | 搜索和常用字段完整 | 可直接请求，但属于非官方服务，限流与上游变更风险更高 | 作为后备数据源，不作为 v5.1 主源 |
| Bangumi | 部分公开读取可匿名；用户相关能力需要 Access Token | 中文 / 日文条目优势明显，图片可用 | 条目搜索、章节、人物、关联条目完善 | 若使用 token 必须经 Worker；公开 API 也应设置合规 User-Agent | 适合 v5.2 中文标题补全与 ID 对照 |
| TMDB | 必须申请 API key / Bearer token | 多语言和图片强 | TV 搜索、季、集信息完善，但动画语义与 AniList 不完全一致 | 私密 token 必须走 Worker，且需要 TMDB attribution | 不作为番剧主源，可用于影视扩展 |

实现决定：Admin 的 Anime 发布表单使用 AniList 公开 GraphQL 搜索；只导入事实字段，个人观看状态、评分、短评仍由站内维护。网络错误、403 或 429 时明确提示并保留当前表单，本地 `src/content/anime` 始终是前台数据源。

主要资料：

- https://docs.anilist.co/guide/graphql/
- https://docs.anilist.co/guide/rate-limiting
- https://docs.anilist.co/guide/considerations
- https://docs.jikan.moe/
- https://bangumi.github.io/api/
- https://developer.themoviedb.org/v4/docs/authentication-application
- https://developer.themoviedb.org/docs/rate-limiting
