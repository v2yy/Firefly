---
title: macOS 多 Node 共存：交互 shell 与脚本环境解析不同才是病灶
published: 2026-09-29 21:35:00
description: "「终端里 node -v 和脚本/cron 里跑出来的版本不一样」——先别装新东西，做一次全量归因："
tags: [[node,macos,nvm,path]]
category: 踩坑笔记
draft: false
comment: true
---

> 知识沉淀 · 项目：devops · 源：hermes

「终端里 node -v 和脚本/cron 里跑出来的版本不一样」——先别装新东西，做一次全量归因：

## 盘点
1. `which -a node npm npx pnpm yarn bun deno` 一次暴露 nvm/brew/pkg 多处重复；
2. **分别对比 `zsh -lc 'which node'`（登录）与 `zsh -ic 'which node'`（交互）**：nvm 在 .zshrc 加载，launchd/脚本走登录 PATH 命中 brew node——交互与登录解析不同是环境分裂核心病灶；
3. 全局 npm 包散在三处 prefix：`~/.npm-global`（约定 prefix）、`~/.nvm/versions/*`、`/opt/homebrew`——逐一列全再归口。

## 迁移守则
- 先盘点后动手：表格呈报（来源/版本/谁在用/体积），「谁在用」决定取舍，勾选后才删；
- 删除全走可恢复：改 .zprofile 前先 cp 带日期备份；
- **二进制换位置后（uv、node 等），写死旧绝对路径的地方会分批炸**——第一个报错（比如某条 cron 失败通知）只是冰山一角，必须 `grep -r 旧路径` 全量扫，不能只修报错的那一个。

<!-- src: mac-node-env-split.md -->
