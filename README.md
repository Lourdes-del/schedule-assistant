# 日程与通知助手（Campus Schedule）

面向大学生的「日程与通知助手」：粘贴学校 / 社团 / 课程通知，AI 帮你提取关键信息并整理成日程；也可以直接和 AI 助手对话来补充日程、提问学习相关的问题。界面简洁、适配手机，支持多用户注册，数据互相隔离。

> 本项目 **不依赖任何外部 AI 服务即可运行**：通知解析与 AI 对话需要你在「设置」里填入自己的 DeepSeek API Key 后才会启用；未配置时应用其余功能（注册登录、日程增删改查、提醒、通知原文存档）均可用。

## 功能特性

- **账号与个人空间**：注册 / 登录 / 退出；每位用户的通知、日程、AI 设置、助手头像互相隔离；提供个人设置页。
- **通知整理**：粘贴通知原文 → AI 提取「标题 / 类别 / 开始时间 / 截止时间 / 地点 / 对象 / 报名方式」→ **先展示给你确认，确认后才保存为日程**。缺失或含糊的信息标注为「待补充 / 待确认」，绝不编造。通知原文存档，方便事后核对。
- **日程管理**：日历视图 + 列表视图；查看 / 创建 / 编辑 / 删除；按类别筛选、关键词搜索；醒目展示即将开始与临近截止的事项。
- **AI 助手**：默认优先 DeepSeek，密钥、Base URL、模型名称均可在设置页配置（模型名不写死）；提供连接测试与清晰的错误提示；可上传 / 替换 / 删除助手头像（校验类型与大小）；支持「对话识别日程 → 回显解析结果 → 确认后创建」。
- **提醒**：为日程设置「提前 1 天 / 1 小时 / 30 分钟 / 自定义」提醒；优先用浏览器通知（请求授权），并提供站内提醒作为备用；首页与日程列表显示临近事项。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | [Next.js 15](https://nextjs.org/)（App Router）+ TypeScript + React 19 |
| 样式 | Tailwind CSS 4，响应式，全站简体中文 |
| 数据库 | SQLite，使用 Node 内置的 `node:sqlite`（`DatabaseSync`），内置迁移 |
| 校验 | [Zod](https://zod.dev/) |
| 测试 | Node 内置 test runner + `tsx` |
| AI | 服务端封装 OpenAI 兼容协议（DeepSeek 优先），密钥 AES-256-GCM 加密存储 |

> 依赖 Node.js ≥ 22.5（使用了内置 `node:sqlite`）。

## 目录结构

```
src/
  app/                  # 页面与 API 路由（App Router）
    api/                #   auth / events / notices / ai-config / chat / avatar / reminders
    (page|schedule|notices|assistant|settings|login|register)/page.tsx
  components/           # 鉴权、导航、日程卡片、日程表单、头像、提醒轮询等
  lib/
    ai/                 # 通知解析、对话、JSON 抽取、结构校验、字段归一化
    db.ts migrations.ts # 数据库连接与迁移
    auth.ts session.ts password.ts crypto.ts  # 认证与会话、密码哈希、密钥加密
    events.ts reminders.ts notices...         # 领域逻辑（按 user_id 隔离）
tests/                  # parse / reminders / events / isolation 测试
```

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（可选，开发环境不配置也能跑）
cp .env.example .env.local
#    编辑 .env.local，至少设置 APP_SECRET

# 3. 启动开发服务器
npm run dev
# 打开 http://localhost:3000
```

数据库会在首次启动时自动建表并执行迁移（默认 `./data/app.db`，已在 `.gitignore` 中忽略）。

### 常用命令

```bash
npm run dev        # 开发服务器
npm run build      # 生产构建
npm run start      # 运行生产构建
npm run typecheck  # TypeScript 类型检查
npm test           # 运行测试
```

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `APP_SECRET` | 生产必填 | 会话签名与「用户 API Key」加密的主密钥；生产用 `openssl rand -hex 32` 生成一段长随机串 |
| `NEXT_PUBLIC_SITE_URL` | 可选 | 站点基础地址，用于生成绝对 URL |
| `DATABASE_PATH` | 可选 | SQLite 文件路径，默认 `./data/app.db` |
| `UPLOAD_DIR` | 可选 | 头像上传目录，默认 `./data/uploads` |

> `NEXT_PUBLIC_*` 变量会被打进前端包，只放非敏感值；**API Key 等敏感信息一律通过服务端 / 数据库加密保存，绝不放环境变量的 `NEXT_PUBLIC_*`**。

## 配置 DeepSeek

1. 到 [DeepSeek 开放平台](https://platform.deepseek.com/) 创建 API Key。
2. 登录后进入「设置 → AI 助手」，填入：
   - **API Key**（保存在服务端，AES-256-GCM 加密，浏览器拿不到明文）
   - **API Base URL**：默认 `https://api.deepseek.com`
   - **模型名称**：默认 `deepseek-chat`（可改为 `deepseek-reasoner` 等）
3. 点击「测试连接」验证。
4. 保存后，「通知解析」与「AI 助手」即可使用。

接入遵循 [DeepSeek 官方 API 文档](https://api-docs.deepseek.com/) 的 OpenAI 兼容协议（`/chat/completions`）。模型调用统一封装在 `src/lib/ai/client.ts`，如需接入其他 OpenAI 兼容提供方，只需在 `src/lib/ai-config.ts` 与 `client.ts` 中按 `provider` 分支扩展。

## 测试

覆盖需求要求的核心逻辑：

- `tests/parse.test.ts` —— 通知解析结果的结构校验、字段类型校验、缺失字段标注、类别归一化、JSON 抽取。
- `tests/reminders.test.ts` —— 提醒提前量换算、提醒触发时间计算、基准时间选择。
- `tests/events.test.ts` —— 日程创建必须先通过校验、解析（normalize）不落库 / 显式 create 才落库、归属校验。
- `tests/isolation.test.ts` —— 用户数据隔离（SQL 层强制 `user_id` 约束）、跨用户访问返回 null。

## 部署

应用可部署到任意支持 Node.js 的托管平台。关键点：设置 `APP_SECRET`、把数据目录 `data/` 挂到持久化卷、Node 版本 ≥ 22.5。

### Docker

```bash
docker build -t campus-schedule .
docker run -p 3000:3000 \
  -e APP_SECRET=$(openssl rand -hex 32) \
  -v $(pwd)/data:/app/data \
  campus-schedule
```

### Vercel / 无服务器平台

此类平台是无状态文件系统，SQLite 本地文件与上传头像无法持久化，**不建议**直接部署。若一定要用，需将 `DATABASE_PATH` / `UPLOAD_DIR` 指向外部持久化存储，并把 `APP_SECRET` 设为平台环境变量。

### 通用 Node 主机（Render / Railway / Fly.io / 自建 VPS）

```bash
npm ci
npm run build
APP_SECRET=$(openssl rand -hex 32) npm run start
```

## 安全说明

- 用户密码用 **scrypt + 随机盐** 单向哈希，恒定时间比较。
- 会话 token 服务端只存 SHA-256 哈希，Cookie 为 `httpOnly` + `SameSite=Lax`（生产环境 `Secure`）。
- 用户 API Key 用 **AES-256-GCM** 加密后落库，接口只返回 `has_key`，**永不回传明文**，不写入日志、不入库明文。
- 所有服务端接口校验登录态，日程 / 通知 / 提醒查询与写操作均按 `user_id` 隔离。
- AI 返回内容经 Zod 结构校验，不信任模型字段或指令；创建 / 修改 / 删除日程由服务端校验并要求用户确认。
- 仓库只含 `.env.example` 占位值，真实密钥不入库（`.gitignore` 已忽略 `.env*` 与 `data/`）。

## 已知限制

- **浏览器通知**：仅网站打开时能推送，网站关闭后无法保证送达；未授权时会退化为站内提醒。请勿把浏览器通知当作可靠的离线提醒。
- **AI 解析**：依赖你配置的模型与网络，返回内容无法解析时会明确提示，可重试或手动创建日程。
