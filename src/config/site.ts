export const siteConfig = {
  title: "Worldline Archive",
  subtitle: "世界线存档点",
  description: "记录生活、番剧、音乐、项目、Bug 和深夜念头的个人数字庭院。",
  author: "Traveler",
  language: "zh-CN",
  url: "https://your-name.github.io/worldline-archive",

  profile: {
    handle: "@traveler_dev",
    signature: "在无数条世界线里，留下这一条记录。",
    status: "夜间观测中",
    mood: "平静 / 稳定",
    coordinate: "Worldline Archive / Save Point 7",
    worldline: "1.048596",
  },

  links: {
    github: "https://github.com/your-name",
    email: "mailto:traveler@example.com",
    bangumi: "",
    anilist: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
