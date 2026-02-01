// 测试辅助函数和工具

import { vi } from 'vitest';

// 创建模拟的 Hono Context
export function createMockContext(overrides: Partial<any> = {}) {
  const defaultContext = {
    req: {
      path: '/test',
      method: 'GET',
      header: vi.fn(),
      query: vi.fn(),
      param: vi.fn(),
      json: vi.fn().mockResolvedValue({}),
    },
    res: {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    },
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    get: vi.fn(),
    set: vi.fn(),
    env: {
      ENVIRONMENT: 'test',
      SUBSCRIPTIONS_KV: createMockKV(),
    },
  };

  return { ...defaultContext, ...overrides };
}

// 创建模拟的 KV 存储
export function createMockKV() {
  const store = new Map<string, any>();

  return {
    get: vi.fn(async (key: string) => store.get(key) || null),
    put: vi.fn(async (key: string, value: any) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(async () => ({
      keys: Array.from(store.keys()).map((key) => ({ name: key })),
      list_complete: true,
    })),
    _store: store, // 用于测试验证
  };
}

// 创建模拟的 Next 函数
export function createMockNext() {
  return vi.fn().mockResolvedValue(undefined);
}

// 等待指定时间
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 生成测试数据
export function generateUUID(): string {
  return crypto.randomUUID();
}

// 创建测试订阅数据
export function createTestSubscription(overrides: Partial<any> = {}) {
  return {
    id: generateUUID(),
    name: 'Test Subscription',
    startDate: '2024-01-01',
    expiryDate: '2024-12-31',
    price: 99.99,
    reminderDays: 7,
    isActive: true,
    autoRenew: false,
    useLunar: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// 模拟 console 方法
export function mockConsole() {
  return {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  };
}

// 恢复 console 方法
export function restoreConsole(mocks: ReturnType<typeof mockConsole>) {
  Object.values(mocks).forEach((mock) => mock.mockRestore());
}
