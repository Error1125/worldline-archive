/**
 * 导航配置。每个入口都带中英双语标签与 Icon.astro 使用的 icon 名。
 * Navigation config. Every item carries a bilingual label + an icon name.
 */
export interface NavItem {
  label: string;
  labelEn: string;
  href: string;
  icon: string;
  /** 可选描述，档案馆入口卡片会用到 */
  description?: string;
}

/** 桌面顶部主导航（v2.2：Topbar 作为全站主索引） */
export const mainNav: NavItem[] = [
  { label: "首页", labelEn: "HOME", href: "/", icon: "home" },
  { label: "时间线", labelEn: "TIMELINE", href: "/timeline", icon: "timeline" },
  { label: "文章", labelEn: "POSTS", href: "/posts", icon: "post" },
  { label: "项目", labelEn: "PROJECTS", href: "/projects", icon: "project" },
  { label: "归档", labelEn: "ARCHIVE", href: "/archive", icon: "archive" },
  { label: "照片", labelEn: "PHOTOS", href: "/photos", icon: "photo" },
  { label: "音乐", labelEn: "MUSIC", href: "/music", icon: "music" },
  { label: "说说", labelEn: "MOMENTS", href: "/moments", icon: "moment" },
  { label: "关于", labelEn: "ABOUT", href: "/about", icon: "about" },
];

/** 移动端底部 TabBar（常用入口，全量入口交给 MobileRadialMenu / /archive） */
export const mobileNav: NavItem[] = [
  { label: "首页", labelEn: "HOME", href: "/", icon: "home" },
  { label: "时间线", labelEn: "TIMELINE", href: "/timeline", icon: "timeline" },
  { label: "文章", labelEn: "POSTS", href: "/posts", icon: "post" },
  { label: "档案", labelEn: "ARCHIVE", href: "/archive", icon: "archive" },
  { label: "关于", labelEn: "ABOUT", href: "/about", icon: "about" },
];

/** 移动端径向菜单「全部入口」（MobileRadialMenu 使用） */
export const fullNav: NavItem[] = [
  { label: "首页", labelEn: "HOME", href: "/", icon: "home" },
  { label: "时间线", labelEn: "TIMELINE", href: "/timeline", icon: "timeline" },
  { label: "文章", labelEn: "POSTS", href: "/posts", icon: "post" },
  { label: "项目", labelEn: "PROJECTS", href: "/projects", icon: "project" },
  { label: "归档", labelEn: "ARCHIVE", href: "/archive", icon: "archive" },
  { label: "照片", labelEn: "PHOTOS", href: "/photos", icon: "photo" },
  { label: "音乐", labelEn: "MUSIC", href: "/music", icon: "music" },
  { label: "说说", labelEn: "MOMENTS", href: "/moments", icon: "moment" },
  { label: "关于", labelEn: "ABOUT", href: "/about", icon: "about" },
];

/** 档案馆入口（/archive 页面与首页均可复用） */
export const archiveNav: NavItem[] = [
  {
    label: "番剧",
    labelEn: "ANIME",
    href: "/anime",
    icon: "anime",
    description: "看过、在看、想看的作品与观测记录。",
  },
  {
    label: "音乐",
    labelEn: "MUSIC",
    href: "/music",
    icon: "music",
    description: "深夜循环的歌、专辑与歌单碎片。",
  },
  {
    label: "项目",
    labelEn: "PROJECTS",
    href: "/projects",
    icon: "project",
    description: "正在建造、暂停或已归档的造物。",
  },
  {
    label: "Bug",
    labelEn: "BUG LOG",
    href: "/bugs",
    icon: "bug",
    description: "与 Bug 的每一场战斗与复盘。",
  },
  {
    label: "照片",
    labelEn: "PHOTOS",
    href: "/photos",
    icon: "photo",
    description: "屏幕之外的光，与一些夜空观测。",
  },
  {
    label: "说说",
    labelEn: "MOMENTS",
    href: "/moments",
    icon: "moment",
    description: "没人听见、却想留下的碎碎念。",
  },
];

/** 后台 / 登录等低调入口（默认不进主导航） */
export const utilityNav: NavItem[] = [
  { label: "搜索", labelEn: "SEARCH", href: "/search", icon: "search" },
  { label: "登录", labelEn: "LOGIN", href: "/login", icon: "lock" },
  { label: "后台", labelEn: "ADMIN", href: "/admin", icon: "user" },
];
