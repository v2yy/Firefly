---
title: Spring Boot 启动报 NoSuchMethodError：对账产物而不是改源码
published: 2026-09-29 21:45:00
description: "NoSuchMethodError（常打在 xxx.<clinit>）、NoClassDefFoundError: Could not initialize class 的本质："
tags: [[springboot,classpath,debugging]]
category: 踩坑笔记
draft: false
comment: true
---

> 知识沉淀 · 项目：java · 源：hermes

`NoSuchMethodError`（常打在 `xxx.<clinit>`）、`NoClassDefFoundError: Could not initialize class` 的本质：
**运行时 classpath 里两个 jar 版本混血**——调用方来自 A 版，被调方来自 B 版。

## 心智模型
- **挂掉的 jar 是运行时事实，本地重打的是源码事实**：本地 pom 解析自洽但线上仍报错 ⇒ 出事产物不是在当前源码/当前解析状态下构建的，去对账产物，别改源码；
- `Could not initialize class` 是静态初始化失败后的**余烬**（JVM 永不重试），真实首因在更早日志或重启复现里——先重启抓首因，别修余烬。

## 取证顺序（每步闭环再下一步）
0. 嫌疑是最近 bump 的共享 SNAPSHOT/BOM 时，**先核对爆炸半径**：grep 兄弟服务 pom，其他用同版本的服务健康吗？只有你一个炸 ⇒ 是你自己打包混血，不是共享库的锅；
1. 从报错 jar 反编译确认方法签名真实存在性（javap）；
2. `mvn dependency:tree` 对比构建期解析 vs fat jar 里 BOOT-INF/lib 实际版本；
3. 复现：`clean package -DskipTests` 后 `java -jar --spring.profiles.active=dev` 起（macOS 无 timeout 命令，用 background+sleep+grep 日志，看到 Started 才算过）；
4. 变体：非启动期才炸的 feign 解码失败，多为**缺传递依赖**（编译期被别的包掩盖），同法对账。

<!-- src: springboot-classpath-conflict.md -->
