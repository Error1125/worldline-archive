---
title: "把特效关进岛里：Astro Islands 实战笔记"
description: "星空、弹幕、自定义光标都想要，又不想把整站做成 React SPA，于是有了这份取舍清单。"
date: 2025-06-25
tags: ["Astro", "TypeScript", "开发记录"]
category: "技术"
mood: "专注"
featured: true
visibility: "public"
---

这个站点最大的诱惑，是「把所有会动的东西都写成 React」。

我忍住了。

## 原则

只有**真的需要在浏览器里跑**的东西，才配拥有一座岛：

- `Starfield`：canvas 逐帧动画，必须客户端
- `DanmakuBackground`：命令式 DOM 生成
- `CustomCursor` / `ClickSpark`：全靠鼠标事件
- `SearchBox` / `MusicPlayer`：交互组件

其余展示型组件一律 `.astro`，在构建期就渲染成静态 HTML。

## 收益

首屏是干净的静态页面，特效作为「岛」渐进增强。JS 挂掉了，档案馆依然能读。

> 吸收参考项目的灵魂，不要照搬它的体重。
