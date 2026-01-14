# 变更日志

本文档记录了 Subscription Manager 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
