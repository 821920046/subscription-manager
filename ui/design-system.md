# 订阅管理系统 - 设计系统

## 设计原则

- **清晰**: 信息层级明确，用户能快速找到所需
- **效率**: 减少操作步骤，提供快捷方式
- **一致**: 相同元素保持统一的外观和行为
- **美观**: 现代简约风格，专业可信

## 颜色系统

### 主色调 (Primary)

| Token | 值 | 用途 |
|-------|-----|------|
| `--color-primary-50` | #eef2ff | 最浅背景 |
| `--color-primary-100` | #e0e7ff | 悬停背景 |
| `--color-primary-200` | #c7d2fe | 边框、分隔 |
| `--color-primary-300` | #a5b4fc | 禁用状态 |
| `--color-primary-400` | #818cf8 | 次要元素 |
| `--color-primary-500` | #6366f1 | 主按钮、链接 |
| `--color-primary-600` | #4f46e5 | 主色（默认） |
| `--color-primary-700` | #4338ca | 悬停状态 |
| `--color-primary-800` | #3730a3 | 按下状态 |
| `--color-primary-900` | #312e81 | 深色文字 |

### 中性色 (Neutral)

| Token | 值 | 用途 |
|-------|-----|------|
| `--color-neutral-50` | #f8fafc | 页面背景 |
| `--color-neutral-100` | #f1f5f9 | 卡片背景 |
| `--color-neutral-200` | #e2e8f0 | 边框、分隔线 |
| `--color-neutral-300` | #cbd5e1 | 禁用边框 |
| `--color-neutral-400` | #94a3b8 | 占位符文字 |
| `--color-neutral-500` | #64748b | 次要文字 |
| `--color-neutral-600` | #475569 | 正文文字 |
| `--color-neutral-700` | #334155 | 标题文字 |
| `--color-neutral-800` | #1e293b | 深色背景上的文字 |
| `--color-neutral-900` | #0f172a | 最深色 |

### 语义色 (Semantic)

#### 成功 (Success)
- `--color-success-50`: #f0fdf4
- `--color-success-500`: #22c55e
- `--color-success-600`: #16a34a
- `--color-success-700`: #15803d

#### 警告 (Warning)
- `--color-warning-50`: #fffbeb
- `--color-warning-500`: #f59e0b
- `--color-warning-600`: #d97706
- `--color-warning-700`: #b45309

#### 错误 (Error)
- `--color-error-50`: #fef2f2
- `--color-error-500`: #ef4444
- `--color-error-600`: #dc2626
- `--color-error-700`: #b91c1c

#### 信息 (Info)
- `--color-info-50`: #eff6ff
- `--color-info-500`: #3b82f6
- `--color-info-600`: #2563eb
- `--color-info-700`: #1d4ed8

## 字体系统

### 字体栈

```css
--font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
--font-family-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
```

### 字体层级

| 样式 | 大小 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| 标题1 | 2rem (32px) | 700 | 1.2 | 页面主标题 |
| 标题2 | 1.5rem (24px) | 600 | 1.3 | 区块标题 |
| 标题3 | 1.25rem (20px) | 600 | 1.4 | 卡片标题 |
| 标题4 | 1.125rem (18px) | 600 | 1.4 | 小标题 |
| 正文大 | 1.125rem (18px) | 400 | 1.6 | 重要正文 |
| 正文 | 1rem (16px) | 400 | 1.6 | 默认正文 |
| 正文小 | 0.875rem (14px) | 400 | 1.5 | 次要文字 |
| 辅助文字 | 0.75rem (12px) | 400 | 1.5 | 标签、提示 |

## 间距系统

基于4px网格系统：

| Token | 值 | 用途 |
|-------|-----|------|
| `--space-1` | 0.25rem (4px) | 图标内边距、小间隙 |
| `--space-2` | 0.5rem (8px) | 紧凑内边距 |
| `--space-3` | 0.75rem (12px) | 按钮内边距 |
| `--space-4` | 1rem (16px) | 默认内边距 |
| `--space-5` | 1.25rem (20px) | 表单元素间距 |
| `--space-6` | 1.5rem (24px) | 卡片内边距 |
| `--space-8` | 2rem (32px) | 区块间距 |
| `--space-10` | 2.5rem (40px) | 大区块间距 |
| `--space-12` | 3rem (48px) | 页面内边距 |
| `--space-16` | 4rem (64px) | 大间距 |

## 圆角系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | 0.25rem (4px) | 小元素、标签 |
| `--radius-md` | 0.375rem (6px) | 按钮、输入框 |
| `--radius-lg` | 0.5rem (8px) | 卡片、弹窗 |
| `--radius-xl` | 0.75rem (12px) | 大卡片 |
| `--radius-2xl` | 1rem (16px) | 特殊容器 |
| `--radius-full` | 9999px | 圆形、胶囊 |

## 阴影系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-sm` | 0 1px 2px 0 rgb(0 0 0 / 0.05) | 小元素悬停 |
| `--shadow-md` | 0 4px 6px -1px rgb(0 0 0 / 0.1) | 卡片、下拉 |
| `--shadow-lg` | 0 10px 15px -3px rgb(0 0 0 / 0.1) | 弹窗、模态 |
| `--shadow-xl` | 0 20px 25px -5px rgb(0 0 0 / 0.1) | 特殊强调 |

## 组件规范

### 按钮 (Button)

#### 主按钮
- 背景: `--color-primary-600`
- 文字: 白色
- 内边距: `--space-3` `--space-4`
- 圆角: `--radius-md`
- 字体: 正文小，字重600
- 悬停: `--color-primary-700`
- 按下: `--color-primary-800`
- 禁用: `--color-primary-300`

#### 次要按钮
- 背景: 白色
- 边框: 1px solid `--color-neutral-300`
- 文字: `--color-neutral-700`
- 悬停: `--color-neutral-50`

#### 文字按钮
- 背景: 透明
- 文字: `--color-primary-600`
- 悬停: `--color-primary-50`

### 输入框 (Input)

- 高度: 2.5rem (40px)
- 内边距: 0 `--space-3`
- 边框: 1px solid `--color-neutral-300`
- 圆角: `--radius-md`
- 背景: 白色
- 占位符: `--color-neutral-400`
- 聚焦: 边框 `--color-primary-500`，阴影 `--shadow-sm`
- 错误: 边框 `--color-error-500`

### 卡片 (Card)

- 背景: 白色
- 圆角: `--radius-lg`
- 阴影: `--shadow-md`
- 内边距: `--space-6`
- 悬停: `--shadow-lg`（可选）

### 标签 (Tag)

- 高度: 1.5rem (24px)
- 内边距: 0 `--space-2`
- 圆角: `--radius-full`
- 字体: 辅助文字，字重500

#### 标签变体
- 默认: 背景 `--color-neutral-100`，文字 `--color-neutral-700`
- 成功: 背景 `--color-success-50`，文字 `--color-success-700`
- 警告: 背景 `--color-warning-50`，文字 `--color-warning-700`
- 错误: 背景 `--color-error-50`，文字 `--color-error-700`
- 信息: 背景 `--color-info-50`，文字 `--color-info-700`

## 暗色模式

### 颜色映射

| 亮色 | 暗色 |
|------|------|
| `--color-neutral-50` | `--color-neutral-900` |
| `--color-neutral-100` | `--color-neutral-800` |
| `--color-neutral-200` | `--color-neutral-700` |
| `--color-neutral-700` | `--color-neutral-300` |
| `--color-neutral-800` | `--color-neutral-200` |
| `--color-neutral-900` | `--color-neutral-100` |

### 组件适配

- 卡片背景: `--color-neutral-800`
- 输入框背景: `--color-neutral-800`
- 边框: `--color-neutral-700`
- 主文字: `--color-neutral-100`
- 次要文字: `--color-neutral-400`

## 响应式断点

| 断点 | 宽度 | 用途 |
|------|------|------|
| `sm` | 640px | 小屏手机 |
| `md` | 768px | 平板 |
| `lg` | 1024px | 小桌面 |
| `xl` | 1280px | 桌面 |
| `2xl` | 1536px | 大桌面 |

## 可访问性

- 所有交互元素最小尺寸: 44x44px
- 颜色对比度: 至少 4.5:1（AA级）
- 焦点状态: 明显的轮廓或阴影
- 支持键盘导航
- 支持屏幕阅读器
