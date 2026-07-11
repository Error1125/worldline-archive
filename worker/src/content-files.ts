/**
 * 内容文件生成（v5.0）—— 把发布 payload 变成 Markdown 文件。
 *
 * 与 src/content/config.ts 的统一 schema 严格对齐：
 * - 通用字段：summary / tags / cover(Day/Night) / featured / draft /
 *   visibility / worldlineImpact / worldlineWeight / related
 * - 文件路径约定：
 *     moments / posts / photos / music / bugs → src/content/{type}s/YYYY-MM-DD-slug.md
 *     projects / anime                        → src/content/{type}s/slug.md
 * - slug：CJK 安全（保留中文字符），空则 record-YYYYMMDDHHmm。
 */

export class ValidationError extends Error {
  code = "MISSING_FIELDS";
  fields: string[];
  constructor(fields: string[]) {
    super(`缺少必填字段：${fields.join("、")}`);
    this.fields = fields;
  }
}

export type RecordType = "moment" | "post" | "photo" | "project" | "music" | "anime" | "bug";

export const RECORD_TYPES: RecordType[] = [
  "moment",
  "post",
  "photo",
  "project",
  "music",
  "anime",
  "bug",
];

const COLLECTION_DIR: Record<RecordType, string> = {
  moment: "moments",
  post: "posts",
  photo: "photos",
  project: "projects",
  music: "music",
  anime: "anime",
  bug: "bugs",
};

/** 前台详情页路径（部署后可访问） */
const HTML_DIR: Record<RecordType, string> = {
  moment: "moments",
  post: "posts",
  photo: "photos",
  project: "projects",
  music: "music",
  anime: "anime",
  bug: "bugs",
};

/** projects / anime 不加日期前缀（长期条目，slug 即身份） */
const DATE_PREFIXED = new Set<RecordType>(["moment", "post", "photo", "music", "bug"]);

/* ---------------- slug ---------------- */

export function slugify(input: string, date: Date): string {
  const s = (input || "")
    .trim()
    .toLowerCase()
    // 空白 / 下划线 → 连字符
    .replace(/[\s_]+/g, "-")
    // 仅保留 ascii 字母数字、连字符、CJK
    .replace(/[^a-z0-9\-\u4e00-\u9fa5]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  if (s) return s;
  const p = (n: number) => String(n).padStart(2, "0");
  return `record-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}${p(date.getHours())}${p(date.getMinutes())}`;
}

/* ---------------- YAML helpers ---------------- */

function yStr(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function yArr(v: unknown): string {
  const arr = Array.isArray(v) ? v : [];
  return `[${arr.map((x) => yStr(x)).join(", ")}]`;
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  return Array.isArray(v) && v.length === 0;
}

type Line = [key: string, value: string] | null;

function line(key: string, v: unknown, kind: "str" | "raw" | "arr" = "str"): Line {
  if (isEmpty(v)) return null;
  if (kind === "arr") return [key, yArr(v)];
  if (kind === "raw") return [key, String(v)];
  return [key, yStr(v)];
}

function renderFrontmatter(lines: Line[]): string {
  const body = lines
    .filter((l): l is [string, string] => l !== null)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `---\n${body}\n---\n`;
}

/* ---------------- date ---------------- */

function parseDate(v: unknown): Date {
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fmtDate(d)}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

/* ---------------- 通用尾部字段 ---------------- */

function baseLines(p: Record<string, unknown>): Line[] {
  return [
    line("summary", p.summary),
    line("tags", p.tags, "arr"),
    line("cover", p.cover),
    line("coverDay", p.coverDay),
    line("coverNight", p.coverNight),
    p.featured === true ? line("featured", "true", "raw") : null,
    p.draft === true ? line("draft", "true", "raw") : null,
    line("visibility", typeof p.visibility === "string" ? p.visibility : "public"),
    typeof p.worldlineWeight === "number" ? line("worldlineWeight", p.worldlineWeight, "raw") : null,
    line("worldlineImpact", typeof p.worldlineImpact === "string" ? p.worldlineImpact : "medium"),
    line("related", p.related, "arr"),
  ];
}

/* ---------------- 校验 ---------------- */

const REQUIRED: Record<RecordType, string[]> = {
  moment: ["content"],
  post: ["title", "description"],
  photo: ["title", "images"],
  project: ["title", "description", "status"],
  music: ["title", "artist"],
  anime: ["title", "status"],
  bug: ["title", "summary", "status"],
};

const ENUMS: Record<string, string[]> = {
  "worldlineImpact": ["low", "medium", "high", "critical"],
  "visibility": ["public", "hidden", "private", "unlisted"],
  "project.status": ["idea", "building", "paused", "done", "archived", "active", "completed", "prototype"],
  "anime.status": ["watching", "completed", "planned", "paused", "dropped"],
  "bug.status": ["fixed", "investigating", "wontfix", "note", "resolved", "archived"],
  "bug.severity": ["low", "medium", "high", "critical"],
  "music.type": ["song", "album", "playlist"],
};

export function validatePayload(type: RecordType, p: Record<string, unknown>): void {
  const missing = REQUIRED[type].filter((k) => isEmpty(p[k]));
  if (missing.length) throw new ValidationError(missing);

  const checkEnum = (key: string, val: unknown, enumKey: string) => {
    if (isEmpty(val)) return;
    if (!ENUMS[enumKey].includes(String(val))) {
      const err = new ValidationError([]);
      err.code = "INVALID_FIELD";
      err.message = `字段 ${key} 的值非法：${String(val)}（允许：${ENUMS[enumKey].join(" / ")}）`;
      throw err;
    }
  };
  checkEnum("worldlineImpact", p.worldlineImpact, "worldlineImpact");
  checkEnum("visibility", p.visibility, "visibility");
  if (type === "project") checkEnum("status", p.status, "project.status");
  if (type === "anime") checkEnum("status", p.status, "anime.status");
  if (type === "bug") {
    checkEnum("status", p.status, "bug.status");
    checkEnum("severity", p.severity, "bug.severity");
  }
  if (type === "music") checkEnum("type", p.type, "music.type");
  if (type === "photo" && (!Array.isArray(p.images) || p.images.length < 1)) {
    throw new ValidationError(["images"]);
  }
}

/* ---------------- 各类型 frontmatter ---------------- */

function buildFrontmatter(type: RecordType, p: Record<string, unknown>, date: Date): string {
  switch (type) {
    case "moment":
      return renderFrontmatter([
        line("content", p.content),
        line("date", fmtDateTime(date), "raw"),
        line("mood", p.mood),
        line("weather", p.weather),
        line("locationText", p.locationText),
        line("images", p.images, "arr"),
        ...baseLines(p),
      ]);
    case "post":
      return renderFrontmatter([
        line("title", p.title),
        line("description", p.description),
        line("date", fmtDate(date), "raw"),
        line("category", p.category),
        line("series", p.series),
        line("mood", p.mood),
        ...baseLines(p),
      ]);
    case "photo":
      const photoImages = Array.isArray(p.images)
        ? p.images.map((url, index) => {
            const caption = Array.isArray(p.captions) ? p.captions[index] : undefined;
            return caption ? { url, caption } : url;
          })
        : [];
      return renderFrontmatter([
        line("title", p.title),
        line("date", fmtDate(date), "raw"),
        line("album", p.album),
        line("description", p.description),
        line("images", JSON.stringify(photoImages), "raw"),
        line("mood", p.mood),
        line("location", p.location),
        line("camera", p.camera),
        p.takenAt ? line("takenAt", fmtDate(parseDate(p.takenAt)), "raw") : null,
        ...baseLines(p),
      ]);
    case "project":
      return renderFrontmatter([
        line("title", p.title),
        line("description", p.description),
        line("date", fmtDate(date), "raw"),
        line("status", p.status),
        line("techStack", p.techStack, "arr"),
        line("repo", p.repo),
        line("demo", p.demo),
        line("role", p.role),
        p.startedAt ? line("startedAt", fmtDate(parseDate(p.startedAt)), "raw") : null,
        p.endedAt ? line("endedAt", fmtDate(parseDate(p.endedAt)), "raw") : null,
        p.github && typeof p.github === "object" ? line("github", JSON.stringify(p.github), "raw") : null,
        ...baseLines(p),
      ]);
    case "music":
      return renderFrontmatter([
        line("title", p.title),
        line("artist", p.artist),
        line("album", p.album),
        line("date", fmtDate(date), "raw"),
        line("type", typeof p.type === "string" ? p.type : "song"),
        line("mood", p.mood),
        line("comment", p.comment),
        line("lyricsQuote", p.lyricsQuote),
        line("appleMusicUrl", p.appleMusicUrl),
        line("externalUrl", p.externalUrl),
        line("playlist", p.playlist),
        ...baseLines(p),
      ]);
    case "anime":
      return renderFrontmatter([
        line("title", p.title),
        line("titleJP", p.titleJP),
        line("titleCn", p.titleCn),
        line("date", fmtDate(date), "raw"),
        line("status", p.status),
        typeof p.score === "number" ? line("score", p.score, "raw") : null,
        typeof p.episodes === "number" ? line("episodes", p.episodes, "raw") : null,
        typeof p.currentEpisode === "number" ? line("currentEpisode", p.currentEpisode, "raw") : null,
        line("season", p.season),
        typeof p.year === "number" ? line("year", p.year, "raw") : null,
        line("studio", p.studio, "arr"),
        line("genres", p.genres, "arr"),
        line("thoughts", p.thoughts),
        line("longReview", p.longReview),
        line("bangumiSummary", p.bangumiSummary),
        line("bangumiAirDate", p.bangumiAirDate),
        typeof p.bangumiRank === "number" ? line("bangumiRank", p.bangumiRank, "raw") : null,
        line("bangumiTags", p.bangumiTags, "arr"),
        typeof p.bangumiCommunityScore === "number" ? line("bangumiCommunityScore", p.bangumiCommunityScore, "raw") : null,
        typeof p.bangumiUserRate === "number" ? line("bangumiUserRate", p.bangumiUserRate, "raw") : null,
        line("bangumiSyncedAt", p.bangumiSyncedAt),
        line("externalUrl", p.externalUrl),
        p.externalIds && typeof p.externalIds === "object"
          ? line("externalIds", JSON.stringify(p.externalIds), "raw")
          : null,
        ...baseLines(p),
      ]);
    case "bug":
      return renderFrontmatter([
        line("title", p.title),
        line("date", fmtDate(date), "raw"),
        line("project", p.project),
        line("severity", p.severity),
        line("status", p.status),
        line("summary", p.summary),
        line("environment", p.environment),
        line("cause", p.cause),
        line("solution", p.solution),
        ...baseLines(p),
      ]);
  }
}

/* ---------------- 组装 ---------------- */

export interface BuiltFile {
  /** 仓库内路径 src/content/… */
  path: string;
  /** 文件内容 */
  content: string;
  /** 记录 id（= Astro content id，用于详情页 URL） */
  id: string;
  /** 部署后前台详情页路径（相对 base），如 /moments/2026-07-09-xxx */
  htmlPath: string;
  /** commit message */
  message: string;
  labelZh: string;
}

const LABEL_ZH: Record<RecordType, string> = {
  moment: "说说",
  post: "文章",
  photo: "照片",
  project: "项目",
  music: "音乐",
  anime: "番剧",
  bug: "Bug 记录",
};

export function buildContentFile(type: RecordType, payload: Record<string, unknown>): BuiltFile {
  validatePayload(type, payload);
  const date = parseDate(payload.date);

  const slugSource =
    typeof payload.slug === "string" && payload.slug.trim()
      ? payload.slug
      : typeof payload.title === "string" && payload.title.trim()
        ? payload.title
        : typeof payload.content === "string"
          ? payload.content.slice(0, 24)
          : "";
  const slug = slugify(String(slugSource), date);

  const id = DATE_PREFIXED.has(type) ? `${fmtDate(date)}-${slug}` : slug;
  const dir = COLLECTION_DIR[type];
  const path = `src/content/${dir}/${id}.md`;

  // moments 前台无 body 需求；其余类型 body 追加在 frontmatter 后
  const fm = buildFrontmatter(type, payload, date);
  const body = typeof payload.body === "string" && payload.body.trim() ? `\n${payload.body.trim()}\n` : "";
  const content = fm + body;

  const title =
    typeof payload.title === "string" && payload.title
      ? payload.title
      : typeof payload.content === "string"
        ? payload.content.slice(0, 18)
        : id;

  return {
    path,
    content,
    id,
    htmlPath: `/${HTML_DIR[type]}/${id}`,
    message: `content(${dir}): 发布${LABEL_ZH[type]}「${title}」 [via console]`,
    labelZh: LABEL_ZH[type],
  };
}

/* ---------------- settings 文件映射 ---------------- */

export const SETTINGS_FILES: Record<string, { path: string; label: string }> = {
  profile: { path: "src/config/profile.json", label: "观测者档案" },
  site: { path: "src/config/site-settings.json", label: "站点设置" },
  worldline: { path: "src/config/worldline.json", label: "世界线引擎参数" },
  bangumi: { path: "src/config/bangumi.json", label: "Bangumi 同步设置" },
};

export const MEDIA_MANIFEST_PATH = "src/data/media.json";
