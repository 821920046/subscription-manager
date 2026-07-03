/**
 * API 路由测试（健康检查 / 鉴权 / 会话吸销 / 导出）
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { handleApiRequest } from '../../src/routes/api';
import { generateJWT } from '../../src/utils/auth';
import { clearConfigCache } from '../../src/utils/config';

const JWT = 'test-secret-1234567890abcdefghijklmnop';

function createMockKV() {
  const store = new Map<string, string>();
  return {
    store,
    async get(k: string) {
      return store.get(k) ?? null;
    },
    async put(k: string, v: string) {
      store.set(k, v);
    },
    async delete(k: string) {
      store.delete(k);
    },
    async list(o?: { prefix?: string }) {
      const p = o?.prefix || '';
      return {
        keys: [...store.keys()].filter((k) => k.startsWith(p)).map((name) => ({ name })),
        list_complete: true,
      };
    },
  };
}

describe('API routes', () => {
  // getConfig 有模块级缓存（生产中每 isolate 正常），测试间需清除以隔离
  beforeEach(() => clearConfigCache());

  it('GET /api/health 返回 ok 且不含敏感信息', async () => {
    const kv = createMockKV();
    const res = await handleApiRequest(
      new Request('https://example.com/api/health'),
      { SUBSCRIPTIONS_KV: kv } as never
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; kvBound: boolean };
    expect(body.status).toBe('ok');
    expect(body.kvBound).toBe(true);
  });

  it('未认证的写请求返回 401', async () => {
    const kv = createMockKV();
    const res = await handleApiRequest(
      new Request('https://example.com/api/subscriptions', { method: 'POST', body: '{}' }),
      { SUBSCRIPTIONS_KV: kv } as never
    );
    expect(res.status).toBe(401);
  });

  it('会话被吸销（iat < tokenValidFrom）返回 401', async () => {
    const kv = createMockKV();
    await kv.put(
      'config',
      JSON.stringify({
        ADMIN_USERNAME: 'admin',
        JWT_SECRET: JWT,
        TOKEN_VALID_FROM: Math.floor(Date.now() / 1000) + 100,
      })
    );
    const token = await generateJWT('admin', JWT);
    const res = await handleApiRequest(
      new Request('https://example.com/api/config', { headers: { Cookie: `token=${token}` } }),
      { SUBSCRIPTIONS_KV: kv } as never
    );
    expect(res.status).toBe(401);
  });

  it('跨站写请求（Origin 不同源）返回 403', async () => {
    const kv = createMockKV();
    await kv.put('config', JSON.stringify({ ADMIN_USERNAME: 'admin', JWT_SECRET: JWT, TOKEN_VALID_FROM: 0 }));
    const token = await generateJWT('admin', JWT);
    const res = await handleApiRequest(
      new Request('https://example.com/api/subscriptions', {
        method: 'POST',
        headers: {
          Cookie: `token=${token}`,
          Origin: 'https://evil.example.net',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'x', expiryDate: '2030-01-01T00:00:00.000Z' }),
      }),
      { SUBSCRIPTIONS_KV: kv } as never
    );
    expect(res.status).toBe(403);
  });

  it('GET /api/export 下载备份 JSON', async () => {
    const kv = createMockKV();
    await kv.put('config', JSON.stringify({ ADMIN_USERNAME: 'admin', JWT_SECRET: JWT, TOKEN_VALID_FROM: 0 }));
    await kv.put(
      'subscription:abc',
      JSON.stringify({ id: 'abc', name: 'Netflix', expiryDate: '2030-01-01T00:00:00.000Z', isActive: true, autoRenew: true })
    );
    const token = await generateJWT('admin', JWT);
    const res = await handleApiRequest(
      new Request('https://example.com/api/export', { headers: { Cookie: `token=${token}` } }),
      { SUBSCRIPTIONS_KV: kv } as never
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number; subscriptions: Array<{ name: string }> };
    expect(body.count).toBe(1);
    expect(body.subscriptions[0].name).toBe('Netflix');
  });
});
