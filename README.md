# 订阅管理系统 - Subscription Manager

基于 Cloudflare Workers 的高性能订阅管理系统，支持多渠道推送、农历循环、费用统计与现代化仪表盘。

## ✨ 特性

- **多渠道推送**：支持 Telegram, Email, 企业微信, 微信公众号, Bark, NotifyX, WeNotify, Webhook
- **农历支持**：完全支持农历日期订阅与循环（如农历生日提醒）
- **模块化架构**：TypeScript + Hono 框架，逻辑分离，易于维护
- **Web UI 管理**：仪表盘、订阅管理、配置中心、调试工具
- **自动任务**：Cloudflare Workers Cron 自动检查并推送提醒
- **安全鉴权**：JWT 认证 + 限流保护

## 🚀 快速开始

### 环境准备

- Cloudflare 账号
- Node.js & npm
- Wrangler CLI

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

### 部署

```bash
npm run deploy
```

## 📁 项目结构

```
src/
├── index.ts              # Hono 应用入口
├── types.ts              # TypeScript 类型定义
├── routes/               # 路由层
│   ├── auth.routes.ts
│   ├── subscription.routes.ts
│   ├── config.routes.ts
│   └── notify.routes.ts
├── services/             # 业务逻辑层
│   ├── subscription.service.ts
│   └── config.service.ts
├── notifiers/            # 推送渠道（8个独立模块）
│   ├── base.ts
│   ├── telegram.notifier.ts
│   ├── email.notifier.ts
│   ├── wechat-bot.notifier.ts
│   ├── wechat-oa.notifier.ts
│   ├── bark.notifier.ts
│   ├── notifyx.notifier.ts
│   ├── wenotify.notifier.ts
│   └── webhook.notifier.ts
├── middleware/           # 中间件
│   ├── auth.middleware.ts
│   ├── rate-limit.middleware.ts
│   └── error-handler.middleware.ts
└── utils/                # 工具函数
    ├── date.ts
    ├── lunar.ts
    ├── crypto.ts
    └── http.ts
```

## ⚙️ 配置

1. 复制 `wrangler.toml.example` 为 `wrangler.toml`
2. 修改其中的 KV namespace ID
3. 部署后访问 `/admin/config` 配置推送渠道

## 🔒 安全

- JWT 认证
- 请求限流
- 安全响应头（HSTS, CSP等）
- 密码哈希存储

## 📄 许可证

MIT License
