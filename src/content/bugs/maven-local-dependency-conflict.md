---
title: "Maven 本地依赖版本冲突"
date: 2025-06-12
project: "WMS System"
severity: "high"
status: "fixed"
tags: ["Bug", "开发记录", "Maven"]
summary: "本地 SNAPSHOT 依赖被远端仓库同名旧版本覆盖，导致改动不生效。"
cause: "多模块构建时 dependencyManagement 固定版本，本地 install 被忽略。"
solution: "统一版本占位符，清理本地仓库缓存，并让模块走 reactor 引用。"
relatedFiles: ["pom.xml", "wms-core/pom.xml", "~/.m2/settings.xml"]
visibility: "public"
---
## 邇ｰ雎｡

謾ｹ莠・`wms-core` 逧・ｸ陦御ｻ｣遐・ｼ形mvn install` 譏ｾ遉ｺ謌仙粥・御ｽ・ｸ区ｸｸ讓｡蝮苓ｷ題ｵｷ譚･陦御ｸｺ螳悟・豐｡蜿假ｼ悟ワ譏ｯ蝨ｨ逕ｨ荳荳ｪ蟷ｽ轣ｵ迚域悽縲・
## 蠖ｱ蜩崎激蝗ｴ

謨ｴ譚｡萓晁ｵ・`wms-core` 逧・得霍ｯ・梧悽蝨ｰ蠑蜿大・驛ｨ蜿怜ｽｱ蜩搾ｼ佞I 蝗荳ｺ豈乗ｬ｡驛ｽ蜈ｨ驥乗級蜿厄ｼ悟渚閠梧ｭ｣蟶ｸ縲・
## 隹・衍霑・ｨ・
1. `mvn dependency:tree` 謇灘魂蜃ｺ逵溷ｮ樒函謨育沿譛ｬ・梧棡辟ｶ譏ｯ莉灘ｺ馴㈹逧・立 `RELEASE`縲・2. 蟇ｹ豈・`~/.m2/repository` 荳狗噪譌ｶ髣ｴ謌ｳ・梧悽蝨ｰ `install` 逧・jar 陲ｫ蜷守ｻｭ荳谺｡閨皮ｽ第桷蟒ｺ隕・尠縲・3. 螳壻ｽ榊芦辷ｶ POM 逧・`dependencyManagement` 謚顔沿譛ｬ髓画ｭｻ莠・・
## 譬ｹ蝗

迚域悽邂｡逅・ｸ取悽蝨ｰ蠢ｫ辣ｧ蜀ｲ遯・ｼ啻dependencyManagement` 逧・ｼ伜・郤ｧ鬮倅ｺ取悽蝨ｰ `install`・罫eactor 豐｡譛画滑蜈・ｼ滓ｨ｡蝮怜ｽ謎ｽ懷・驛ｨ蠑慕畑縲・
## 菫ｮ螟肴婿譯・
- 逕ｨ扈滉ｸ逧・`${revision}` 蜊菴咲ｬｦ邂｡逅・・讓｡蝮礼沿譛ｬ・・- `mvn -o` 遖ｻ郤ｿ譫・ｻｺ鬪瑚ｯ・ｼ・- 菫晁ｯ∬★蜷域桷蟒ｺ譌ｶ襍ｰ reactor 蜀・Κ隗｣譫舌・
## 蝗槫ｽ呈ｵ玖ｯ・
謾ｹ蜉ｨ `wms-core` 蜷惹ｸ榊・閨皮ｽ托ｼ檎峩謗･ reactor 譫・ｻｺ・御ｸ区ｸｸ遶句叉逕滓譜縲りｿ樒ｻｭ荳画ｬ｡鬪瑚ｯ・夊ｿ・・
## 螟咲尨

萓晁ｵ門ｹｽ轣ｵ譛蝮醍噪蝨ｰ譁ｹ譏ｯ縲悟ｮ・恚襍ｷ譚･謌仙粥莠・阪ゆｻ･蜷朱∞蛻ｰ縲梧隼莠・ｲ｡蜿榊ｺ斐搾ｼ檎ｬｬ荳蜿榊ｺ泌ｰｱ譏ｯ謇謎ｾ晁ｵ匁代・
## 蜈ｳ閨秘｡ｹ逶ｮ

WMS 邉ｻ扈溘・