export const siteConfig = {
  title: "Worldline Archive",
  subtitle: "Worldline Save Point",
  description: "A personal digital garden for life notes, anime, music, projects, bugs, and late-night thoughts.",
  author: "Traveler",
  language: "zh-CN",
  url: "https://Error1125.github.io/worldline-archive",

  profile: {
    handle: "@traveler_dev",
    signature: "Leaving one record among countless worldlines.",
    status: "Night observation",
    mood: "Calm / stable",
    coordinate: "Worldline Archive / Save Point 7",
    worldline: "1.048596",
  },

  links: {
    github: "https://github.com/Error1125",
    email: "mailto:traveler@example.com",
    /** QQ 号（点击图标弹出账号 / 二维码；留空则不显示入口） */
    qq: "10000",
    /** 可选：QQ 二维码图片路径（/images/...），不填则只显示账号 */
    qqQr: "",
    /** 微信号（点击图标弹出账号 / 二维码；留空则不显示入口） */
    wechat: "traveler_wx",
    /** 可选：微信二维码图片路径（/images/...），不填则只显示账号 */
    wechatQr: "",
    /** Bilibili 个人主页（留空则不显示入口） */
    bilibili: "https://space.bilibili.com/1",
    bangumi: "",
    anilist: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
