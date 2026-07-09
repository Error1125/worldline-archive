/**
 * Admin 发布表单字段配置（v5.0）——配置驱动渲染。
 *
 * 每种记录类型一份字段清单，PublishFormScreen 按此渲染表单并组装 payload。
 * 字段名与 src/content/config.ts 的统一 schema 严格对齐；
 * 后端（worker/src/content-files.ts）按同一份约定生成 frontmatter。
 */

export type FieldKind =
  | "text"
  | "textarea"
  | "markdown"
  | "date"
  | "datetime"
  | "number"
  | "select"
  | "tags"
  | "images"
  /** v5.0.2 §7：单图 URL + 实时预览（cover / 头像等） */
  | "image"
  | "toggle";

export interface FieldDef {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  defaultValue?: unknown;
}

export interface RecordTypeDef {
  type: string;
  label: string;
  labelEn: string;
  icon: string;
  accent: string;
  desc: string;
  /** 是否有正文（markdown body） */
  hasBody: boolean;
  bodyLabel?: string;
  fields: FieldDef[];
}

const impactField: FieldDef = {
  name: "worldlineImpact",
  label: "世界线影响",
  kind: "select",
  defaultValue: "medium",
  help: "影响世界线变动率的幅度：critical ×2 / high ×1.5 / medium ×1 / low ×0.5",
  options: [
    { value: "low", label: "low · 微扰" },
    { value: "medium", label: "medium · 常规" },
    { value: "high", label: "high · 显著" },
    { value: "critical", label: "critical · 关键" },
  ],
};

const commonTail: FieldDef[] = [
  { name: "tags", label: "标签", kind: "tags", placeholder: "回车添加标签" },
  impactField,
  {
    name: "featured",
    label: "精选（featured ×1.5）",
    kind: "toggle",
    defaultValue: false,
  },
  { name: "draft", label: "存为草稿（不上前台）", kind: "toggle", defaultValue: false },
  {
    name: "related",
    label: "相关记录",
    kind: "tags",
    placeholder: "同类写 slug，跨类写 type:slug",
    help: "例：2025-06-01-first-light 或 project:worldline-archive",
  },
  {
    name: "slug",
    label: "自定义 slug（可选）",
    kind: "text",
    placeholder: "留空则由标题自动生成",
    help: "仅小写字母 / 数字 / 连字符；中文会被保留并转为拼音式安全字符。",
  },
];

const coverFields: FieldDef[] = [
  { name: "cover", label: "封面 URL", kind: "image", placeholder: "https://…（可选）" },
  { name: "coverDay", label: "白昼封面（可选）", kind: "image", placeholder: "day 模式覆盖" },
  { name: "coverNight", label: "黑夜封面（可选）", kind: "image", placeholder: "night 模式覆盖" },
];

export const RECORD_TYPES: RecordTypeDef[] = [
  {
    type: "moment",
    label: "说说",
    labelEn: "MOMENT",
    icon: "moment",
    accent: "var(--ia-neon)",
    desc: "碎碎念 / 日常片段，权重 2",
    hasBody: false,
    fields: [
      {
        name: "content",
        label: "内容",
        kind: "textarea",
        required: true,
        rows: 5,
        placeholder: "此刻在想什么……",
      },
      { name: "date", label: "时间", kind: "datetime", required: true },
      { name: "mood", label: "心情", kind: "text", placeholder: "如：燃 / 平静 / 咖啡因过载" },
      { name: "weather", label: "天气", kind: "text", placeholder: "可选" },
      { name: "locationText", label: "位置（文字）", kind: "text", placeholder: "可选" },
      { name: "images", label: "图片 URL 列表", kind: "images" },
      ...commonTail,
    ],
  },
  {
    type: "post",
    label: "文章",
    labelEn: "POST",
    icon: "post",
    accent: "var(--ia-nebula)",
    desc: "长文 / 开发记录，权重 4",
    hasBody: true,
    bodyLabel: "正文（Markdown）",
    fields: [
      { name: "title", label: "标题", kind: "text", required: true },
      {
        name: "description",
        label: "描述 / 摘要",
        kind: "textarea",
        required: true,
        rows: 2,
        help: "列表卡片与 SEO 描述（schema 的 description 字段）",
      },
      { name: "summary", label: "短摘要（可选）", kind: "text", help: "覆盖列表摘要，留空用描述" },
      { name: "date", label: "日期", kind: "date", required: true },
      { name: "category", label: "分类", kind: "text", placeholder: "如：devlog / essay" },
      { name: "series", label: "系列（可选）", kind: "text" },
      { name: "mood", label: "写作心情（可选）", kind: "text" },
      ...coverFields,
      ...commonTail,
    ],
  },
  {
    type: "photo",
    label: "照片",
    labelEn: "PHOTO",
    icon: "photo",
    accent: "var(--ia-success)",
    desc: "相册记录，权重 3（多图 ×1.2）",
    hasBody: true,
    bodyLabel: "图注 / 记录（Markdown，可选）",
    fields: [
      { name: "title", label: "标题", kind: "text", required: true },
      { name: "date", label: "日期", kind: "date", required: true },
      {
        name: "images",
        label: "图片 URL 列表",
        kind: "images",
        required: true,
        help: "至少 1 张；≥3 张享受相册加成 ×1.2",
      },
      { name: "album", label: "相册名（可选）", kind: "text" },
      { name: "description", label: "描述（可选）", kind: "textarea", rows: 2 },
      { name: "location", label: "地点（可选）", kind: "text" },
      { name: "camera", label: "器材（可选）", kind: "text" },
      { name: "takenAt", label: "拍摄时间（可选）", kind: "date" },
      { name: "mood", label: "心情（可选）", kind: "text" },
      ...commonTail,
    ],
  },
  {
    type: "project",
    label: "项目",
    labelEn: "PROJECT",
    icon: "project",
    accent: "var(--ia-warning)",
    desc: "造物记录，权重 5（active ×1.3）",
    hasBody: true,
    bodyLabel: "项目详情（Markdown）",
    fields: [
      { name: "title", label: "项目名", kind: "text", required: true },
      { name: "description", label: "一句话描述", kind: "textarea", required: true, rows: 2 },
      { name: "date", label: "记录日期", kind: "date", required: true },
      {
        name: "status",
        label: "状态",
        kind: "select",
        required: true,
        defaultValue: "building",
        options: [
          { value: "idea", label: "idea · 构想" },
          { value: "prototype", label: "prototype · 原型" },
          { value: "building", label: "building · 建造中" },
          { value: "active", label: "active · 活跃维护" },
          { value: "paused", label: "paused · 暂停" },
          { value: "done", label: "done · 完成" },
          { value: "completed", label: "completed · 已完结" },
          { value: "archived", label: "archived · 归档" },
        ],
      },
      { name: "techStack", label: "技术栈", kind: "tags", placeholder: "回车添加，如 Astro" },
      { name: "repo", label: "仓库 URL（可选）", kind: "text" },
      { name: "demo", label: "演示 URL（可选）", kind: "text" },
      { name: "role", label: "担当角色（可选）", kind: "text", placeholder: "如：solo dev" },
      { name: "startedAt", label: "开始日期（可选）", kind: "date" },
      { name: "endedAt", label: "结束日期（可选）", kind: "date" },
      ...coverFields,
      ...commonTail,
    ],
  },
  {
    type: "music",
    label: "音乐",
    labelEn: "MUSIC",
    icon: "music",
    accent: "var(--ia-nebula)",
    desc: "音乐碎片，权重 1",
    hasBody: true,
    bodyLabel: "听后感（Markdown，可选）",
    fields: [
      { name: "title", label: "曲名 / 专辑名", kind: "text", required: true },
      { name: "artist", label: "艺术家", kind: "text", required: true },
      { name: "album", label: "所属专辑（可选）", kind: "text" },
      { name: "date", label: "记录日期", kind: "date", required: true },
      {
        name: "type",
        label: "类型",
        kind: "select",
        defaultValue: "song",
        options: [
          { value: "song", label: "song · 单曲" },
          { value: "album", label: "album · 专辑" },
          { value: "playlist", label: "playlist · 歌单" },
        ],
      },
      { name: "mood", label: "心情（可选）", kind: "text" },
      { name: "comment", label: "一句话短评（可选）", kind: "textarea", rows: 2 },
      {
        name: "lyricsQuote",
        label: "原创氛围句（可选）",
        kind: "text",
        help: "禁止粘贴真实歌词，只写自己概括的氛围句。",
      },
      { name: "externalUrl", label: "外部链接（可选）", kind: "text" },
      { name: "appleMusicUrl", label: "Apple Music URL（可选）", kind: "text" },
      { name: "playlist", label: "歌单标识（可选）", kind: "text" },
      ...coverFields,
      ...commonTail,
    ],
  },
  {
    type: "anime",
    label: "番剧",
    labelEn: "ANIME",
    icon: "anime",
    accent: "var(--ia-neon)",
    desc: "观测记录，权重 1",
    hasBody: true,
    bodyLabel: "长评（Markdown，可选）",
    fields: [
      { name: "title", label: "作品名", kind: "text", required: true },
      { name: "titleJP", label: "日文原名（可选）", kind: "text" },
      { name: "date", label: "记录日期", kind: "date", required: true },
      {
        name: "status",
        label: "状态",
        kind: "select",
        required: true,
        defaultValue: "watching",
        options: [
          { value: "watching", label: "watching · 在看" },
          { value: "completed", label: "completed · 看完" },
          { value: "planned", label: "planned · 想看" },
          { value: "paused", label: "paused · 搁置" },
          { value: "dropped", label: "dropped · 弃坑" },
        ],
      },
      { name: "score", label: "评分（0–10）", kind: "number", min: 0, max: 10, step: 0.5 },
      { name: "episodes", label: "总话数（可选）", kind: "number", min: 0, step: 1 },
      { name: "currentEpisode", label: "当前进度（可选）", kind: "number", min: 0, step: 1 },
      { name: "season", label: "季度（可选）", kind: "text", placeholder: "如 2026冬" },
      { name: "year", label: "年份（可选）", kind: "number", min: 1960, max: 2100, step: 1 },
      { name: "thoughts", label: "短评（可选）", kind: "textarea", rows: 2 },
      { name: "externalUrl", label: "外部条目 URL（可选）", kind: "text" },
      ...coverFields,
      ...commonTail,
    ],
  },
  {
    type: "bug",
    label: "Bug",
    labelEn: "BUG LOG",
    icon: "bug",
    accent: "var(--ia-danger)",
    desc: "战斗记录，权重 3",
    hasBody: true,
    bodyLabel: "战斗过程（Markdown）",
    fields: [
      { name: "title", label: "标题", kind: "text", required: true },
      { name: "date", label: "日期", kind: "date", required: true },
      {
        name: "summary",
        label: "一句话总结",
        kind: "textarea",
        required: true,
        rows: 2,
      },
      { name: "project", label: "所属项目（可选）", kind: "text" },
      {
        name: "severity",
        label: "严重度",
        kind: "select",
        defaultValue: "medium",
        options: [
          { value: "low", label: "low" },
          { value: "medium", label: "medium" },
          { value: "high", label: "high" },
          { value: "critical", label: "critical" },
        ],
      },
      {
        name: "status",
        label: "状态",
        kind: "select",
        required: true,
        defaultValue: "investigating",
        options: [
          { value: "investigating", label: "investigating · 排查中" },
          { value: "fixed", label: "fixed · 已修复" },
          { value: "resolved", label: "resolved · 已解决" },
          { value: "wontfix", label: "wontfix · 不修" },
          { value: "note", label: "note · 备忘" },
          { value: "archived", label: "archived · 归档" },
        ],
      },
      { name: "environment", label: "环境（可选）", kind: "text", placeholder: "如 Node 22 / Chrome 130" },
      { name: "cause", label: "根因（可选）", kind: "textarea", rows: 2 },
      { name: "solution", label: "解法（可选）", kind: "textarea", rows: 2 },
      ...commonTail,
    ],
  },
];

export function getRecordType(type: string): RecordTypeDef | undefined {
  return RECORD_TYPES.find((t) => t.type === type);
}
