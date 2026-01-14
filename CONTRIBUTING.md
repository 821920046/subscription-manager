# 贡献指南

感谢你对 Subscription Manager 项目的关注！我们欢迎任何形式的贡献。

## 📋 目录

- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [提交流程](#提交流程)
- [测试要求](#测试要求)
- [Pull Request 流程](#pull-request-流程)

## 🛠️ 开发环境设置

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Cloudflare Workers 账号（用于部署测试）

### 安装步骤

1. Fork 并克隆仓库

```bash
git clone https://github.com/YOUR_USERNAME/subscription-manager.git
cd subscription-manager
```

2. 安装依赖

```bash
npm install
```

3. 创建 KV 命名空间

```bash
wrangler kv:namespace create SUBSCRIPTIONS_KV
```

4. 更新 `wrangler.toml` 中的 KV ID

5. 启动开发服务器

```bash
npm run dev
```

## 📝 代码规范

### TypeScript

- 使用严格模式（`strict: true`）
- 避免使用 `any` 类型
- 为所有函数添加返回类型
- 使用接口和类型别名提供类型安全

### 代码风格

我们使用 ESLint 和 Prettier 确保代码风格一致：

```bash
# 检查代码风格
npm run lint

# 自动修复代码风格问题
npm run lint:fix

# 格式化代码
npm run format
```

### 提交信息规范

使用语义化提交信息：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整（不影响功能）
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建或辅助工具变动

示例：
```
feat: 添加邮件通知支持
fix: 修复农历日期计算错误
docs: 更新 API 文档
```

## 🧪 测试要求

在提交 PR 之前，请确保：

1. 所有测试通过

```bash
npm run test
```

2. 类型检查通过

```bash
npm run typecheck
```

3. 代码覆盖率满足要求（至少 80%）

```bash
npm run test:coverage
```

### 编写测试

- 为新功能添加单元测试
- 测试文件放在 `tests/` 目录下
- 使用 Vitest 测试框架
- 测试文件命名规范：`*.test.ts`

示例：

```typescript
import { describe, it, expect } from 'vitest';

describe('功能模块名', () => {
  it('应该正确执行某个操作', () => {
    // 测试代码
    expect(result).toBe(expected);
  });
});
```

## 🔄 提交流程

1. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

2. 进行开发并提交

```bash
git add .
git commit -m "feat: 添加新功能"
```

3. 推送到远程仓库

```bash
git push origin feature/your-feature-name
```

4. 创建 Pull Request

## 📤 Pull Request 流程

1. 确保你的代码：
   - 通过所有测试
   - 符合代码规范
   - 包含必要的测试
   - 更新了相关文档

2. PR 描述应包含：
   - 变更内容简述
   - 相关 Issue 编号（如果有）
   - 测试截图或日志（如果适用）

3. 等待 Code Review

4. 根据反馈进行修改

5. 合并到主分支

## 🐛 报告 Bug

在 Issue 中报告 Bug 时，请提供：

- Bug 的详细描述
- 复现步骤
- 期望行为
- 实际行为
- 环境信息（Node 版本、操作系统等）
- 错误日志或截图

## 💡 功能建议

我们欢迎任何功能建议！请在 Issue 中描述：

- 功能的详细描述
- 使用场景
- 可能的实现方案
- 为什么需要这个功能

## 📄 许可证

通过贡献代码，你同意你的贡献将遵循项目的 MIT 许可证。

## 🙏 致谢

感谢所有贡献者！你们的努力让这个项目变得更好。
