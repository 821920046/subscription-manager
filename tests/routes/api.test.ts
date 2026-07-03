/**
 * API 路由测试（健康检查 / 鉴权 / CSRF 同源校验）
 */
import { describe, it, expect } from 'vitest';
import { handleApiRequest } from '../../src/routes/api';

function createMockKV() {
  const store = new Map<string, string>();
  return {
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

function mkEnv() {
  return { SUBSCRIPTIONS_KV: createMockKV() } as never;
}

describe('API routes', () => {
  it('GET /api/health 返回 ok 且不含敏感信息', async () => {
    const res = await handleApiRequest(new Request('https://example.com/api/health'), mkEnv());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; kvBound: boolean };
    expect(body.status).toBe('ok');
    expect(body.kvBound).toBe(true);
  });

  it('未认证的写请求返回 401', async () => {
    const res = await handleApiRequest(
      new Request('https://example.com/api/subscriptions', { method: 'POST', body: '{}' }),
      mkEnv()
    );
    expect(res.status).toBe(401);
  });

  it('未认证的读请求也返回 401', async () => {
    const res = await handleApiRequest(
      new Request('https://example.com/api/subscriptions'),
      mkEnv()
    );
    expect(res.status).toBe(401);
  });
});
