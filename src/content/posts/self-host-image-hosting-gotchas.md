---
title: 自建图床（Lsky）API 与 CDN 三个坑
published: 2026-09-29 21:40:00
description: "VPS 自建 lsky-pro 图床（docker + nginx 反代 + CF）运维要点："
tags: [[image-hosting,cloudflare,laravel]]
category: 踩坑笔记
draft: false
comment: true
---

> 知识沉淀 · 项目：img · 源：hermes

VPS 自建 lsky-pro 图床（docker + nginx 反代 + CF）运维要点：

## 1. 上传字段名必须单数 file
`-F "file=@x.png"`；写成 `file[]=` 触发 `getClientOriginalExtension() on array` 异常——PHP 层报错，看不出是字段名问题。

## 2. 手搓 PNG 会被 Imagick 拒读
自己拼二进制 PNG 时若把 **sRGB 块放在 IHDR 前面**，上传报 "Unable to read image from path"——Image 文件块顺序不合规，Imagick 严格校验。用 Pillow/sips 等正规库生成。

## 3. 源站 no-cache，CF 边缘要 override_origin
Laravel 发 `Cache-Control: no-cache/private`，直链图片想被 CDN 缓存必须在 CF **边缘 TTL override_origin 1 年**。
控制台坑：TTL 输入是 downshift 自动补全控件，注入 value 后必须真实点中下拉选项才进 React 状态。

## 备份口径
数据卷整包即备份（SQLite + uploads 都在卷里），别只 dump 数据库忘传图库。

<!-- src: self-host-image-hosting-gotchas.md -->
