---
title: "空字段导致卡片崩溃"
date: 2025-06-22
project: "Worldline Archive"
severity: "medium"
status: "fixed"
tags: ["Bug", "前端", "健壮性"]
summary: "第三方数据返回 null 字段时，组件直接读取属性导致卡片渲染失败。"
cause: "渲染层假设外部字段一定存在，缺少 fallback。"
solution: "为外部字段增加可选链和默认值。"
relatedFiles: ["src/components/cards/MusicCard.astro", "src/lib/apple-music/mock.ts"]
visibility: "public"
---
## 邇ｰ雎｡

譟仙・蠑髻ｳ荵仙今迚・紛蝮礼區謗会ｼ梧而蛻ｶ蜿ｰ謚･ `Cannot read properties of null`縲・
## 蠖ｱ蜩崎激蝗ｴ

莉ｻ菴穂ｾ晁ｵ門､夜Κ謨ｰ謐ｮ逧・ｱ慕､ｺ蜊｡迚・ｼ碁・蜿ｯ閭ｽ陲ｫ荳荳ｪ null 諡門椣縲・
## 隹・衍霑・ｨ・
1. 螳壻ｽ肴冠髞咏ｻ・ｻｶ・悟書邇ｰ逶ｴ謗･ `data.cover.url`縲・2. 謚灘桁逵句芦隸･譚｡謨ｰ謐ｮ `cover` 荳ｺ `null`縲・
## 譬ｹ蝗

縲御ｹ占ｧょ慍逶ｸ菫｡螟夜Κ謨ｰ謐ｮ螳梧紛縲阪ら悄螳樔ｸ也阜逧・磁蜿｣荳堺ｼ壽ｰｸ霑懷埋濶ｯ縲・
## 菫ｮ螟肴婿譯・
- 蟄玲ｮｵ荳蠕句庄騾蛾得隸ｻ蜿厄ｼ・- 郛ｺ蟆・擇 竊・貂仙序蜊菴搾ｼ帷ｼｺ譁・｡・竊・鮟倩ｮ､豌帛峩蜿･・・- mock 螻ら音諢丈ｿ晉蕗荳譚｡ null 謨ｰ謐ｮ・碁ｼ扈・ｻｶ髟ｿ蜃ｺ髦ｲ蠕｡諤ｧ縲・
## 蝗槫ｽ呈ｵ玖ｯ・
豕ｨ蜈･郛ｺ蟄玲ｮｵ縲∫ｩｺ謨ｰ扈・∬ｶ・柄譁・悽荳臥ｧ崎э謨ｰ謐ｮ・悟今迚・插豁｣蟶ｸ髯咲ｺｧ縲・
## 螟咲尨

螂ｽ逵狗噪蜑肴署譏ｯ**蜈井ｸ榊ｴｩ**縲ょ頃菴榊崟荳肴弍蛛ｷ諛抵ｼ梧弍謚､譬上・
## 蜈ｳ閨秘｡ｹ逶ｮ

Worldline Archive縲・