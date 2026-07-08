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
  icon: string;
  /** 双语类型标签，例如 "BUG // 战斗记录" */
  typeLabel: string;
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

function isVisible(v: "public" | "hidden" | "private"): boolean {
  if (v === "public") return true;
  // 未来：登录后放行 hidden / private
  return features.privatePosts ? v !== "private" : false;
}

// ---- 单集合读取（已过滤 visibility + draft，并按日期倒序）----

export async function getPosts() {
  const list = await getCollection("posts", ({ data }) => isVisible(data.visibility) && !data.draft);
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getMoments() {
  const list = await getCollection("moments", ({ data }) => isVisible(data.visibility));
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getBugs() {
  const list = await getCollection("bugs", ({ data }) => isVisible(data.visibility));
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getProjects() {
  const list = await getCollection("projects", ({ data }) => isVisible(data.visibility));
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getAnime() {
  const list = await getCollection("anime", ({ data }) => isVisible(data.visibility));
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getMusic() {
  const list = await getCollection("music", ({ data }) => isVisible(data.visibility));
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getPhotos() {
  const list = await getCollection("photos", ({ data }) => isVisible(data.visibility));
  return list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

// ---- 统一时间线 ----

function typeLabelOf(t: ContentType): string {
  const m = TYPE_META[t];
  return `${m.labelEn} // ${m.labelZh}`;
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
      description: e.data.description,
      date: e.data.date,
      href: `/posts/${e.id}`,
      tags: e.data.tags,
      icon: TYPE_META.post.icon,
      typeLabel: typeLabelOf("post"),
    });
  }
  for (const e of moments) {
    const text = e.data.content.trim();
    items.push({
      type: "moment",
      id: e.id,
      title: text.length > 32 ? text.slice(0, 32) + "…" : text,
      description: e.data.mood ? `心情：${e.data.mood}` : undefined,
      date: e.data.date,
      href: "/moments",
      tags: e.data.tags ?? [],
      icon: TYPE_META.moment.icon,
      typeLabel: typeLabelOf("moment"),
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
      icon: TYPE_META.bug.icon,
      typeLabel: typeLabelOf("bug"),
    });
  }
  for (const e of projects) {
    items.push({
      type: "project",
      id: e.id,
      title: e.data.title,
      description: e.data.description,
      date: e.data.date,
      href: "/projects",
      tags: e.data.tags,
      status: e.data.status,
      icon: TYPE_META.project.icon,
      typeLabel: typeLabelOf("project"),
    });
  }
  for (const e of anime) {
    items.push({
      type: "anime",
      id: e.id,
      title: e.data.title,
      description: e.data.thoughts ?? e.data.titleJP,
      date: e.data.date,
      href: "/anime",
      tags: e.data.tags,
      status: e.data.status,
      icon: TYPE_META.anime.icon,
      typeLabel: typeLabelOf("anime"),
    });
  }
  for (const e of music) {
    items.push({
      type: "music",
      id: e.id,
      title: `${e.data.title} — ${e.data.artist}`,
      description: e.data.comment ?? e.data.mood,
      date: e.data.date,
      href: "/music",
      tags: e.data.tags,
      icon: TYPE_META.music.icon,
      typeLabel: typeLabelOf("music"),
    });
  }
  for (const e of photos) {
    items.push({
      type: "photo",
      id: e.id,
      title: e.data.title,
      description: e.data.description,
      date: e.data.date,
      href: "/photos",
      tags: e.data.tags ?? [],
      icon: TYPE_META.photo.icon,
      typeLabel: typeLabelOf("photo"),
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
  }));
}
