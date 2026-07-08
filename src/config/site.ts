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
    bangumi: "",
    anilist: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
