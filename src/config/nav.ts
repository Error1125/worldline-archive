export interface NavItem {
  label: string;
  labelEn: string;
  href: string;
  icon: string;
  description?: string;
}

export const mainNav: NavItem[] = [
  { label: "首页", labelEn: "HOME", href: "/", icon: "home" },
  { label: "时间线", labelEn: "TIMELINE", href: "/timeline", icon: "timeline" },
  { label: "文章", labelEn: "POSTS", href: "/posts", icon: "post" },
  { label: "项目", labelEn: "PROJECTS", href: "/projects", icon: "project" },
  { label: "档案", labelEn: "ARCHIVE", href: "/archive", icon: "archive" },
  { label: "照片", labelEn: "PHOTOS", href: "/photos", icon: "photo" },
  { label: "音乐", labelEn: "MUSIC", href: "/music", icon: "music" },
  { label: "说说", labelEn: "MOMENTS", href: "/moments", icon: "moment" },
  { label: "关于", labelEn: "ABOUT", href: "/about", icon: "about" },
];

export const mobileNav: NavItem[] = [
  { label: "首页", labelEn: "HOME", href: "/", icon: "home" },
  { label: "时间线", labelEn: "TIMELINE", href: "/timeline", icon: "timeline" },
  { label: "文章", labelEn: "POSTS", href: "/posts", icon: "post" },
  { label: "档案", labelEn: "ARCHIVE", href: "/archive", icon: "archive" },
  { label: "关于", labelEn: "ABOUT", href: "/about", icon: "about" },
];

export const fullNav: NavItem[] = mainNav;

export const archiveNav: NavItem[] = [
  {
    label: "番剧",
    labelEn: "ANIME",
    href: "/anime",
    icon: "anime",
    description: "记录观看进度、短评和想留下来的作品。",
  },
  {
    label: "音乐",
    labelEn: "MUSIC",
    href: "/music",
    icon: "music",
    description: "深夜循环、专辑片段和当下的声音。",
  },
  {
    label: "项目",
    labelEn: "PROJECTS",
    href: "/projects",
    icon: "project",
    description: "正在建造、暂停或已经归档的造物。",
  },
  {
    label: "Bug",
    labelEn: "BUG LOG",
    href: "/bugs",
    icon: "bug",
    description: "把每个 Bug 写成一场可复盘的战斗。",
  },
  {
    label: "照片",
    labelEn: "PHOTOS",
    href: "/photos",
    icon: "photo",
    description: "屏幕之外的一点光和夜空观测。",
  },
  {
    label: "说说",
    labelEn: "MOMENTS",
    href: "/moments",
    icon: "moment",
    description: "短念头、日常片段和未成文的记录。",
  },
];

export const utilityNav: NavItem[] = [
  { label: "搜索", labelEn: "SEARCH", href: "/search", icon: "search" },
  { label: "登录", labelEn: "LOGIN", href: "/login", icon: "lock" },
  { label: "后台", labelEn: "ADMIN", href: "/admin", icon: "user" },
];
