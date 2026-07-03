# 变更日志

本文档记录了 Subscription Manager 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [2.3.0] - 2026-07-03

在 2.2.0 基础上继续完成可验证的 P1/P2 优化（均经 tsc + 运行时集成测试验证）。

### P0/P1 安全
- **JWT 服务端可吸销**：新增 `tokenValidFrom`（存于配置）；登出时写入当前时间，所有签发时间早于此的 token 立即失效。之前登出仅清除 Cookie，旧 token 到期前仍可用。（单管理员场景下为全局登出）

### P1 可维护性
- **通知格式化去重**：抽取 `getTypeText`/`formatPeriodText` 共用工具，消除 3 处重复；已用快照测试证明输出与重构前 **逐字节一致**（SHA-256 相同）。

### P2 数据安全
- **导出/备份端点**：新增 `GET /api/export`（需登录），以 `attachment` 下载全量订阅 JSON（含版本/时间/数量），便于备份。

### 测试
- 新增会话吸销、跨站写拦截、导出的路由测试（共 10 项 API 集成测试）。

## [2.2.0] - 2026-07-03

本版本实现了 P0 级安全/可靠性加固与部分 P2 可观测性（均已经 tsc + 运行时集成测试验证）。

### P0 安全与可靠性
- **并发一致性**：订阅存储改为按 KV 前缀列举（`list({prefix:'subscription:'})`），**彻底移除可变索引 `subscriptions:index` 的读-改-写竞态**（并发创建/删除可能丢数据）。创建/删除不再操作索引；legacy 数据仍自动迁移。
- **密钥掩码**：`GET /api/config` 对敏感凭据（TG/NotifyX/WeNotify/公众号密钥/Resend/Bark）以掩码占位回传；保存与测试时自动识别掩码并保留原值，不再向前端泄露明文密钥。
- **CSRF 纵深防御**：基于 Cookie 鉴权的写操作（POST/PUT/DELETE）校验同源 Origin，拒绝跨站写请求。
- **CSP 安全头（保守子集）**：`frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'`（不影响现有内联脚本/CDN）。

### P2 可观测性
- 新增健康检查端点 `GET /api/health`（公开，返回状态/KV 绑定/时间，不含敏感信息）。

### 测试
- 新增 API 路由测试（健康检查/鉴权）；为 KV mock 补齐 `list()`。

> 说明：订阅读取改用 KV `list()`（最终一致，刚创建的条目可能在全球传播前短暂不在列表）；单条 `get-by-id` 仍为强一致。相比旧索引方案，以短暂列表延迟换取“不再丢数据”。

## [2.1.0] - 2026-07-03

本版本是一次面向“安全 + 正确性”的深度升级，在不改变现有功能的前提下修复了多个根因级问题。

### 安全（Security）
- **修复存储型 XSS（高危）**：后台列表/卡片/失败日志之前直接用 `innerHTML` 拼接未转义的订阅名称/备注/类型，恶意名称（如 `<img src=x onerror=...>`）会在管理员浏览器执行。新增 `escapeHtml` 并对所有用户数据转义。
- **修复邮件 HTML 注入**：邮件正文之前直接把含用户数据的内容 `replace(/\n/g,'<br>')` 插入 HTML，现已先转义。
- **调试页转义**：`/debug` 页面输出均经转义。
- **常数时间比较**：JWT 签名与第三方 API Token 改用 `timingSafeEqual`，防止时序攻击。
- **管理员密码哈希入库**：保存配置时对新密码进行 bcrypt 哈希（`HASHED:` 前缀），不再明文存储；兼容旧明文密码。
- **敏感配置禁缓存**：`GET /api/config` 返回 `Cache-Control: no-store`。

### 正确性（Correctness）
- **时区日期计算**：“剩余天数/今天到期”以前用服务器（UTC）本地午夜计算，对非 UTC 用户会出现±1 天偏差。新增 `dayDiffInTimezone`，按配置时区的自然日计算。
- **JWT 支持非 ASCII 用户名**：旧实现用 `btoa(JSON.stringify(...))`，遇到中文用户名会抛错导致无法登录；现改为 UTF-8 + base64url 编码。
- **部分配置更新不再清空其它字段**：`POST /api/config` 仅覆盖请求中显式提供的字段。
- **`reminderDays=0` 生效**：不再被 `|| 7` 误当作默认值。
- **Zod 错误访问前向兼容**：`error.errors` → `error.issues`（zod 3/4 均兼容）。

### 工程 / CI
- `wrangler.toml` 新增 `[env.staging]`/`[env.production]`（使 `deploy:staging`/`deploy:production` 可用），升级 `compatibility_date`。
- 合并两个重复且互相矛盾的 GitHub Actions 工作流为单一正确的 `deploy.yml`（typecheck+lint+test → 部署）。
- 删除误提交的 `test_output.txt`。
- 修复 `tests/services/notification.test.ts` 中无效的 mock 语句；新增 `html`/`date`/UTF-8 JWT 回归测试。

### ⚠️ 兼容性提示
- JWT 编码从 base64 改为 base64url，升级后现有登录会失效，用户需重新登录（一次性）。

## [2.0.0] - 2026-01-13

### 重大优化

#### 新增
- **TypeScript 严格模式**：启用完整的类型检查，提升代码质量
- **数据验证**：使用 Zod 库进行输入验证，保护系统安全
- **密码加密**：使用 bcrypt 对管理员密码进行哈希存储
- **增强的速率限制**：改进的速率限制机制，支持多类型限制
- **结构化日志**：统一的日志记录系统
- **错误处理体系**：完整的错误类层次结构
- **缓存机制**：内存缓存管理器，减少 KV 读取
- **单元测试**：使用 Vitest 添加测试覆盖
- **CI/CD**：GitHub Actions 自动化部署流程
- **代码质量工具**：ESLint 和 Prettier 配置
- **导出功能增强**：支持更多导出格式
- **监控和日志**：失败日志记录和管理员告警

#### 改进
- **性能优化**：批量 KV 操作，提升大量订阅时的性能
- **安全性增强**：
  - JWT Secret 最小长度验证
  - 密码哈希存储
  - 改进的速率限制
  - HTTP 安全头
- **代码组织**：
  - 模块化重构
  - 常量集中管理
  - 工具函数分离
- **类型安全**：消除 any 类型使用
- **文档完善**：
  - 添加贡献指南（CONTRIBUTING.md）
  - 添加变更日志（CHANGELOG.md）
  - API 文档改进

#### 修复
- 修复 KV 接口定义不完整的问题
- 修复速率限制配置属性名称
- 修复类型声明和导入问题

### 技术细节

#### 依赖更新
- 添加 `bcryptjs` ^2.4.3 - 密码加密
- 添加 `zod` ^3.22.4 - 数据验证
- 添加 `@cloudflare/workers-types` ^4.20241127.0 - 类型定义
- 添加 `typescript` ^5.3.3 - TypeScript 支持
- 添加 `vitest` ^1.1.3 - 测试框架
- 添加 `eslint` ^8.56.0 - 代码检查
- 添加 `prettier` ^3.1.1 - 代码格式化

#### 配置文件
- 添加 `tsconfig.json` - TypeScript 配置
- 添加 `.eslintrc.json` - ESLint 配置
- 添加 `.prettierrc.json` - Prettier 配置
- 添加 `vitest.config.ts` - Vitest 配置
- 添加 `.github/workflows/deploy.yml` - CI/CD 配置

#### 新文件结构
```
src/
├── config/
│   └── constants.ts       # 全局常量配置
├── utils/
│   ├── logger.ts          # 日志工具
│   ├── errors.ts          # 错误处理
│   ├── validation.ts      # 数据验证 Schema
│   ├── cache.ts           # 缓存管理
│   └── rateLimit.ts       # 速率限制
tests/
├── services/
│   └── subscription.test.ts
└── utils/
    └── validation.test.ts
```

## [2.0.0-beta] - 2025-12

### 新增
- UI/UX 体验升级：移动端适配优化，桌面端布局调整
- 企业微信通知优化：消息模板颜色升级
- 安全加固：HTTP 安全头，security.txt
- WeNotify 皮肤模板升级
- 核心性能优化：订阅列表并行查询
- 安全性增强：Web Crypto API 随机数生成
- 代码重构：统一农历/公历日期计算逻辑
- 仪表盘升级：动态仪表板状态
- 金额字段：每周期费用记录
- 本月预估支出：费用统计功能
- 单订阅测试通知：管理页面新功能
- 多时段提醒：支持多个每日提醒时段
- 订阅级重复提醒：单个订阅专属时段设置
- 备注输入优化：字符计数器，长备注截断
- 移动端适配增强：表单栅格优化
- 发送失败告警：失败日志记录和管理员通知
- 时间输入兼容性：支持中文标点规范化
- CSV 导入导出：批量订阅管理

### 修复
- 修复第三方 API 通知缺失订阅数据
- 修复手机端登录 Cookie 问题
- 修复部署配置 KV 绑定混乱
- 修复时间输入格式校验

## [1.0.0] - 2024

初始版本发布

### 功能
- 基本订阅管理（CRUD）
- 公历订阅支持
- 基础通知功能
- Web UI 界面
- JWT 认证

---

**说明**：
- **Added** - 新增功能
- **Changed** - 已有功能的变更
- **Deprecated** - 即将删除的功能
- **Removed** - 已删除的功能
- **Fixed** - Bug 修复
- **Security** - 安全性修复
