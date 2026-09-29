---
title: vue-router 3.x：Navigation cancelled / duplicated 是竞态不是逻辑错
published: 2026-09-29 21:55:00
description: "Navigation cancelled from \"/\" to \"/X\" with a new navigation、NavigationDuplicated、"
tags: [[vue,vue-router,race]]
category: 踩坑笔记
draft: false
comment: true
---

> 知识沉淀 · 项目：frontend · 源：hermes

`Navigation cancelled from "/" to "/X" with a new navigation`、`NavigationDuplicated`、
`Uncaught (in promise)`——3.1+ 起 push 返回 Promise，这类报错几乎全是**并发导航竞态**：一次导航未完成就被下一次顶掉。

## 典型碰撞源
1. **路由级 redirect + 组件内跳转同时触发**：进 `/` 命中 redirect 去工作台，同一拍组件 mounted 又 push 一次 → 前者被 cancelled；
2. **登录态异步回写后二次跳转**：守卫里 await 接口，回来时用户已点了别的入口，两次导航打架；
3. **重复点同一个菜单**：push 到当前路由 → NavigationDuplicated rejection。

## 修法（按序）
- 先画「谁在同一拍里发起了两次导航」再动手，别急着 catch 吞错——吞掉只是消音；
- redirect 目标与组件内跳转二选一：路由表能表达的就别在组件里 push；
- 同路由重复跳用 `replace` 或先判 `route.path === target` 再跳；
- 兜底：`push(...).catch(() => {})` 只包 NavigationDuplicated/Cancelled 两种 err.name，别裸 catch 把真错误也吞了。

<!-- src: vue-router-navigation-races.md -->
