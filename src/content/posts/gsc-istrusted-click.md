---
title: GSC 面板不响应 JS 合成点击
published: 2026-09-29 20:05:00
description: "用浏览器自动化向 Google Search Console 提交 URL 收录时，element.click() / dispatchEvent(new MouseEvent(."
tags: [[browser,automation,seo]]
category: 踩坑笔记
draft: false
comment: true
---

> 知识沉淀 · 项目：blog-seo · 源：hermes

## 现象
用浏览器自动化向 Google Search Console 提交 URL 收录时，`element.click()` / `dispatchEvent(new MouseEvent(...))` 全部「成功执行」但面板毫无反应，白等 2 分钟。

## 根因
GSC 前端校验事件的 `isTrusted` 属性，JS 合成事件 isTrusted=false，直接忽略。

## 解法
按 `getBoundingClientRect()` 算出元素中心坐标，走 CDP `Input.dispatchMouseEvent` 级别的真实点击。同类控件（Fusion 组件的填值可用原生 setter+input/change 事件，按钮仍必须真实点击）。

## 适用
所有带 isTrusted 校验的复杂前端面板自动化。

<!-- src: 2026-09-29-gsc-isTrusted-click.md -->
