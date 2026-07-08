---
title: "移动端布局横向滚动"
date: 2025-06-28
project: "Worldline Archive"
severity: "low"
status: "fixed"
tags: ["Bug", "移动端", "CSS"]
summary: "底部导航和宽度计算导致移动端出现横向滚动条。"
cause: "部分容器使用 100vw，未考虑滚动条和安全区域。"
solution: "改用 100% 宽度，补充 safe-area 间距并限制 overflow-x。"
relatedFiles: ["src/styles/global.css", "src/components/layout/MobileNav.astro"]
visibility: "public"
---
## 邇ｰ雎｡

謇区惻荳頑ｭ｣譁・怙蜷惹ｸ谿ｵ陲ｫ TabBar 逶紋ｽ擾ｼ碁｡ｵ髱｢霑倩・蟾ｦ蜿ｳ譎・・荳譚｡郛昴・
## 蠖ｱ蜩崎激蝗ｴ

謇譛臥ｧｻ蜉ｨ遶ｯ鬘ｵ髱｢逧・庄隸ｻ諤ｧ荳取焔諢溘・
## 隹・衍霑・ｨ・
1. 逵滓惻譽譟･・悟ｺ墓・`fixed` 菴・`main` 譌蠎暮Κ蜀・ｾｹ霍昴・2. 騾蝉ｸｪ蜈・ｴ謗呈衍・悟ｮ壻ｽ榊芦荳荳ｪ `width: 100vw` 逧・・髫疲擅縲・
## 譬ｹ蝗

`100vw` 蛹・性貊壼勘譚｡螳ｽ蠎ｦ・悟惠驛ｨ蛻・ｧｻ蜉ｨ豬剰ｧ亥勣荳願ｶ・・隗・哨・帛崋螳壼ｺ墓乗悴陲ｫ豁｣譁・∩隶ｩ縲・
## 菫ｮ螟肴婿譯・
- `main` 蠎暮Κ `padding` 蜿蜉 `env(safe-area-inset-bottom)`・・- 貊｡螳ｽ蜈・ｴ謾ｹ `width: 100%`・・- 譬ｹ闃らせ `overflow-x: hidden` 蜈懷ｺ輔・
## 蝗槫ｽ呈ｵ玖ｯ・
iOS / Android 蜷・ｸ蜿ｰ逵滓惻・檎ｺｵ蜷第ｻ大勘譌讓ｪ蜷第竃蜉ｨ・梧ｭ｣譁・ｸ崎｢ｫ驕ｮ謖｡縲・
## 螟咲尨

遘ｻ蜉ｨ遶ｯ隕√瑚ｮ､逵溷★・御ｸ崎ｦ∝錘陦･縲阪ょｮ牙・蛹ｺ蜥・100vw 譏ｯ荳､荳ｪ扈丞・髯ｷ髦ｱ縲・
## 蜈ｳ閨秘｡ｹ逶ｮ

Worldline Archive縲・