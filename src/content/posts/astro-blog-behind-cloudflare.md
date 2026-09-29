---
title: 静态博客挂 Cloudflare 的连环坑：图片裂图、www 跳转、收录提速
published: 2026-09-29 20:10:00
description: "个人博客（Astro 主题 + CF Pages/代理域名）踩坑合集："
tags: [[cloudflare,astro,nginx,seo]]
category: 踩坑笔记
draft: false
comment: true
---

> 知识沉淀 · 项目：blog · 源：hermes

个人博客（Astro 主题 + CF Pages/代理域名）踩坑合集：

## 1. 文章图片大面积裂 = CF 边缘缓存了 403
本地和 GitHub 仓库文件都正常时，别查前端代码——curl -I 看图 URL：`age: 30000+`、`cf-cache-status: HIT` 就是边缘缓存了错误响应。
解法：查源站响应头（nginx `error_page 403` 必须配 `=404`，裸 403 页会被原样缓存），再 Purge By URL 列表清（regex purge 有命中不了的形态）。

## 2. www→apex 308 死循环
nginx server block 里 `return 301 $host` 变量化写法在 CF 代理下会自己 308 跳自己。**CF zone 规则 rewrite 目标主机名**最干净（配置还放 CF 不依赖源站 nginx）；源站只保留裸域 server block。

## 3. Astro frontmatter
`published: YYYY-MM-DD HH:MM:SS` **必须带秒**，缺秒构建期日期校验直接报错。发布脚本统一格式化。

## 4. 收录提速
- GSC 资源只用**已验证的网域资源**（DNS TXT）；未验证的「网址前缀」资源里一切提交都是「无法抓取」假报错；
- Bing 走「Import from GSC」免二次验证 + **IndexNow** 秒级 ping（key 文件放站点根，POST api.indexnow.org，202=受理）；
- GSC 网页「请求编入索引」按钮**必须真实鼠标点击**（isTrusted 校验，JS 合成 click 面板毫无反应）。

## 5. 主题排序「新文沉底」
多半不是 bug：主题按 置顶(pinned)优先→日期降序 排。排查= grep pinned 全量文章，只有 pinned:true 的才压新文——全站一律别置顶。

<!-- src: astro-blog-behind-cloudflare.md -->
