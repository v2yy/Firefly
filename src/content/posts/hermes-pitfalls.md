---
title: Hermes Agent 踩坑实录：从安装到多端消息、服务器与 Cloudflare 全记录
published: 2026-09-28 19:30:00
updated: 2026-09-28 19:30:00
description: 把安装 Hermes Agent 以来真实踩过的坑按「安装环境 / 模型凭证 / 消息通道 / 浏览器工具 / 远程运维 / Pages 迁移」分类整理，每一条都带症状、根因和解法。
image: ""
tags: [Hermes, AI Agent, 运维, 踩坑记录]
category: 技术笔记
draft: false
pinned: false
comment: true
---

这台机器上的 Hermes Agent 已经陪我跑了两个月，从 macOS 本机到 Vultr VPS，从 Telegram/企业微信/微信多通道到 Cloudflare Pages。中间踩的坑不少，有的查了一小时才发现是"错误提示在骗人"。这篇按分类整理成清单，症状 → 根因 → 解法，遇到同款问题时直接对号入座。

## 一、安装与本机环境

### 1. 安装体积到底多大？
`~/.hermes` 实测 **8.5G**，看着吓人但大头都有出处：

- `hermes-agent/` 5.6G：本体源码，其中 `.git` 2.5G（升级历史）、`node_modules` 1.0G（桌面端/TUI）、`venv` 927M（Python 运行时）
- `tools/` 972M：自动下载的 chromium、独立 node、cua-driver 等
- `state.db` 304M：**会话数据库，删了整个聊天记录就没了**，别当缓存清

真正能安全回收的只有 `cache/scratch` 和各种日志，软件本体约 7.5G 属正常水平。

### 2. npm 全局装包 EACCES
macOS 下往 `/usr/local` 写全局包会权限报错。统一改用独立 prefix：

```bash
npm i -g <pkg> --prefix ~/.npm-global
# PATH 里加 ~/.npm-global/bin（写在 ~/.zprofile）
```

另一个坑：有些 CLI 自带的 `xxx update` 不认你的 prefix（比如 chatlab-cli），升级仍要回到 `npm i -g --prefix ~/.npm-global <pkg>@latest`。

### 3. Node 版本大一统
机器上同时躺着 brew node、nvm node、pkg 安装的 node 时，脚本会以谁先入 PATH 说了算，构建行为玄学。收敛方案：nvm 设 default 版本 + 全局 CLI 全部搬进 `~/.npm-global`，然后卸掉 brew 版 node。系统残留的 `/usr/local/bin/node`（pkg 装的）最后要么删掉要么确保 PATH 顺序。

## 二、模型 Provider 与凭证

### 1. "No usable credentials" 的假警报（经典陷阱）
症状：`Could not resolve credentials for provider X: No usable credentials found`，提示你去设环境变量。

真相：**key 可能完全有效**。凭证池 `~/.hermes/auth.json` 的 `credential_pool.<provider>` 每项带 `last_status` / `failure_reason` 状态字段，一次 402（billing）会把它标成 `exhausted`，之后即使账户恢复，Hermes 仍按标记判定"无可用凭证"。

处理流程：

```bash
# 1. 先证伪：直接拿 key 调一次 provider API，200 就说明 key 是好的
# 2. 备份后重置
cp ~/.hermes/auth.json ~/.hermes/auth.json.bak
hermes auth reset <provider>   # 实测可能不彻底，必须回读文件确认
# 3. 不彻底就手改 JSON：把 last_status / failure_reason / last_error_* 全部置 null，request_count 归零
# 4. 验证：hermes auth status + 实跑一次，输出里没有 "Switched to fallback" 才算过
```

### 2. CLI 通了、gateway 还在报错
gateway 是常驻进程，凭证状态在内存里；CLI 每次新进程读磁盘。清完磁盘状态后如果 gateway 仍报错，需要 `hermes gateway restart`。

重启多 profile 时别用裸 `--replace`——它会误杀默认网关（web-ui 托管会自动拉起的那个），要按 pid 文件精确 kill 再启动对应 profile。

### 3. 自定义 provider 的模型在 /model 里看不到
`hermes model` 选择器只管官方 portal，自定义模型用别名暴露：

```bash
hermes config set model_aliases.<name>.model '<model-id>'
hermes config set model_aliases.<name>.provider '<provider>'
# 之后 /model <name> 任意平台可切
```

坑：一次性命令 `hermes chat -m <alias>` 在已有默认 provider 时**不会解析用户别名**，会静默归一化到默认模型。走 `/model` 或环境变量 `HERMES_INFERENCE_PROVIDER` 才可靠。

### 4. 图像生成：Web UI 端点没起来怎么办
走 `apikey-image-gen` 那条路时如果本机 8648 端口压根没监听（Web UI 没跑），不要死等——直接用 provider 的 **chat completions 多模态路由**生成图像。注意百炼这类中转端的响应是非标准结构：图片 URL 藏在 `output.choices[0].message.content[0].image`，不是 OpenAI 标准的 `choices` 顶层。

## 三、消息通道（Telegram / 企业微信 / 微信）

### 1. "通道显示已连接，但消息永远不回"——先查 home_channel
最高优先级的静默故障：profile 的 `home_channel` 缺 `platform` 键 → `load_gateway_config()` 抛 `KeyError: 'platform'` → **该 profile 所有适配器直接不启动**，但界面上看着一切正常。

```bash
hermes --profile <name> config set platforms.wecom.home_channel.platform wecom
# 然后重启 gateway；修完一个 profile 记得扫一遍所有 profile，同病往往成串
```

### 2. 第二高频：发送者没配对
日志里出现 `Unauthorized user ... on wecom` 且对方收到 "pairing code: XXXX"，批准即可：

```bash
hermes -p <profile> pairing approve wecom <CODE>
```

### 3. 群消息永远不回 ≠ DM 配对问题
`group_policy: pairing`（默认）会**丢弃全部群流量**。逐群放行：

```bash
hermes config set platforms.wecom.group_policy allowlist
hermes config set platforms.wecom.group_allow_from '["<chatid>"]'
# 改完要 gateway restart（这项在适配器构造期读取）
```

### 4. 白名单类环境变量必须放全局 .env
`WECOM_ALLOW_ALL_USERS=1` 这类开关由 gateway 进程 `os.getenv()` 读取，而 **profile 的 .env 永远不会合并进 os.environ**。写在 profile `.env` 里静默无效，只有 `~/.hermes/.env` 生效。

验证也别看 `/proc/<pid>/environ`——那是 exec 时快照，dotenv 启动后的改动看不见。以行为或 gateway.log 为准。

### 5. 企微/微信刷屏 "💻 Running …"
这些平台不能编辑已发送消息，工具进度每条都会变成新气泡。顶层 `display.tool_progress: all` 在桌面端很香，但会压过平台默认的静默档：

```bash
hermes config set display.platforms.wecom.tool_progress false
# display 配置每回合解析，不用重启
```

### 6. 微信 iLink 通道连发丢消息
同账号 30 秒内连发多条消息/媒体会被冷却丢弃，批量交付时要**间隔发送**，不要一个回合甩十条。

## 四、浏览器自动化与多媒体工具

### 1. 连主人自己的 Chrome：走 CDP，别拷 profile
云浏览器拿不到登录态时，优先 `browser.cdp_url = http://127.0.0.1:9222` 直连本机开调试端口的 Chrome。`use_real_profile`（拷贝真实 profile）在 Chrome 运行中必然被写锁卡死。切标签的 `Target.activateTarget` 不可靠，用 `new_tab()` 开新标签自带登录态。

### 2. macOS 图片处理两连坑
- `sips -s format webp` 在部分系统版本直接报 `Can't write format` → 改走 ffmpeg 或 PIL
- ffmpeg 想编码 **avif** 需要 `libaom/encoder`，常见发行版没带 → 目标 `.avif` 时先试，失败退回 PNG 交给构建工具优化

### 3. 二维码裁剪：OpenCV 有边界，视觉模型补位
`cv2.QRCodeDetector` 能解标准方形 QR（裁完还能解码自证），但对**微信赞赏码这种圆形太阳码**完全无效——它根本不是 QR 格式。可行流程：

1. 标准 QR：`detect()` 拿四角坐标 → 裁方块 + 白边静区 → `detectAndDecode` 验证解出的链接和原图一致
2. 太阳码：`vision_analyze` 让多模态模型估圆心半径 → 按几何裁剪 → 再用视觉复检"无切边、无残留文字"

最后从**线上 URL** 拉回来做一次端到端解码/复检，防 CDN 给你旧图。

### 4. giscus 评论报 "app is not installed on this repository"
仓库开了 Discussions 也会报——**giscus 这个 GitHub App 必须单独安装授权**：`github.com/apps/giscus` → 只选博客仓库 → Install and Authorize（会要求 passkey 二次验证）。装完不用改任何代码，刷新页面评论区就出来了。

## 五、远程服务器运维（VPS / SSH）

### 1. 海外 VPS 的 SSH 玄学超时
Vultr 东京机从国内连经常 `Connection timed out during banner exchange`，但 443 端口 curl 秒通。结论：**线路抖动，不是机器死了**，别上机排查——套一层 2~3 次重试循环即可。

### 2. 内联 ssh 命令是引号地狱，永远走脚本 + stdin
```bash
ssh host 'bash -s' < /tmp/probe.sh
```
内联字符串里出现中文括号、`%{...}`、嵌套引号、`python3 -c` 时必炸。长命令还有 `Argument list too long` 风险。

### 3. 构建类长任务要完全脱离 ssh 会话
直接 `nohup ... &` 挂在 ssh 里，ssh 断开仍可能带走子进程：

```bash
ssh host 'cd /opt/x && (setsid nohup bash -c "pnpm run build && ...; echo EXIT=\$?" >> build.log 2>&1 < /dev/null &); echo started'
# 之后另开连接 tail build.log 轮询
```

反面教材：`pkill -f xxx` 的匹配串也会命中你 ssh 命令自己，把会话杀死——用字符类打断如 `pkill -f "kev[.]serve"`。

### 4. nginx 的 403 不是 404
静态站上「目录存在但没有 index.html」返回 403。写了 `error_page 403 404 /404.html;` 状态码**仍然是 403**（原始码透传），必须加等号强制改写：

```nginx
error_page 403 404 =404 /404.html;
```

### 5. Cloudflare 橙云下的证书与缓存
- HTTP-01 验证可以穿过 CF 代理正常签 Let's Encrypt，源站选 **Full** 模式；但代理会把静态资源边缘缓存 4h，**换图后 URL 加版本号**（`alipay.png?v=20260928`）是最省事的破缓存手段，比登录后台刷缓存快
- 域名 NS 在 CF、解析走橙云时，`dig` 到的是 CF 边缘 IP 而不是你的 VPS——这是特性不是解析失败

### 6. 本机 DNS 会骗人
家庭网络装了分流代理时，`dig` 本机可能返回 `198.18.x.x` 这类假 IP。验证公网解析一律走 DoH：

```bash
curl -s "https://dns.google/resolve?name=example.com&type=A"
```

## 六、静态站迁 Cloudflare Pages（本博客就是例子）

Astro 静态站从 VPS 搬 Pages 的完整拼图：

1. **仓库先干净**：内容全部 commit + push（Pages 只认 git）
2. **构建环境**：Pages 里设环境变量 `NODE_VERSION=22`；用 corepack 的话再加 `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`，否则 `pnpm install` 会卡在交互式提问等不到人
3. **域名绑定**：项目 → Domains → 设置自定义域；DNS 本来就在 CF 的域会自动把 A 记录换成 Pages CNAME
4. **www/apex 跳转放在 zone 规则做，别放 `_redirects`**——这个坑我们踩过：站级 `_redirects` 会连子路径一起 301，把两个入口都当正式站访问时行为诡异；正确姿势是 zone 层 Redirect Rule：`https://www.v2yy.com/* → https://v2yy.com/${1}` 301
5. **Astro 内容集合的日期校验**：frontmatter `published: 2026-09-28 17:00` 会报 `Expected type "date", received "string"`——**必须写到秒** `17:00:00`

迁移后 VPS 不必退场：留一个 nginx 块把老域名 301 到新域，双轨跑一段，老链接全部无缝。

## 七、工具层的一个隐蔽坑（写给用 AI 助手运维的人）

自动化助手往文件里写配置时，如果内容里有 `XXX_KEY = "..."` 这种**长得像凭据的行**，某些脱敏管线会静默把值替换成 `***` 再落盘——语法合法但内容已废，排查半天。对策：含敏感字样的文件生成后**回读断言**没有 `***`；凭据用 argv/环境注入而不是内联字面量。

---

## 附：一条通用心法

上面一半的坑，根因都是**"表面的成功信号是假的"**：通道显示 connected 但没启动、CLI 成功但 gateway 没恢复、构建 exit 0 但产物是旧文件、dig 有返回但是代理假 IP。所以给自己立的规矩是——**状态必须回读验证，证据必须交叉来源**：写完读文件、部署完 curl 线上、清凭证后实跑一次、验解析同时看 DoH 和权威 NS。

慢一点，但每个"完成"都是真的。

> 环境：macOS + Hermes Agent、Vultr Ubuntu 24.04、Cloudflare（DNS/代理/Pages）、Astro 7 + pnpm
