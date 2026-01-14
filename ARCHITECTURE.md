# Subscription Manager 架构设计文档

## 📐 系统架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         用户层                               │
│  Web UI (HTML/CSS/JavaScript) - 浏览器访问                   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
┌────────────────────┴────────────────────────────────────────┐
│               Cloudflare Workers Runtime                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Worker Entry (worker.ts)            │   │
│  │  - 路由处理                                           │   │
│  │  - 请求分发                                           │   │
│  │  - 中间件（认证、速率限制、安全头）                    │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────┴───────────────────────────────────────┐   │
│  │              业务逻辑层 (Services)                    │   │
│  │  ┌───────────────────┐  ┌──────────────────────┐      │   │
│  │  │ SubscriptionService│  │ NotificationService  │      │   │
│  │  │  - 订阅管理       │  │  - 多渠道推送        │      │   │
│  │  │  - CRUD操作       │  │  - 消息格式化        │      │   │
│  │  │  - 到期检查      │  │  - 失败重试          │      │   │
│  │  └───────────────────┘  └──────────────────────┘      │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────┴───────────────────────────────────────┐   │
│  │               工具层 (Utils)                          │   │
│  │  - auth.ts      - JWT & 密码管理                      │   │
│  │  - validation.ts - 数据验证                           │   │
│  │  - logger.ts    - 日志记录                            │   │
│  │  - cache.ts     - 缓存管理                            │   │
│  │  - rateLimit.ts - 速率限制                            │   │
│  │  - lunar.ts     - 农历计算                            │   │
│  │  - config.ts    - 配置管理                            │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                 Cloudflare KV Storage                        │
│  - subscriptions:index (订阅索引)                            │
│  - subscription:{id} (单个订阅数据)                          │
│  - config (系统配置)                                         │
│  - ratelimit:{type}:{ip}:{bucket} (速率限制)                 │
│  - reminder_failure_* (失败日志)                             │
│  - wechat_access_token (微信令牌缓存)                        │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 安全架构

### 认证流程

```
┌──────┐          1. 登录请求          ┌──────────┐
│ 用户 │ ───────────────────────────→ │ Worker   │
└──────┘                                │          │
                                        │  验证凭据  │
                                        │  (bcrypt) │
                                        └────┬─────┘
                                             │
                                        2. 生成 JWT
                                             │
┌──────┐      3. Set-Cookie: token     ┌────┴─────┐
│ 用户 │ ←─────────────────────────── │ Worker   │
└──┬───┘                                └──────────┘
   │
   │     4. 后续请求带 token
   │         (Cookie)
   │
┌──┴───┐                                ┌──────────┐
│ 用户 │ ───────────────────────────→ │ Worker   │
└──────┘                                │          │
                                        │ 验证 JWT  │
                                        │ 提取用户  │
                                        └──────────┘
```

### 安全措施

1. **密码安全**
   - 使用 bcrypt 哈希存储
   - Salt rounds: 10
   - 最小密码长度：6字符

2. **JWT 安全**
   - HMAC SHA-256 签名
   - Secret 最小长度：32字符
   - HttpOnly Cookie
   - SameSite=Lax
   - 24小时过期

3. **速率限制**
   - 登录：5 次/分钟/IP
   - API：100 次/分钟/IP
   - 通知：20 次/分钟/IP

4. **HTTP 安全头**
   - HSTS
   - X-Content-Type-Options
   - X-Frame-Options
   - X-XSS-Protection
   - Referrer-Policy
   - Permissions-Policy

## 📊 数据模型

### Subscription (订阅)

```typescript
interface Subscription {
  id: string;                    // UUID
  name: string;                  // 服务名称
  customType?: string;           // 自定义类型
  startDate?: string;            // 开始日期 (ISO)
  expiryDate: string;            // 到期日期 (ISO)
  periodValue?: number;          // 周期值
  periodUnit?: 'year'|'month'|'day'; // 周期单位
  price?: number;                // 价格
  reminderDays?: number;         // 提醒提前天数
  dailyReminderTimes?: string[]; // 重复提醒时段
  notes?: string;                // 备注
  isActive: boolean;             // 是否启用
  autoRenew: boolean;            // 自动续期
  useLunar?: boolean;            // 使用农历
  createdAt?: string;            // 创建时间
  updatedAt?: string;            // 更新时间
}
```

### Config (配置)

```typescript
interface Config {
  adminUsername?: string;
  adminPassword?: string;        // bcrypt 哈希
  jwtSecret?: string;
  timezone?: string;
  reminderTimes?: string[];
  showLunarGlobal?: boolean;
  enabledNotifiers: string[];
  // 各通知渠道配置...
}
```

## 🔄 核心流程

### 订阅到期检查流程

```
┌─────────────┐
│ Cron Trigger│  每分钟触发
└──────┬──────┘
       │
       ▼
┌──────────────────────────────┐
│ 1. 获取配置                   │
│    - 时区                     │
│    - 全局提醒时段              │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ 2. 计算当前时间 (HH:mm)       │
│    (按配置的时区)              │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ 3. 获取所有订阅               │
│    - 批量从 KV 读取            │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ 4. 检查每个订阅               │
│    - 计算剩余天数              │
│    - 检查是否需要续期          │
│    - 过滤提醒时段              │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ 5. 发送通知                   │
│    - 遍历启用的渠道            │
│    - 格式化消息                │
│    - 记录失败                  │
└───────────────────────────────┘
```

### 通知发送流程

```
┌──────────────┐
│ 触发通知      │
└──────┬───────┘
       │
       ▼
┌────────────────────────────────┐
│ 1. 格式化通知内容               │
│    - 根据渠道格式化              │
│    - Markdown / HTML / 纯文本   │
└──────┬─────────────────────────┘
       │
       ▼
┌────────────────────────────────┐
│ 2. 遍历启用的通知渠道           │
└──────┬─────────────────────────┘
       │
       ▼
┌────────────────────────────────┐
│ 3. 并发发送到各渠道             │
│    - Telegram                   │
│    - NotifyX                    │
│    - WeNotify                   │
│    - 企业微信                   │
│    - 邮件                       │
│    - Bark                       │
└──────┬─────────────────────────┘
       │
       ▼
┌────────────────────────────────┐
│ 4. 收集结果                     │
│    - 成功渠道列表                │
│    - 失败渠道列表                │
└──────┬─────────────────────────┘
       │
       ▼
┌────────────────────────────────┐
│ 5. 记录失败 (如果有)            │
│    - 写入 KV                    │
│    - 发送管理员告警              │
└────────────────────────────────┘
```

## 🚀 性能优化

### KV 读写优化

1. **索引设计**
   ```
   subscriptions:index → [id1, id2, id3...]
   subscription:{id}   → {subscription data}
   ```
   
2. **批量读取**
   - 使用 Promise.all 并发查询
   - 每批最多 50 个（避免超限）

3. **缓存策略**
   - 配置缓存：60秒
   - 订阅数据：30秒
   - 微信 Token：7100秒

### 计算优化

1. **农历计算**
   - 缓存转换结果
   - 延迟计算（仅在需要时）

2. **日期计算**
   - 标准化到 UTC
   - 使用整数计算天数差

## 🔍 监控和日志

### 日志级别

- **ERROR**: 系统错误、异常
- **WARN**: 警告信息
- **INFO**: 一般信息
- **DEBUG**: 调试信息

### 日志结构

```json
{
  "timestamp": "2026-01-13T14:30:00.000Z",
  "level": "ERROR",
  "message": "描述信息",
  "error": {
    "message": "错误消息",
    "stack": "堆栈跟踪",
    "name": "错误类型"
  },
  "data": {}
}
```

### 失败日志

存储在 KV：
- Key: `reminder_failure_{timestamp}`
- Index: `reminder_failure_index`
- 最多保留 100 条

## 📈 扩展性

### 添加新通知渠道

1. 在 `types.ts` 添加配置接口
2. 在 `notification.ts` 实现发送函数
3. 在 `config.ts` 添加配置解析
4. 在 `config` 模板添加 UI
5. 更新文档

### 添加新数据验证

1. 在 `validation.ts` 添加 Schema
2. 在相应的 API 使用验证
3. 添加测试用例

## 🔧 维护和运维

### 部署流程

1. 代码提交到 GitHub
2. GitHub Actions 自动运行测试
3. 测试通过后部署到 Staging
4. 手动触发 Production 部署（需在 commit 消息中包含 `[deploy-prod]`）

### 备份策略

1. KV 数据自动备份（Cloudflare 提供）
2. 导出功能定期导出数据
3. Git 版本控制代码

### 故障恢复

1. 查看失败日志（`/api/failure-logs`）
2. 检查 Cloudflare Dashboard 日志
3. 使用调试页面（`/debug`）检查环境
4. 本地预览环境重置登录（`/api/dev/reset-login`）

## 📖 API 文档

详见 README.md 中的 API 接口说明。

## 🛡️ 安全最佳实践

1. **永远不要**在代码中硬编码敏感信息
2. 使用 Cloudflare Secrets 管理敏感配置
3. 定期更新密码和密钥
4. 启用 HTTPS
5. 监控异常登录尝试
6. 定期审查访问日志

## 📚 参考资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare KV 文档](https://developers.cloudflare.com/kv/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Vitest 文档](https://vitest.dev/)
