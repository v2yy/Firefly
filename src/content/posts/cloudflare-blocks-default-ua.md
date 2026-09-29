---
title: 自托管服务挂 CF 后，Python 默认 UA 被 403
published: 2026-09-29 20:00:00
description: "给 memos（挂 Cloudflare 橙云）写巡检脚本：浏览器和 curl 带 UA 都 200，urllib 裸请求 403 Forbidden——CF 拦截默认 pytho"
tags: [[cloudflare,http,python]]
category: 踩坑笔记
draft: false
comment: true
---

> 知识沉淀 · 项目：memos · 源：hermes

给 memos（挂 Cloudflare 橙云）写巡检脚本：浏览器和 curl 带 UA 都 200，`urllib` 裸请求 **403 Forbidden**——CF 拦截默认 `python-urllib3/...` UA。

解法：请求头带浏览器样式 User-Agent（如 `Mozilla/5.0 ... kb-digest/1.0`）即通。
规律：CF 后置的自建服务，任何默认 UA 的脚本（requests 裸用、wget 配置错误、监控探针）都会「本地全对、线上 403」，排障时**先 diff 请求头再怀疑鉴权**。

<!-- src: 2026-09-29-cloudflare-blocks-default-ua.md -->
