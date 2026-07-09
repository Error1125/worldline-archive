import profileJson from "./profile.json";
import settingsJson from "./site-settings.json";

/**
 * siteConfig —— 站点集中配置（v5.0）。
 *
 * v5.0 起，可变的「站点信息 / 个人资料」拆分为两个 JSON：
 *   - src/config/profile.json        个人资料（昵称 / 头像 / bio / 社交账号）
 *   - src/config/site-settings.json  站点设置（标题 / 标语 / 背景 / 默认封面 / 建站日期）
 *
 * Admin Console 通过后端 API 直接 commit 这两个 JSON 到仓库，
 * GitHub Actions 重新构建后即可生效 —— 本文件负责合并 JSON 并保持
 * 原有 `siteConfig` 导出形状不变，站内其余引用无需改动。
 *
 * 世界线引擎配置见 src/config/worldline.json（由 /admin/settings/worldline 管理）。
 */

const profile = profileJson;
const settings = settingsJson;

export const siteConfig = {
  title: settings.title,
  subtitle: settings.subtitle,
  description: settings.description,
  author: profile.author,
  language: settings.language,
  url: "https://Error1125.github.io/worldline-archive",

  /** v5.0：站点级设置（后台可改） */
  heroTagline: settings.heroTagline,
  backgroundDay: settings.backgroundDay,
  backgroundNight: settings.backgroundNight,
  defaultCover: settings.defaultCover,
  foundedAt: settings.foundedAt,
  footerBadges: settings.footerBadges,

  profile: {
    handle: profile.handle,
    signature: profile.signature,
    status: profile.status,
    mood: profile.mood,
    coordinate: profile.coordinate,
    /** 兼容旧字段：世界线基础值改由 worldline.json 提供，此处保留展示串 */
    worldline: "1.048596",
    avatar: profile.avatar,
    bio: profile.bio,
  },

  links: {
    github: profile.links.github,
    email: profile.links.email,
    /** QQ 号（点击图标弹出账号 / 二维码；留空则不显示入口） */
    qq: profile.links.qq,
    /** 可选：QQ 二维码图片路径（/images/...），不填则只显示账号 */
    qqQr: profile.links.qqQr,
    /** 微信号（点击图标弹出账号 / 二维码；留空则不显示入口） */
    wechat: profile.links.wechat,
    /** 可选：微信二维码图片路径（/images/...），不填则只显示账号 */
    wechatQr: profile.links.wechatQr,
    /** Bilibili 个人主页（留空则不显示入口） */
    bilibili: profile.links.bilibili,
    bangumi: profile.links.bangumi,
    anilist: profile.links.anilist,
  },
} as const;

export type SiteConfig = typeof siteConfig;
