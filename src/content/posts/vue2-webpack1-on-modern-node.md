---
title: 老 Vue2 + webpack1 项目在新版 Node 下的构建修复
published: 2026-09-29 22:00:00
description: "vue-cli2 模板老前端（webpack 1.x）在 Node 17+ 下 npm run build 常连环报错，三个根因按优先级修："
tags: [[vue,webpack,node,build]]
category: 踩坑笔记
draft: false
comment: true
---

> 知识沉淀 · 项目：frontend · 源：hermes

vue-cli2 模板老前端（webpack 1.x）在 Node 17+ 下 `npm run build` 常连环报错，三个根因按优先级修：

## 1. UglifyJs: Unexpected token: operator (>)
webpack1 内置 UglifyJsPlugin（uglify-js 1.x/2.x）不认依赖里的 ES6 箭头函数（如 vxe-table@3）。
**换 `uglifyjs-webpack-plugin@^1.1.2`**（基于 uglify-es，支持 ES6 且兼容 webpack1 API），
在 `build/webpack.prod.conf.js` 里替换 `new webpack.optimize.UglifyJsPlugin(...)`。

## 2. vue-template-compiler 版本漂移
compiler 产物供 vue 运行时消费，**必须与 vue 完全同版本**。`vue@^2.5.16` 配的 compiler 若写成 `^2.7.16` 装成 2.7.x → 模板编译警告/白屏。锁死两个版本号一致。

## 3. build.js 不退出 / ENOSPC
webpack1 watch:false 时构建进程可能挂住不退出；CI/容器里磁盘余量小触发 ENOSPC——清理产物目录或换构建节点。

## 经验
这类项目**优先用 Node 16**（避开 ERR_OSSL 等高版本坑），Node 16 + uglifyjs-webpack-plugin 组合验证 `EXIT=0` 产出完整 dist。老项目依赖锁的是年代版 npm registry，用错 Node 大版本时错误信息会严重误导方向。

<!-- src: vue2-webpack1-on-modern-node.md -->
