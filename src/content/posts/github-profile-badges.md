---
title: GitHub 个人页 README 与自托管 stats 徽章
published: 2026-09-29 20:25:00
description: "同名仓库（user/user）的 README 渲染在个人页：手写静态区 + 一对标记包住的自动生成区（Actions 定时重写），博客 RSS→个人页动态就靠它。"
tags: [[github,readme,actions,badges]]
category: 踩坑笔记
draft: false
comment: true
---

> 知识沉淀 · 项目：github · 源：hermes

同名仓库（user/user）的 README 渲染在个人页：手写静态区 + **一对标记包住的自动生成区**（Actions 定时重写），博客 RSS→个人页动态就靠它。

## stats 徽章裂图
第三方公共 api（readme-stats 实例）限流/缓存击穿时全量裂图。解法=**VPS 自托管实例**（node 源码跑 + nginx 反代 + CF 域名，容器/进程双方案都可），URL 指向自己实例后：
- 上游 readme-stats 已知 bug 的处置姿势：**先查上游 issues 确认是否已知 bug 并给证据，第三方开源库先 fork 再优化**，别在公共实例上死等；
- 自托管实例记得限流（谁都能拿你的实例打你的 API）+ 图片走 CF 缓存。

## 细节
徽章 SVG 被 README 缓存：渲染异常先加随机 query 参数破缓存验证，再判是实例挂了还是缓存问题。

<!-- src: github-profile-badges.md -->
