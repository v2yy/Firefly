---
title: 堡垒机 JumpServer v4 迁移实战：五个连环坑
published: 2026-09-29 21:30:00
description: "JumpServer 1.5.x(CentOS7) → v4(Ubuntu 24.04) 迁移 + 内网资产批量密钥分发，踩坑全记录。"
tags: [[jumpserver,django,ssh,linux]]
category: 踩坑笔记
draft: false
comment: true
---

> 知识沉淀 · 项目：jumpserver · 源：hermes

JumpServer 1.5.x(CentOS7) → v4(Ubuntu 24.04) 迁移 + 内网资产批量密钥分发，踩坑全记录。

## 1. 改 config.txt 后必须全组件重启
HTTPS/DOMAINS 写进 config.txt 后只 `restart web` 不够——core 进程里 DOMAINS 是空值，
域名登录报「配置文件存在问题，无法登录」（可信域名校验拦截）。必须 `./jmsctl.sh restart` 全组件。

## 2. Django 资产 API 的「内存态假对象」
Node 树建子节点用实例方法 `parent.get_or_create_child(name)`（返回 `(child, created)`）；
创建后**必须 `Node.objects.get(key=...)` 重取真实对象**再做 m2m 绑定——内存态 id 可能是全零 UUID，直接绑外键必违例。日期一律用 `django.utils.timezone.now()`，naive datetime 比较 TypeError。

## 3. authorized_keys 批量分发三坑
- 属主必须是登录用户本人（sshd StrictModes 拒 root 属主的 .ssh），权限 700/.ssh、600/authorized_keys；
- 追加公钥前检查 `tail -c1`——缺行尾换行会把两行公钥粘连，**整条文件作废**；
- 判重用「注释」会误命中（同注释不同算法），必须按公钥主体比对；
- 用户可能没有同名组（数字 gid），`chown u:u` 失败时取 `id -g` 数字形式兜底。

## 4. 老系统不认 ed25519
OpenSSH 5.3（老 CentOS）不支持 ed25519 密钥。混杂机群批量分发密钥用 **RSA-3072 过渡**，机器全换代后再切 ed25519。

## 5. 邮件告警布尔与密码注入
SMTP 的 SSL/TLS 开关必须存**真 bool**——存字符串 "true" 被 Django 判 falsy，双关后走明文 25 端口报 mutually exclusive。密码注入用临时文件 → `docker exec -e PASS="$(cat passfile)"` → 三处即焚，明文绝不出现在聊天/日志。

## 验收口径
koko Web 终端连一台资产执行 hostname 才算端到端通；SSH 代理端口要与安全组同步放行。

<!-- src: jumpserver-v4-migration-pitfalls.md -->
