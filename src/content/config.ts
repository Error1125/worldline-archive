import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Content Collections（Astro 5 Content Layer / glob loader）。
 *
 * 约定：
 * - 所有日期字段使用 z.coerce.date()，YAML 里写 `2025-06-01` 或字符串都能被解析。
 * - 所有集合都支持 visibility: "public" | "hidden" | "private"，默认 public。
 *   第一版只渲染 public；hidden / private 作为未来登录功能预留（见 features.privatePosts）。
 * - 封面 / 图片一律使用字符串路径（指向 /public 下的 SVG 占位图或渐变占位），
 *   避免第一版就绑定图片优化管线。
 */

const visibility = z
  .enum(["public", "hidden", "private"])
  .default("public");

// 7.1 posts —— 长文 / 开发记录 / 思绪杂谈
const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    cover: z.string().optional(),
    /** v3：可选的昼夜专用封面；有则按模式切换，只有 cover 时昼夜共用 */
    coverDay: z.string().optional(),
    coverNight: z.string().optional(),
    mood: z.string().optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    visibility,
  }),
});

// 7.2 moments —— 说说 / 碎碎念
const moments = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/moments" }),
  schema: z.object({
    content: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    mood: z.string().optional(),
    weather: z.string().optional(),
    locationText: z.string().optional(),
    images: z.array(z.string()).optional(),
    visibility,
  }),
});

// 7.3 bugs —— Bug 战斗记录
const bugs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/bugs" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    project: z.string().optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    status: z.enum(["fixed", "investigating", "wontfix", "note"]),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    cause: z.string().optional(),
    solution: z.string().optional(),
    relatedFiles: z.array(z.string()).optional(),
    visibility,
  }),
});

// 7.4 projects —— 造物记录
const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    status: z.enum(["idea", "building", "paused", "done", "archived"]),
    tags: z.array(z.string()).default([]),
    techStack: z.array(z.string()).default([]),
    repo: z.string().optional(),
    demo: z.string().optional(),
    cover: z.string().optional(),
    /** v3：可选的昼夜专用封面；有则按模式切换，只有 cover 时昼夜共用 */
    coverDay: z.string().optional(),
    coverNight: z.string().optional(),
    featured: z.boolean().default(false),
    visibility,
    github: z
      .object({
        owner: z.string(),
        repo: z.string(),
        stars: z.number().optional(),
        forks: z.number().optional(),
        lastCommitAt: z.string().optional(),
        language: z.string().optional(),
      })
      .optional(),
  }),
});

// 7.5 anime —— 番剧观测记录
const anime = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/anime" }),
  schema: z.object({
    title: z.string(),
    titleJP: z.string().optional(),
    date: z.coerce.date(),
    status: z.enum(["watching", "completed", "planned", "paused", "dropped"]),
    score: z.number().min(0).max(10).optional(),
    episodes: z.number().optional(),
    currentEpisode: z.number().optional(),
    cover: z.string().optional(),
    /** v3：可选的昼夜专用封面；有则按模式切换，只有 cover 时昼夜共用 */
    coverDay: z.string().optional(),
    coverNight: z.string().optional(),
    season: z.string().optional(),
    year: z.number().optional(),
    tags: z.array(z.string()).default([]),
    thoughts: z.string().optional(),
    externalLinks: z
      .object({
        anilist: z.string().optional(),
        bangumi: z.string().optional(),
      })
      .optional(),
    visibility,
  }),
});

// 7.6 music —— 音乐碎片
const music = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/music" }),
  schema: z.object({
    title: z.string(),
    artist: z.string(),
    album: z.string().optional(),
    date: z.coerce.date(),
    type: z.enum(["song", "album", "playlist"]),
    cover: z.string().optional(),
    /** v3：可选的昼夜专用封面；有则按模式切换，只有 cover 时昼夜共用 */
    coverDay: z.string().optional(),
    coverNight: z.string().optional(),
    tags: z.array(z.string()).default([]),
    mood: z.string().optional(),
    comment: z.string().optional(),
    appleMusicUrl: z.string().optional(),
    /** 原创氛围句，禁止复制真实歌词 */
    lyricsQuote: z.string().optional(),
    visibility,
  }),
});

// 7.7 photos —— 相册（占位图，禁止真实照片 / EXIF）
const photos = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/photos" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    album: z.string().optional(),
    description: z.string().optional(),
    images: z.array(z.string()).min(1),
    tags: z.array(z.string()).optional(),
    mood: z.string().optional(),
    visibility,
  }),
});

export const collections = { posts, moments, bugs, projects, anime, music, photos };
