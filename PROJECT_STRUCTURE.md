# Subscription Manager 项目结构

```
subscription-manager/
├── .github/
│   └── workflows/
│       └── deploy.yml                 # CI/CD 工作流配置
│
├── node_modules/                      # npm 依赖（.gitignore）
│
├── src/
│   ├── config/
│   │   └── constants.ts               # 全局常量配置
│   │
│   ├── services/
│   │   ├── export.ts                  # 🆕 导出服务（JSON/CSV/备份）
│   │   ├── monitoring.ts              # 🆕 监控服务（健康检查/度量）
│   │   ├── notification.ts            # 通知服务（多渠道推送）
│   │   └── subscription.ts            # 订阅服务（CRUD/到期检查）
│   │
│   ├── templates/
│   │   ├── admin.ts                   # 管理页面模板
│   │   ├── config.ts                  # 配置页面模板
│   │   ├── debug.ts                   # 调试页面模板
│   │   ├── login.ts                   # 登录页面模板
│   │   └── wenotify_skin.ts           # WeNotify 皮肤模板
│   │
│   ├── utils/
│   │   ├── auth.ts                    # ✨ 认证工具（JWT/密码哈希）
│   │   ├── cache.ts                   # 🆕 缓存管理器
│   │   ├── config.ts                  # 配置管理
│   │   ├── date.ts                    # 日期工具
│   │   ├── errors.ts                  # 🆕 错误处理类
│   │   ├── http.ts                    # HTTP 工具
│   │   ├── logger.ts                  # 🆕 结构化日志
│   │   ├── lunar.ts                   # 农历计算
│   │   ├── rateLimit.ts               # 🆕 速率限制器
│   │   └── validation.ts              # 🆕 数据验证 Schema
│   │
│   ├── types.ts                       # ✨ TypeScript 类型定义
│   └── worker.ts                      # Worker 入口文件
│
├── tests/
│   ├── services/
│   │   └── subscription.test.ts       # 🆕 订阅服务测试
│   │
│   └── utils/
│       └── validation.test.ts         # 🆕 验证工具测试
│
├── .eslintrc.json                     # 🆕 ESLint 配置
├── .gitignore                         # ✨ Git 忽略规则（扩展）
├── .prettierrc.json                   # 🆕 Prettier 配置
├── ARCHITECTURE.md                    # 🆕 架构设计文档
├── CHANGELOG.md                       # 🆕 变更日志
├── CONTRIBUTING.md                    # 🆕 贡献指南
├── LICENSE                            # MIT 许可证
├── NEXT_STEPS.md                      # 🆕 下一步行动指南
├── OPTIMIZATION_REPORT.md             # 🆕 优化完成报告
├── README.md                          # 项目说明文档
├── USAGE_GUIDE.md                     # 🆕 功能使用指南
├── package-lock.json                  # npm 锁定文件
├── package.json                       # ✨ npm 配置（扩展）
├── tsconfig.json                      # 🆕 TypeScript 配置
├── vitest.config.ts                   # 🆕 Vitest 配置
└── wrangler.toml                      # Cloudflare Workers 配置
```

## 图例

- 📁 目录
- 📄 文件
- 🆕 新增文件
- ✨ 更新文件

## 文件说明

### 配置文件

| 文件 | 说明 | 状态 |
|------|------|------|
| `.eslintrc.json` | ESLint 代码检查配置 | 🆕 新增 |
| `.prettierrc.json` | Prettier 代码格式化配置 | 🆕 新增 |
| `tsconfig.json` | TypeScript 编译配置 | 🆕 新增 |
| `vitest.config.ts` | Vitest 测试框架配置 | 🆕 新增 |
| `wrangler.toml` | Cloudflare Workers 部署配置 | 已存在 |
| `package.json` | npm 项目配置和依赖 | ✨ 扩展 |

### 源代码 (src/)

#### 配置层 (config/)
- `constants.ts` 🆕 - 全局常量定义（JWT、速率限制、验证规则等）

#### 服务层 (services/)
- `subscription.ts` - 订阅 CRUD 和到期检查
- `notification.ts` - 多渠道通知发送
- `export.ts` 🆕 - 数据导出/导入/备份
- `monitoring.ts` 🆕 - 健康检查和度量记录

#### 模板层 (templates/)
- `admin.ts` - 后台管理界面
- `config.ts` - 配置管理界面
- `login.ts` - 登录界面
- `debug.ts` - 调试信息页面
- `wenotify_skin.ts` - WeNotify 消息模板

#### 工具层 (utils/)
- `auth.ts` ✨ - JWT 生成/验证 + 密码哈希
- `config.ts` - 配置加载和解析
- `date.ts` - 日期格式化和时区
- `lunar.ts` - 农历计算
- `http.ts` - HTTP 请求工具
- `logger.ts` 🆕 - 结构化日志记录
- `errors.ts` 🆕 - 错误类定义
- `validation.ts` 🆕 - Zod 数据验证
- `cache.ts` 🆕 - 内存缓存管理
- `rateLimit.ts` 🆕 - 速率限制逻辑

#### 核心文件
- `types.ts` ✨ - TypeScript 类型定义（扩展）
- `worker.ts` - Cloudflare Worker 入口

### 测试 (tests/)

```
tests/
├── services/
│   └── subscription.test.ts     # 订阅服务单元测试
└── utils/
    └── validation.test.ts       # 数据验证测试
```

### 文档

| 文档 | 说明 | 行数 |
|------|------|------|
| `README.md` | 项目主文档 | ~210 |
| `ARCHITECTURE.md` 🆕 | 系统架构设计 | ~400 |
| `CONTRIBUTING.md` 🆕 | 开发贡献指南 | ~200 |
| `USAGE_GUIDE.md` 🆕 | 功能使用说明 | ~500 |
| `CHANGELOG.md` 🆕 | 版本变更历史 | ~200 |
| `OPTIMIZATION_REPORT.md` 🆕 | 优化详情报告 | ~400 |
| `NEXT_STEPS.md` 🆕 | 下一步行动 | ~300 |
| `LICENSE` | MIT 开源协议 | 22 |

### CI/CD

```
.github/
└── workflows/
    └── deploy.yml       # GitHub Actions 工作流
                         # - 测试
                         # - 代码检查
                         # - 自动部署
```

## 代码统计

### 源代码
- **总文件数**: ~20 个
- **TypeScript 文件**: ~15 个
- **配置文件**: 5 个
- **模板文件**: 5 个

### 测试代码
- **测试文件**: 2 个
- **测试用例**: ~15 个（可扩展）

### 文档
- **Markdown 文档**: 8 个
- **总文档行数**: ~2000+ 行

## 依赖关系

### 生产依赖
```
dependencies (2)
├── bcryptjs@^2.4.3         # 密码加密
└── zod@^3.22.4             # 数据验证
```

### 开发依赖
```
devDependencies (11)
├── @cloudflare/workers-types@^4.20241127.0
├── @types/bcryptjs@^2.4.6
├── @types/node@^20.10.6
├── @typescript-eslint/eslint-plugin@^6.17.0
├── @typescript-eslint/parser@^6.17.0
├── @vitest/coverage-v8@^1.1.3
├── eslint@^8.56.0
├── prettier@^3.1.1
├── typescript@^5.3.3
├── vitest@^1.1.3
└── wrangler@^4.54.0
```

## 层级设计

```
┌─────────────────────────────────────┐
│        Presentation Layer           │  templates/
│        (HTML Templates)             │
├─────────────────────────────────────┤
│         Service Layer               │  services/
│   (Business Logic & Integration)    │  - subscription
│                                     │  - notification
│                                     │  - export
│                                     │  - monitoring
├─────────────────────────────────────┤
│          Utils Layer                │  utils/
│   (Reusable Components)             │  - auth
│                                     │  - validation
│                                     │  - logger
│                                     │  - cache
│                                     │  - rateLimit
├─────────────────────────────────────┤
│         Config Layer                │  config/
│         (Constants)                 │  - constants
├─────────────────────────────────────┤
│          Data Layer                 │  Cloudflare KV
│      (Storage & Cache)              │
└─────────────────────────────────────┘
```

## 模块依赖图

```
worker.ts
    ├── services/
    │   ├── subscription ──┬── utils/date
    │   │                  ├── utils/lunar
    │   │                  ├── utils/config
    │   │                  └── types
    │   │
    │   ├── notification ──┬── utils/http
    │   │                  ├── utils/date
    │   │                  ├── utils/lunar
    │   │                  └── types
    │   │
    │   ├── export ────────── types
    │   │
    │   └── monitoring ────┬── utils/logger
    │                      └── types
    │
    ├── utils/
    │   ├── auth ──────────┬── config/constants
    │   │                  └── utils/logger
    │   │
    │   ├── validation ────── config/constants
    │   │
    │   ├── rateLimit ─────┬── config/constants
    │   │                  ├── utils/errors
    │   │                  └── utils/logger
    │   │
    │   └── errors ────────── config/constants
    │
    └── templates/
        ├── admin
        ├── config
        ├── login
        ├── debug
        └── wenotify_skin
```

## 🎯 关键特性映射

| 功能 | 文件位置 |
|------|---------|
| 类型安全 | `tsconfig.json`, `src/types.ts` |
| 数据验证 | `src/utils/validation.ts` |
| 密码加密 | `src/utils/auth.ts` |
| 速率限制 | `src/utils/rateLimit.ts` |
| 缓存管理 | `src/utils/cache.ts` |
| 错误处理 | `src/utils/errors.ts` |
| 日志记录 | `src/utils/logger.ts` |
| 数据导出 | `src/services/export.ts` |
| 监控服务 | `src/services/monitoring.ts` |
| 单元测试 | `tests/**/*.test.ts` |
| CI/CD | `.github/workflows/deploy.yml` |
| 代码检查 | `.eslintrc.json` |
| 代码格式 | `.prettierrc.json` |

## 📏 代码行数估算

```
src/
├── services/         ~1500 行
├── templates/        ~3000 行
├── utils/            ~1000 行
├── config/           ~100 行
├── types.ts          ~150 行
└── worker.ts         ~500 行

tests/                ~300 行
docs/                 ~2000 行
config files          ~100 行

总计                  ~8650 行
```

## 🔄 主要数据流

### 1. 请求处理流
```
Request → worker.ts → 路由分发 → 
    Service Layer → Utils Layer → 
    KV Storage → Response
```

### 2. 定时任务流
```
Cron Trigger → worker.ts → 
    SubscriptionService.checkExpiring → 
    NotificationService.sendToAll → 
    各通知渠道 API
```

### 3. 数据验证流
```
User Input → Validation Schema → 
    Parse/Validate → 
    ✓ Valid Data → Business Logic
    ✗ Invalid → ValidationError → Error Response
```

## 🏗️ 构建输出

运行 `npm run dev` 或  `npm run deploy` 后：

```
.wrangler/
├── tmp/              # 临时文件
└── state/            # 本地状态

dist/                 # TypeScript 编译输出（如果配置）
coverage/             # 测试覆盖率报告
```

---

**最后更新**: 2026-01-13  
**项目版本**: 2.0.0  
**文件总数**: 40+
