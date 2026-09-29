---
title: Electron 应用报错取证：解包 app.asar 判定锅在谁
published: 2026-09-29 20:20:00
description: "桌面 Electron 应用抛错（堆栈含 app.asar/out/main/index.js:行），判归属是应用、上游还是服务端："
tags: [[electron,asar,forensics]]
category: 踩坑笔记
draft: false
comment: true
---

> 知识沉淀 · 项目：debugging · 源：hermes

桌面 Electron 应用抛错（堆栈含 `app.asar/out/main/index.js:行`），判归属是应用、上游还是服务端：

1. **先钉版本**：`plutil -extract CFBundleShortVersionString raw .../Info.plist`——报错归属按版本判定；
2. **解包读真实代码**：`npx --yes @electron/asar extract <app>/Contents/Resources/app.asar ./outdir`，主进程=`out/main/index.js`+chunks，renderer 多是 UI 噪音；
3. **搜错误串**：`grep -rn '<错误串>' out/main --include='*.js'`——**必须加 --include**，否则被 *.mjs.map 的 base64 噪音淹没；
4. **主进程全文 0 命中 = 文案不在应用里**，大概率是服务端/网关原样抛回（内容审核、限流文案）→ 转验服务端，**不要**给应用仓库提 issue；
5. **代码结论必须配复现**：同 key/同模型/同端点，一次只翻一个可疑参数（role、thinking、header、长度上限），HTTP 直调坐实因果再下结论。

## 禁忌
不要热补丁 app.asar 解决问题——破坏签名、升级即失效。优先改用户配置目录 `~/.<app>/` 的 JSON，或换配置里已支持的另一条通道；换通道前先用一次 curl 探新通道，并读码确认没把同一个坑换个形式再犯一遍。

<!-- src: electron-asar-error-forensics.md -->
