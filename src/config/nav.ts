export interface NavItem {
  label: string;
  labelEn: string;
  href: string;
  icon: string;
  description?: string;
}

// v4.1：主导航信息架构调整——
//   1) 移除独立「档案」主入口（其聚合检索已并入「世界线记录 / 观测索引」，/archive 保留为兼容跳转）；
//   2)「时间线」升级为核心浏览页「记录」（世界线记录 = 时间轴 + 观测索引双视图）；
//   3) 补回「番剧」主入口（此前只在归档子列表里，导航层漏掉了）。
export const mainNav: NavItem[] = [
  { label: "首页", labelEn: "HOME", href: "/", icon: "home" },
  { label: "记录", labelEn: "RECORDS", href: "/timeline", icon: "timeline" },
  { label: "文章", labelEn: "POSTS", href: "/posts", icon: "post" },
  { label: "项目", labelEn: "PROJECTS", href: "/projects", icon: "project" },
  { label: "番剧", labelEn: "ANIME", href: "/anime", icon: "anime" },
  { label: "照片", labelEn: "PHOTOS", href: "/photos", icon: "photo" },
  { label: "音乐", labelEn: "MUSIC", href: "/music", icon: "music" },
  { label: "说说", labelEn: "MOMENTS", href: "/moments", icon: "moment" },
  { label: "关于", labelEn: "ABOUT", href: "/about", icon: "about" },
];

// v3：移动端底部 TabBar 已移除，移动端导航统一由「放射展开菜单」（fullNav）承担。
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
