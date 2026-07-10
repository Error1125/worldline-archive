import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Content Collections（Astro 5 Content Layer / glob loader）—— v5.0 统一 Schema。
 *
 * v5.0 变更：
 * - 所有集合共享一组 BaseRecord 字段（见 baseFields）：
 *     summary / updatedAt / tags / cover(coverDay/coverNight) / featured / draft /
 *     visibility / worldlineWeight / worldlineImpact / related
 * - visibility 扩展 "unlisted"（不进列表 / 搜索，但可直链访问），
 *   旧值 "hidden" 与 unlisted 同义，全部兼容。
 * - worldlineImpact 参与世界线变动率引擎（src/lib/worldline.ts），默认 medium。
 * - related 为其他记录的 id 列表（同类型直接写 slug，跨类型写 "type:slug"）。
 * - 保留 v4 全部旧字段，旧内容零迁移。
 *
 * 约定不变：
 * - 日期字段使用 z.coerce.date()；封面 / 图片一律字符串路径或 URL。
 */

const visibility = z
  .enum(["public", "hidden", "private", "unlisted"])
  .default("public");

const worldlineImpact = z
  .enum(["low", "medium", "high", "critical"])
  .default("medium");

/** v5.0 统一基础字段（BaseRecord），spread 进各集合 schema */
const baseFields = {
  summary: z.string().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  cover: z.string().optional(),
  coverDay: z.string().optional(),
  coverNight: z.string().optional(),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  visibility,
  /** 手动覆盖类型默认权重（不填则用 worldline.json 中该类型权重） */
  worldlineWeight: z.number().optional(),
  worldlineImpact,
  /** 相关记录 id：同类型写 slug，跨类型写 "type:slug" */
  related: z.array(z.string()).default([]),
};

// 7.1 posts —— 长文 / 开发记录 / 思绪杂谈
const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    ...baseFields,
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.string().optional(),
    series: z.string().optional(),
    mood: z.string().optional(),
  }),
});

// 7.2 moments —— 说说 / 碎碎念
const moments = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/moments" }),
  schema: z.object({
    ...baseFields,
    content: z.string(),
    date: z.coerce.date(),
    mood: z.string().optional(),
    weather: z.string().optional(),
    locationText: z.string().optional(),
    images: z.array(z.string()).optional(),
  }),
});

// 7.3 bugs —— Bug 战斗记录
const bugs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/bugs" }),
  schema: z.object({
    ...baseFields,
    title: z.string(),
    date: z.coerce.date(),
    project: z.string().optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    status: z.enum(["fixed", "investigating", "wontfix", "note", "resolved", "archived"]),
    summary: z.string(),
    environment: z.string().optional(),
    cause: z.string().optional(),
    solution: z.string().optional(),
    relatedFiles: z.array(z.string()).optional(),
  }),
});

// 7.4 projects —— 造物记录
const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    ...baseFields,
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    status: z.enum([
      // v4 原值
      "idea", "building", "paused", "done", "archived",
      // v5 别名（active≈building / completed≈done / prototype≈idea）
      "active", "completed", "prototype",
    ]),
    techStack: z.array(z.string()).default([]),
    repo: z.string().optional(),
    demo: z.string().optional(),
    role: z.string().optional(),
    startedAt: z.coerce.date().optional(),
    endedAt: z.coerce.date().optional(),
    github: z
      .object({
        owner: z.string(),
        repo: z.string(),
        stars: z.number().optional(),
        forks: z.number().optional(),
        lastCommitAt: z.string().optional(),
        language: z.string().optional(),
        topics: z.array(z.string()).default([]),
        homepage: z.string().optional(),
        license: z.string().optional(),
        openIssues: z.number().optional(),
        defaultBranch: z.string().optional(),
      })
      .optional(),
  }),
});

// 7.5 anime —— 番剧观测记录
const anime = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/anime" }),
  schema: z.object({
    ...baseFields,
    title: z.string(),
    titleJP: z.string().optional(),
    titleCn: z.string().optional(),
    date: z.coerce.date(),
    status: z.enum(["watching", "completed", "planned", "paused", "dropped"]),
    score: z.number().min(0).max(10).optional(),
    episodes: z.number().optional(),
    currentEpisode: z.number().optional(),
    season: z.string().optional(),
    year: z.number().optional(),
    studio: z.array(z.string()).default([]),
    genres: z.array(z.string()).default([]),
    thoughts: z.string().optional(),
    externalUrl: z.string().optional(),
    externalIds: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    externalLinks: z
      .object({
        anilist: z.string().optional(),
        bangumi: z.string().optional(),
      })
      .optional(),
  }),
});

// 7.6 music —— 音乐碎片
const music = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/music" }),
  schema: z.object({
    ...baseFields,
    title: z.string(),
    artist: z.string(),
    album: z.string().optional(),
    date: z.coerce.date(),
    type: z.enum(["song", "album", "playlist"]).default("song"),
    mood: z.string().optional(),
    comment: z.string().optional(),
    appleMusicUrl: z.string().optional(),
    externalUrl: z.string().optional(),
    playlist: z.string().optional(),
    /** 原创氛围句，禁止复制真实歌词 */
    lyricsQuote: z.string().optional(),
  }),
});

// 7.7 photos —— 相册（占位图，禁止真实照片 / EXIF）
const photos = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/photos" }),
  schema: z.object({
    ...baseFields,
    title: z.string(),
    date: z.coerce.date(),
    album: z.string().optional(),
    description: z.string().optional(),
    images: z.array(z.union([
      z.string(),
      z.object({
        url: z.string(),
        alt: z.string().optional(),
        caption: z.string().optional(),
        date: z.string().optional(),
        location: z.string().optional(),
      }),
    ])).min(1),
    mood: z.string().optional(),
    location: z.string().optional(),
    camera: z.string().optional(),
    takenAt: z.coerce.date().optional(),
  }),
});

export const collections = { posts, moments, bugs, projects, anime, music, photos };
