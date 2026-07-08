# Worldline Archive / 荳ｪ莠ｺ蠑ゆｸ也阜蟄俶｡｣轤ｹ

> 荳荳ｪ謚顔函豢ｻ縲∫分蜑ｧ縲・浹荵舌・｡ｹ逶ｮ縲。ug 蜥梧ｷｱ螟懷ｿｵ螟ｴ豺ｷ蝨ｨ荳襍ｷ逧・*荳ｪ莠ｺ蠑ゆｸ也阜蟄俶｡｣轤ｹ**縲・> 荳肴弍譎ｮ騾壼忽螳｢・御ｸ肴弍謚譛ｯ蜊壼ｮ｢・御ｹ滉ｸ肴弍 Dashboard 窶披・霑ｽ豎ゅ梧怏轣ｵ鬲ゅ搾ｼ壽ｷｱ螟懊∵弌蜈峨∵ｯ帷悉迺・∫ｻ育ｫｯ縲∵｡｣譯磯ｦ・・
---

## 笨ｨ 鬘ｹ逶ｮ莉狗ｻ・
Worldline Archive 譏ｯ荳荳ｪ郤ｯ髱呎∽ｸｪ莠ｺ遶咏せ・檎畑譚･扈呵・蟾ｱ逧・御ｸ也阜郤ｿ縲榊★蟄俶｡｣・・
- 蜀咎柄譁・ｼ域枚遶・峨∝書遒守｢主ｿｵ・郁ｯｴ隸ｴ・会ｼ・- 隶ｰ蠖慕分蜑ｧ隗よｵ九・浹荵千｢守援縲・迚ｩ鬘ｹ逶ｮ・・- 謚頑ｯ丈ｸ谺｡蜥・Bug 逧・・譁怜・謌仙､咲尨・・- 螻丞ｹ穂ｹ句､也噪荳莠帛・・亥頃菴咲嶌蜀鯉ｼ峨・
隗・ｧ画ｰ碑ｴｨ・壽ｷｱ闢晞ｻ大､懃ｩｺ + 譏溽ｩｺ隗・ｷｮ + 蠑ｹ蟷・+ 閾ｪ螳壻ｹ牙・譬・+ 豈帷悉迺・今迚・+ 扈育ｫｯ譌･蠢暦ｼ御ｺ梧ｬ｡蜈・ｽ・ｸ榊ｹｼ遞壹∬ｵ帛忽菴・ｸ榊・蜀ｷ縲・
---

## ｧｱ 謚譛ｯ譬・
- **Astro 5**・磯撕諤∬ｾ灘・ + Content Collections + View Transitions・・- **TypeScript**
- **Tailwind CSS v4**・磯夊ｿ・`@tailwindcss/vite`・梧裏 `tailwind.config`・御ｸｻ鬚伜・蝨ｨ `global.css` 逧・`@theme`・・- **React 19**・井ｻ・畑莠主ｰ鷹㍼迚ｹ謨・/ 莠､莠・islands・・- **@astrojs/mdx**・亥・螳ｹ謾ｯ謖・md / mdx・・- **Motion**・・motion/react`・檎畑莠・island 蜀・噪蠕ｮ蜉ｨ謨茨ｼ・- **Canvas**・域弌遨ｺ / 轤ｹ蜃ｻ轣ｫ闃ｱ・・- **pnpm**・亥桁邂｡逅・ｼ・
> 譏守｡ｮ荳堺ｽｿ逕ｨ・哢ext.js / Nuxt縲∝､ｧ蝙・UI 蠎難ｼ・ntD/MUI・峨《hadcn 逧ｮ閧､縲∫悄螳樊焚謐ｮ蠎・/ 驩ｴ譚・∝ｯ梧枚譛ｬ郛冶ｾ大勣縲》hree.js / 3D縲・㍾蝙狗憾諤∝ｺ薙∵紛遶・SPA縲・
---

## 刀 鬘ｹ逶ｮ扈捺桷

```txt
worldline-archive/
笏懌楳 astro.config.mjs
笏懌楳 tsconfig.json               # @/* -> src/*
笏懌楳 package.json
笏懌楳 public/
笏・ 笏懌楳 favicon.svg
笏・ 笏披楳 images/photos/*.svg      # 逶ｸ蜀悟頃菴榊崟・域裏 EXIF・・笏懌楳 scripts/
笏・ 笏披楳 sync-github.ts           # GitHub 蜷梧ｭ･・育ｬｬ荳迚・mock・・笏披楳 src/
   笏懌楳 config/                  # 遶咏せ / 蜉溯・蠑蜈ｳ / 蟇ｼ闊ｪ / 荳ｻ鬚・/ 蠑ｹ蟷・驟咲ｽｮ
   笏懌楳 content/                 # 7 荳ｪ蜀・ｮｹ髮・粋 + config.ts・・chema・・   笏・ 笏懌楳 posts/ moments/ bugs/ projects/ anime/ music/ photos/
   笏懌楳 components/
   笏・ 笏懌楳 effects/              # Starfield / Danmaku / CustomCursor / ClickSpark / PageEnter
   笏・ 笏懌楳 common/               # Icon / GlassCard / SectionTitle / TagList / StatusBadge / EmptyState / PageHeader
   笏・ 笏懌楳 layout/               # SiteLayout / Header / MobileNav / Footer
   笏・ 笏懌楳 home/                 # ProfileCard / TerminalLog / RecentTimeline / NowPlayingCard / GitHubActivityCard
   笏・ 笏懌楳 cards/                # Article / Moment / Bug / Project / Anime / Music / Photo
   笏・ 笏懌楳 timeline/  archive/  search/  music/
   笏懌楳 lib/                     # 蜀・ｮｹ隸ｻ蜿・+ 鬚・蕗譛榊苅讓｡蝮暦ｼ・ithub/apple-music/auth/comments/storage・・   笏懌楳 data/github/             # repos.json / activity.json・・ock・・   笏披楳 styles/global.css        # Tailwind v4 + 隶ｾ隶｡ token + 扈・ｻｶ邀ｻ
```

---

## 噫 蜷ｯ蜉ｨ & 譫・ｻｺ蜻ｽ莉､

```bash
# 螳芽｣・ｾ晁ｵ・pnpm install

# 譛ｬ蝨ｰ蠑蜿托ｼ磯ｻ倩ｮ､ http://localhost:4321・・pnpm dev

# 逕滉ｺｧ譫・ｻｺ・郁ｾ灘・蛻ｰ dist/・・pnpm build

# 鬚・ｧ域桷蟒ｺ莠ｧ迚ｩ
pnpm preview

# 逕滓・ GitHub mock 謨ｰ謐ｮ・亥・蜈･ src/data/github/*.json・・pnpm sync:github
```

---

## 笨搾ｸ・蜀・ｮｹ豺ｻ蜉譁ｹ蠑・
謇譛牙・螳ｹ驛ｽ譏ｯ `src/content/<髮・粋>/` 荳狗噪 Markdown・・.md` / `.mdx`・峨Ｇrontmatter 逕ｱ `src/content/config.ts` 驥檎噪 Zod schema 譬｡鬪鯉ｼ・*蟄玲ｮｵ荳榊粋豕穂ｼ壼ｯｼ閾ｴ build 螟ｱ雍･**縲よ園譛蛾寔蜷磯・謾ｯ謖・`visibility: public | hidden | private`・磯ｻ倩ｮ､ `public`・檎ｬｬ荳迚亥宵貂ｲ譟・public・峨よ律譛溷・ `YYYY-MM-DD` 蜊ｳ蜿ｯ縲・
### 螯ゆｽ墓眠蠅樊枚遶・・osts・・`src/content/posts/my-post.md`・・```md
---
title: "譬・｢・
description: "荳蜿･隸晄遭隕・
date: 2025-06-01
tags: ["astro", "髫冗ｬ・]
mood: "蟷ｳ髱・          # 蜿ｯ騾・draft: false          # 蜿ｯ騾会ｼ荊rue 荳榊・邇ｰ蝨ｨ蛻苓｡ｨ
---
豁｣譁・畑 Markdown 荵ｦ蜀吮ｦ窶ｦ
```

### 螯ゆｽ墓眠蠅櫁ｯｴ隸ｴ・・oments・・`src/content/moments/m09.md`・亥・螳ｹ蜀吝惠 frontmatter 逧・`content`・会ｼ・```md
---
content: "莉雁､ｩ隹・ｺ・ｸ謨ｴ螟ｩ逧・ｸ・ｱ・檎ｻ井ｺ主ｯｹ鮨蝉ｺ・・
date: 2025-06-02
mood: "逍ｲ諠ｫ菴・ｻ｡雜ｳ"    # 蜿ｯ騾・weather: "螟壻ｺ・        # 蜿ｯ騾・tags: ["譌･蟶ｸ"]         # 蜿ｯ騾・---
```

### 螯ゆｽ墓眠蠅・Bug 隶ｰ蠖包ｼ・ugs・・`src/content/bugs/my-bug.md`・・status` 蠢・｡ｫ・会ｼ・```md
---
title: "陦ｨ蜊暮㍾螟肴署莠､"
date: 2025-06-03
status: "fixed"        # fixed | investigating | wontfix | note
severity: "high"       # 蜿ｯ騾・low|medium|high|critical
summary: "荳蜿･隸晉鴫雎｡"
project: "worldline-archive"  # 蜿ｯ騾・cause: "譬ｹ蝗鞫倩ｦ・       # 蜿ｯ騾・solution: "菫ｮ螟肴遭隕・    # 蜿ｯ騾・tags: ["frontend"]
---
## 邇ｰ雎｡
## 譬ｹ蝗
## 菫ｮ螟肴婿譯・## 螟咲尨
```

### 螯ゆｽ墓眠蠅樒分蜑ｧ・・nime・・`src/content/anime/a09.md`・・status` 蠢・｡ｫ・形score` 0窶・0・会ｼ・```md
---
title: "菴懷刀蜷・
titleJP: "譌･譁・錐"      # 蜿ｯ騾・date: 2025-06-04
status: "watching"     # watching|completed|planned|paused|dropped
score: 8.5             # 蜿ｯ騾・episodes: 12           # 蜿ｯ騾・currentEpisode: 5      # 蜿ｯ騾・season: "2025 譏･"       # 蜿ｯ騾・year: 2025             # 蜿ｯ騾・tags: ["蜴溷・"]
thoughts: "遏ｭ隸・        # 蜿ｯ騾・---
```

### 螯ゆｽ墓眠蠅樣浹荵撰ｼ・usic・・`src/content/music/mu09.md`・・type` 蠢・｡ｫ・・*豁瑚ｯ榊宵蜀吝次蛻帷洒蜿･・悟響謳ｬ霑千悄螳樊ｭ瑚ｯ・*・会ｼ・```md
---
title: "譖ｲ蜷・
artist: "濶ｺ莠ｺ"
album: "荳楢ｾ・          # 蜿ｯ騾・date: 2025-06-05
type: "song"           # song | album | playlist
mood: "豺ｱ螟・           # 蜿ｯ騾・comment: "荳蜿･諢滓Φ"     # 蜿ｯ騾・lyricsQuote: "蜴溷・豌帛峩遏ｭ蜿･"  # 蜿ｯ騾会ｼ檎ｦ∵ｭ｢逵溷ｮ樊ｭ瑚ｯ・appleMusicUrl: ""       # 蜿ｯ騾牙､夜得
tags: ["citypop"]
---
```

### 螯ゆｽ墓眠蠅樒・迚・ｼ・hotos・・蜈域滑蜊菴榊崟・・VG/蝗ｾ迚・ｼ画叛蛻ｰ `public/images/photos/`・悟・蟒ｺ `src/content/photos/my-album.md`・・images` 閾ｳ蟆・1 蠑・会ｼ・```md
---
title: "螟懃ｩｺ隗よｵ・
date: 2025-06-06
album: "night-sky"     # 蜿ｯ騾・description: "謠剰ｿｰ"     # 蜿ｯ騾・images:
  - /images/photos/ns-01.svg
  - /images/photos/ns-02.svg
tags: ["螟懃ｩｺ"]
mood: "螳蛾撕"
---
```
> 髫千ｧ・ｼ壻ｸ崎ｦ∵叛逵溷ｮ樒・迚・ｼ御ｸ崎ｦ∵垓髴ｲ EXIF / 蝨ｰ逅・ｿ｡諱ｯ縲・
---

## 耳 UI 鬟取ｼ隸ｴ譏・
- **驟崎牡**・壽ｷｱ闢晞ｻ大､懃ｩｺ・・--ia-bg` `#05070f`・峨∵弌逋ｽ縲・搨・・eon・峨∫ｴｫ・・ebula・峨∵・蜉溽ｻｿ / 隴ｦ蜻企ｻ・/ 蜊ｱ髯ｩ邊峨ょ・驛ｨ髮・ｸｭ蝨ｨ `global.css` 逧・CSS 蜿倬㍼荳・`@theme`縲・- **蜊｡迚・*・啻.glass` / `.glass-card`・域ｯ帷悉迺・+ 謔ｬ豬ｮ閨壼・ spotlight・瑚ｷ滄囂鮠譬・ｼ峨～.corner-ticks`・亥屁隗貞綾郤ｿ・峨・- **扈育ｫｯ諢・*・啻.terminal-line`・遺螺・峨～.diamond`・遺裸・峨∫ｭ牙ｮｽ謨ｰ蟄・`.mono`縲∝曙隸ｭ譬・ｭｾ・亥ｦ・`ARCHIVE // 譯｣譯・・峨・- **迚ｹ謨・*・壽弌遨ｺ隗・ｷｮ・・anvas・峨∝ｼｹ蟷募ｱゅ∬・螳壻ｹ牙・譬・∫せ蜃ｻ轣ｫ闃ｱ縲∬ｷｯ逕ｱ霑帛惻謇ｫ蜈峨ょ插蜿ｯ陲ｫ `prefers-reduced-motion` 蜈ｳ髣ｭ縲・- **蜉ｨ謨・*・啻.reveal` 霑帛惻豬ｮ邇ｰ・・ntersectionObserver・峨〃iew Transitions 鬘ｵ髱｢蛻・困縲・
---

## 導 遘ｻ蜉ｨ遶ｯ騾る・隸ｴ譏・
- 蟶・ｱ蜊募・莨伜・・梧・ｼ蝨ｨ `sm/lg` 譁ｭ轤ｹ螻募ｼ・・- 蠎暮Κ `MobileNav` TabBar・・md` 莉･荳区仞遉ｺ・会ｼ梧ｭ｣譁・畑 `.main-has-tabbar` 鬚・蕗蠎暮Κ遨ｺ髣ｴ・碁∩蜈崎｢ｫ驕ｮ謖｡・・- 隗ｦ鞫ｸ隶ｾ螟・・蜉ｨ**蜈ｳ髣ｭ閾ｪ螳壻ｹ牙・譬・*・井ｻ・`pointer:fine` 蜷ｯ逕ｨ・会ｼ・- hover 謨域棡蝨ｨ遘ｻ蜉ｨ遶ｯ霓ｬ荳ｺ蜿ｯ隗∝叉蜿ｯ逧・撕諤∵ｷ蠑擾ｼ・- 蠑ｹ蟷・/ 譏滓弌謨ｰ驥丞惠遘ｻ蜉ｨ遶ｯ閾ｪ蜉ｨ髯埼㍼・・- 蜈ｨ螻 `overflow-x: hidden`・梧裏讓ｪ蜷第ｻ壼勘縲・
---

## 圸 Feature Flags・・src/config/features.ts`・・
| flag | 鮟倩ｮ､ | 隸ｴ譏・|
| --- | --- | --- |
| `auth` | `false` | 譏ｯ蜷ｦ譏ｾ遉ｺ逋ｻ蠖・/ 蜷主床蜈･蜿｣・・ooter / About 隗定誠・・|
| `comments` | `false` | 隸・ｮｺ邉ｻ扈滂ｼ亥・髣ｭ譌ｶ霑泌屓遨ｺ郤ｿ遞具ｼ・|
| `onlineEditor` | `false` | 蝨ｨ郤ｿ蜿大ｸ・勣 |
| `appleMusic` | `false` | Apple Music 逵溷ｮ樊磁蜈･ |
| `githubSync` | `true` | GitHub 謨ｰ謐ｮ螻慕､ｺ・育ｬｬ荳迚郁ｯｻ mock JSON・・|
| `privatePosts` | `false` | 譏ｯ蜷ｦ謾ｾ陦・hidden / private 蜀・ｮｹ・域悴譚･逋ｻ蠖募錘・・|
| `pagefindSearch` | `false` | 譏ｯ蜷ｦ蜷ｯ逕ｨ Pagefind 蜈ｨ譁・頗邏｢ |

---

## ｧｪ mock / 鬚・蕗隸ｴ譏・
隨ｬ荳迚井ｻ･荳句・螳ｹ荳ｺ **mock 謌也ｺｯ UI 鬚・蕗**・瑚ｯｦ隗∝推 `src/lib/*/README.md`・・
- GitHub 莉灘ｺ・/ 豢ｻ蜉ｨ謨ｰ謐ｮ・・src/data/github/*.json` + `src/lib/github`・・- Apple Music 譖ｲ逶ｮ縲¨ow Playing縲∬ｿ樊磁謖蛾聴・・src/lib/apple-music`・・- 逋ｻ蠖・/ 譚・剞・・src/lib/auth`・梧ｰｸ霑懈悴逋ｻ蠖包ｼ・- 隸・ｮｺ邉ｻ扈滂ｼ・src/lib/comments`・瑚ｿ泌屓遨ｺ・・- 蝗ｾ迚・ｭ伜お・・src/lib/storage`・瑚ｿ泌屓譛ｬ蝨ｰ蜊菴搾ｼ・- 逶ｸ蜀悟・驛ｨ荳ｺ SVG 蜊菴榊崟

---

## 亮 譛ｪ譚･隶｡蛻・
- [ ] **GitHub API 蜷梧ｭ･**・哦raphQL 諡我ｻ灘ｺ・+ REST 諡・commits/issues/PR・隈itHub Actions 螳壽慮逕滓・髱呎・JSON縲・- [ ] **Apple Music 謗･蜈･**・哺usicKit 謗域揀 + 譛榊苅遶ｯ遲ｾ蜿・developer token縲・- [ ] **AniList / Bangumi 謗･蜈･**・夂分蜑ｧ閾ｪ蜉ｨ蜷梧ｭ･隗ら恚霑帛ｺｦ荳主・謨ｰ謐ｮ縲・- [ ] **Supabase Auth**・夐ぐ邂ｱ鬲疲ｳ暮得謗･ / GitHub OAuth・御ｻ・ｫ咎柄霑帛錘蜿ｰ縲・- [ ] **Supabase Storage**・夂・迚・ｸ贋ｼ・域恪蜉｡遶ｯ蜑･遖ｻ EXIF・峨・- [ ] **隸・ｮｺ邉ｻ扈・*・啀ostgres + RLS・瑚ｮｿ螳｢逋ｻ蠖募錘隸・ｮｺ・檎ｫ咎柄螳｡譬ｸ縲・- [ ] **蝨ｨ郤ｿ蜷主床**・壼惠郤ｿ蜿大ｸ・枚遶 / 隸ｴ隸ｴ / 辣ｧ迚・ｼ檎ｮ｡逅・ｯ・ｮｺ縲・- [ ] **Pagefind 謳懃ｴ｢**・壽桷蟒ｺ譛溽函謌宣撕諤∝・譁・ｴ｢蠑包ｼ梧髪謖∵ｭ｣譁・ｺｧ譽邏｢縲・
---

## 笞・・蟾ｲ遏･髯仙宛

- GitHub / Apple Music / 隸・ｮｺ / 逋ｻ蠖・/ 蟄伜お蝮・ｸｺ mock 謌・UI 鬚・蕗・梧裏逵溷ｮ樊焚謐ｮ縲・- 謳懃ｴ｢莉・ｦ・尠譬・｢・/ 謠剰ｿｰ / 譬・ｭｾ・梧悴隕・尠豁｣譁・ｼ育ｭ・Pagefind・峨・- 逶ｸ蜀御ｸｺ蜊菴榊崟・碁撼逵溷ｮ樒・迚・・- 譌 RSS / sitemap 荵句､也噪 SEO 豺ｱ蠎ｦ莨伜喧・亥庄蜷守ｻｭ陦･・峨・
---

## 痩 荳倶ｸ豁･蠑蜿大ｻｺ隶ｮ

1. 蜈域磁 **Pagefind**・育ｺｯ髱呎√∵・譛ｬ譛菴趣ｼ御ｽ馴ｪ梧署蜊・・譏ｾ・峨・2. 蜀肴磁 **GitHub 蜷梧ｭ･**・域滑 `scripts/sync-github.ts` 謐｢謌千悄螳・API + Actions cron・峨・3. 髴隕∽ｺ貞勘譌ｶ蜀堺ｸ・**Supabase Auth + 隸・ｮｺ**縲・4. 譛蜷主★ **蝨ｨ郤ｿ蜷主床**・井ｾ晁ｵ・Auth + Storage・峨・
譖ｴ隸ｦ扈・噪霑帛ｺｦ荳主・遲冶ｧ・[`TODO_WORLDLINE_ARCHIVE.md`](./TODO_WORLDLINE_ARCHIVE.md)縲・