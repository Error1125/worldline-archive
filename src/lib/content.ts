import { getCollection } from "astro:content";
import { features } from "@/config/features";

/**
 * 内容访问统一入口。
 * 第一版只暴露 public 内容；hidden / private 交给未来的登录逻辑
 * （features.privatePosts 打开后可在此放行）。
 */

export type ContentType =
  | "post"
  | "moment"
  | "bug"
  | "project"
  | "anime"
  | "music"
  | "photo";

export interface TimelineItem {
  type: ContentType;
  id: string;
  title: string;
  description?: string;
  date: Date;
  href?: string;
  tags: string[];
  /** 领域状态（bug/anime/project 会用到），用于 type indicator */
  status?: string;
  /** v5：世界线引擎输入 */
  featured?: boolean;
  worldlineImpact?: "low" | "medium" | "high" | "critical";
  worldlineWeight?: number;
  icon: string;
  /** 双语类型标签，例如 "BUG // 战斗记录" */
  typeLabel: string;
  /** 全文检索语料（标题/描述/标签/领域字段拼接，仅用于搜索，不展示） */
  searchText?: string;
}

/** 类型 → 展示信息映射 */
export const TYPE_META: Record<
  ContentType,
  { icon: string; labelEn: string; labelZh: string }
> = {
  post: { icon: "post", labelEn: "POST", labelZh: "文章" },
  moment: { icon: "moment", labelEn: "MOMENT", labelZh: "说说" },
  bug: { icon: "bug", labelEn: "BUG", labelZh: "战斗记录" },
  project: { icon: "project", labelEn: "PROJECT", labelZh: "造物" },
  anime: { icon: "anime", labelEn: "ANIME", labelZh: "番剧" },
  music: { icon: "music", labelEn: "MUSIC", labelZh: "音乐" },
  photo: { icon: "photo", labelEn: "PHOTO", labelZh: "相册" },
};

/** 领域状态 → 中文标签（供番剧筛选、搜索语料与建议展示复用） */
export const ANIME_STATUS_ZH: Record<string, string> = {
  watching: "观测中",
  completed: "已看完",
  planned: "想看",
  paused: "搁置",
  dropped: "抛弃",
};
export const PROJECT_STATUS_ZH: Record<string, string> = {
  idea: "构想",
  building: "建造中",
  paused: "暂停",
  done: "已完成",
  archived: "已归档",
};
export const BUG_STATUS_ZH: Record<string, string> = {
  fixed: "已修复",
  investigating: "排查中",
  wontfix: "不修",
  note: "笔记",
};

function isVisible(v: "public" | "hidden" | "private" | "unlisted"): boolean {
  if (v === "public") return true;
  // unlisted：详情页存在但不进任何列表 / 时间线
  if (v === "unlisted") return false;
  // 未来：登录后放行 hidden / private
  return features.privatePosts ? v !== "private" : false;
}

// ---- 单集合读取（已过滤 visibility + draft，并按日期倒序）----

export async function getPosts() {
  const list = await getCollection("posts", ({ data }) => isVisible(data.visibility) && !data.draft);
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getMoments() {
  const list = await getCollection("moments", ({ data }) => isVisible(data.visibility) && !data.draft);
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getBugs() {
  const list = await getCollection("bugs", ({ data }) => isVisible(data.visibility) && !data.draft);
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getProjects() {
  const list = await getCollection("projects", ({ data }) => isVisible(data.visibility) && !data.draft);
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getAnime() {
  const list = await getCollection("anime", ({ data }) => isVisible(data.visibility) && !data.draft);
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getMusic() {
  const list = await getCollection("music", ({ data }) => isVisible(data.visibility) && !data.draft);
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getPhotos() {
  const list = await getCollection("photos", ({ data }) => isVisible(data.visibility) && !data.draft);
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

// ---- 统一时间线 ----

function typeLabelOf(t: ContentType): string {
  const m = TYPE_META[t];
  return `${m.labelEn} // ${m.labelZh}`;
}

/** 把标题 / 描述 / 标签 / 领域字段拼成一段可 includes 匹配的检索语料 */
function joinSearch(
  ...parts: Array<string | number | undefined | null | string[]>
): string {
  return parts
    .flat()
    .filter((x): x is string | number => x !== undefined && x !== null && x !== "")
    .map((x) => String(x))
    .join(" ");
}

export async function getTimelineItems(): Promise<TimelineItem[]> {
  const [posts, moments, bugs, projects, anime, music, photos] = await Promise.all([
    getPosts(),
    getMoments(),
    getBugs(),
    getProjects(),
    getAnime(),
    getMusic(),
    getPhotos(),
  ]);

  const items: TimelineItem[] = [];

  for (const e of posts) {
    items.push({
      type: "post",
      id: e.id,
      title: e.data.title,
      description: e.data.summary ?? e.data.description,
      date: e.data.date,
      href: `/posts/${e.id}`,
      tags: e.data.tags,
      featured: e.data.featured,
      worldlineImpact: e.data.worldlineImpact,
      worldlineWeight: e.data.worldlineWeight,
      icon: TYPE_META.post.icon,
      typeLabel: typeLabelOf("post"),
      searchText: joinSearch(e.data.title, e.data.description, e.data.tags, e.data.category, e.data.mood, "文章 post"),
    });
  }
  for (const e of moments) {
    const text = e.data.content.trim();
    items.push({
      type: "moment",
      id: e.id,
      title: text.length > 32 ? text.slice(0, 32) + "…" : text,
      description: e.data.summary ?? (e.data.mood ? `心情：${e.data.mood}` : undefined),
      date: e.data.date,
      href: `/moments/${e.id}`,
      tags: e.data.tags ?? [],
      featured: e.data.featured,
      worldlineImpact: e.data.worldlineImpact,
      worldlineWeight: e.data.worldlineWeight,
      icon: TYPE_META.moment.icon,
      typeLabel: typeLabelOf("moment"),
      searchText: joinSearch(text, e.data.mood, e.data.weather, e.data.locationText, e.data.tags, "说说 moment"),
    });
  }
  for (const e of bugs) {
    items.push({
      type: "bug",
      id: e.id,
      title: e.data.title,
      description: e.data.summary,
      date: e.data.date,
      href: `/bugs/${e.id}`,
      tags: e.data.tags,
      status: e.data.status,
      featured: e.data.featured,
      worldlineImpact: e.data.worldlineImpact,
      worldlineWeight: e.data.worldlineWeight,
      icon: TYPE_META.bug.icon,
      typeLabel: typeLabelOf("bug"),
      searchText: joinSearch(e.data.title, e.data.summary, BUG_STATUS_ZH[e.data.status], e.data.status, e.data.project, e.data.tags, "bug 战斗记录"),
    });
  }
  for (const e of projects) {
    items.push({
      type: "project",
      id: e.id,
      title: e.data.title,
      description: e.data.summary ?? e.data.description,
      date: e.data.date,
      href: `/projects/${e.id}`,
      tags: e.data.tags,
      status: e.data.status,
      featured: e.data.featured,
      worldlineImpact: e.data.worldlineImpact,
      worldlineWeight: e.data.worldlineWeight,
      icon: TYPE_META.project.icon,
      typeLabel: typeLabelOf("project"),
      searchText: joinSearch(e.data.title, e.data.description, e.data.tags, e.data.techStack, PROJECT_STATUS_ZH[e.data.status], e.data.status, "项目 造物 project"),
    });
  }
  for (const e of anime) {
    items.push({
      type: "anime",
      id: e.id,
      title: e.data.title,
      description: e.data.summary ?? e.data.thoughts ?? e.data.titleJP,
      date: e.data.date,
      href: `/anime/${e.id}`,
      tags: e.data.tags,
      status: e.data.status,
      featured: e.data.featured,
      worldlineImpact: e.data.worldlineImpact,
      worldlineWeight: e.data.worldlineWeight,
      icon: TYPE_META.anime.icon,
      typeLabel: typeLabelOf("anime"),
      searchText: joinSearch(e.data.title, e.data.titleJP, e.data.thoughts, ANIME_STATUS_ZH[e.data.status], e.data.status, e.data.tags, e.data.score, e.data.season, e.data.year, "番剧 anime"),
    });
  }
  for (const e of music) {
    items.push({
      type: "music",
      id: e.id,
      title: `${e.data.title} — ${e.data.artist}`,
      description: e.data.summary ?? e.data.comment ?? e.data.mood,
      date: e.data.date,
      href: `/music/${e.id}`,
      tags: e.data.tags,
      featured: e.data.featured,
      worldlineImpact: e.data.worldlineImpact,
      worldlineWeight: e.data.worldlineWeight,
      icon: TYPE_META.music.icon,
      typeLabel: typeLabelOf("music"),
      searchText: joinSearch(e.data.title, e.data.artist, e.data.album, e.data.comment, e.data.mood, e.data.lyricsQuote, e.data.tags, e.data.type, "音乐 music"),
    });
  }
  for (const e of photos) {
    items.push({
      type: "photo",
      id: e.id,
      title: e.data.title,
      description: e.data.summary ?? e.data.description,
      date: e.data.date,
      href: `/photos/${e.id}`,
      tags: e.data.tags ?? [],
      featured: e.data.featured,
      worldlineImpact: e.data.worldlineImpact,
      worldlineWeight: e.data.worldlineWeight,
      icon: TYPE_META.photo.icon,
      typeLabel: typeLabelOf("photo"),
      searchText: joinSearch(e.data.title, e.data.description, e.data.album, e.data.tags, e.data.mood, "照片 相册 photo"),
    });
  }

  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}

// ---- 搜索索引（供 SearchBox island 使用，必须是可 JSON 序列化的纯数据）----

export interface SearchDoc {
  type: ContentType;
  title: string;
  description: string;
  tags: string[];
  href: string;
  date: string; // ISO
  typeLabelZh: string;
  /** 领域状态（如番剧 watching / 项目 building），可空 */
  status?: string;
  /** 全文检索语料（标题/描述/标签/领域字段），供 includes 匹配 */
  search: string;
}

export async function getSearchIndex(): Promise<SearchDoc[]> {
  const items = await getTimelineItems();
  return items.map((it) => ({
    type: it.type,
    title: it.title,
    description: it.description ?? "",
    tags: it.tags,
    href: it.href ?? "/",
    date: it.date.toISOString(),
    typeLabelZh: TYPE_META[it.type].labelZh,
    status: it.status,
    search: it.searchText ?? joinSearch(it.title, it.description, it.tags, TYPE_META[it.type].labelZh),
  }));
}

// ---- Worldline Divergence 状态（v5：委托给 src/lib/worldline.ts 引擎） ----

import {
  getWorldlineActivityScore,
  scoreToStatus,
  worldlineConfig,
  WORLDLINE_STATUS_META,
  type WorldlineStatus as WorldlineEngineStatus,
} from "@/lib/worldline";

export type WorldlineLevel = "stable" | "observing" | "unstable" | "shift";

export interface WorldlineStatus {
  /** 最近窗口内的活跃度分数 */
  score: number;
  level: WorldlineLevel;
  /** 状态徽章文案 */
  badge: string;
  /** 卡片底部说明 */
  caption: string;
  /** 统计窗口（天） */
  windowDays: number;
}

const LEVEL_CAPTION: Record<WorldlineEngineStatus, string> = {
  stable: "当前世界线稳定 · 观测值已锁定",
  observing: "持续观测中 · 存档同步正常",
  unstable: "档案更新频繁 · 观测值轻微扰动",
  divergence: "检测到密集存档写入 · 世界线漂移中",
};

/**
 * 根据最近内容更新计算世界线状态（v3 兼容形状，内部使用 v5 引擎：
 * 类型权重 × impact 倍率 × featured 倍率 × 指数时间衰减）。
 * 纯构建期计算，不依赖任何后台。
 */
export async function getWorldlineStatus(windowDays = worldlineConfig.windowDays): Promise<WorldlineStatus> {
  const items = await getTimelineItems();
  const score = getWorldlineActivityScore(items);
  const engineStatus = scoreToStatus(score);
  const level: WorldlineLevel = engineStatus === "divergence" ? "shift" : engineStatus;
  return {
    score: Math.round(score * 10) / 10,
    level,
    badge: WORLDLINE_STATUS_META[engineStatus].label,
    caption: LEVEL_CAPTION[engineStatus],
    windowDays,
  };
}

// ---- 相关记录（v5：详情页 Related Records） ----

/**
 * 解析一条记录的 related 列表：
 * - 同类型直接写 slug；跨类型写 "type:slug"；
 * - 未配置或解析为空时，回退到「同类型 + 共同标签」推荐（最多 fallbackLimit 条）。
 */
export async function resolveRelatedRecords(
  current: { type: ContentType; id: string; tags?: string[] },
  related: string[] | undefined,
  fallbackLimit = 3,
): Promise<TimelineItem[]> {
  const items = await getTimelineItems();
  const out: TimelineItem[] = [];
  const seen = new Set<string>();
  const key = (t: string, i: string) => `${t}:${i}`;
  seen.add(key(current.type, current.id));

  for (const ref of related ?? []) {
    const [maybeType, ...rest] = ref.split(":");
    const wantType = rest.length > 0 ? (maybeType as ContentType) : current.type;
    const wantId = rest.length > 0 ? rest.join(":") : ref;
    const hit = items.find((it) => it.type === wantType && it.id === wantId);
    if (hit && !seen.has(key(hit.type, hit.id))) {
      out.push(hit);
      seen.add(key(hit.type, hit.id));
    }
  }

  if (out.length === 0) {
    const tags = new Set(current.tags ?? []);
    const scored = items
      .filter((it) => !seen.has(key(it.type, it.id)))
      .map((it) => ({
        it,
        s:
          (it.type === current.type ? 2 : 0) +
          it.tags.reduce((acc, t) => acc + (tags.has(t) ? 1 : 0), 0),
      }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || b.it.date.getTime() - a.it.date.getTime());
    for (const { it } of scored.slice(0, fallbackLimit)) out.push(it);
  }

  return out.slice(0, 4);
}
