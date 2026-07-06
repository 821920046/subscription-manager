/**
 * 订阅服务测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionService } from '../../src/services/subscription';
import { Env, Subscription } from '../../src/types';

// 创建模拟 KV命名空间
function createMockKV() {
    const store = new Map<string, string>();

    return {
        async get(key: string): Promise<string | null> {
            return store.get(key) || null;
        },
        async put(key: string, value: string): Promise<void> {
            store.set(key, value);
        },
        async delete(key: string): Promise<void> {
            store.delete(key);
        },
        async list(options?: { prefix?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean }> {
            const prefix = options?.prefix || '';
            const keys = Array.from(store.keys())
                .filter((k) => k.startsWith(prefix))
                .map((name) => ({ name }));
            return { keys, list_complete: true };
        },
    };
}

describe('Subscription Service', () => {
    let service: SubscriptionService;
    let mockEnv: Env;

    beforeEach(() => {
        mockEnv = {
            SUBSCRIPTIONS_KV: createMockKV(),
        };
        service = new SubscriptionService(mockEnv);
    });

    describe('createSubscription', () => {
        it('应该成功创建订阅', async () => {
            const subscription: Partial<Subscription> = {
                name: 'Netflix',
                expiryDate: '2024-12-31T00:00:00.000Z',
                isActive: true,
                autoRenew: true,
            };

            const result = await service.createSubscription(subscription);

            expect(result.success).toBe(true);
            expect(result.subscription).toBeDefined();
            expect(result.subscription?.name).toBe('Netflix');
        });

        it('应该拒绝缺少必填字段的订阅', async () => {
            const subscription: Partial<Subscription> = {
                name: 'Netflix',
                // 缺少 expiryDate
            };

            const result = await service.createSubscription(subscription);

            expect(result.success).toBe(false);
            expect(result.message).toBeDefined();
        });
    });

    describe('getAllSubscriptions', () => {
        it('读取热路径不应重复调用 KV list（免费额度）', async () => {
            const store = new Map<string, string>();
            let listCount = 0;
            const kv = {
                async get(k: string) { return store.get(k) ?? null; },
                async put(k: string, v: string) { store.set(k, v); },
                async delete(k: string) { store.delete(k); },
                async list(o?: { prefix?: string }) {
                    listCount++;
                    const p = o?.prefix || '';
                    return { keys: [...store.keys()].filter((k) => k.startsWith(p)).map((name) => ({ name })), list_complete: true };
                },
            };
            const svc = new SubscriptionService({ SUBSCRIPTIONS_KV: kv } as never);
            store.set('subscription:a', JSON.stringify({ id: 'a', name: 'A', expiryDate: '2030-01-01T00:00:00.000Z', isActive: true, autoRenew: true }));
            await svc.getAllSubscriptions(); // 首次重建索引（1 次 list）
            listCount = 0;
            await svc.getAllSubscriptions();
            await svc.getAllSubscriptions();
            expect(listCount).toBe(0);
        });

        it('应该返回空数组当没有订阅时', async () => {
            const subscriptions = await service.getAllSubscriptions();
            expect(subscriptions).toEqual([]);
        });

        it('应该返回所有订阅', async () => {
            await service.createSubscription({
                name: 'Netflix',
                expiryDate: '2024-12-31T00:00:00.000Z',
                isActive: true,
                autoRenew: true,
            });

            const subscriptions = await service.getAllSubscriptions();
            expect(subscriptions).toHaveLength(1);
            expect(subscriptions[0].name).toBe('Netflix');
        });
    });

    describe('updateSubscription', () => {
        it('应该成功更新订阅', async () => {
            const created = await service.createSubscription({
                name: 'Netflix',
                expiryDate: '2024-12-31T00:00:00.000Z',
                isActive: true,
                autoRenew: true,
            });

            const updated = await service.updateSubscription(created.subscription!.id, {
                name: 'Netflix Premium',
                expiryDate: '2024-12-31T00:00:00.000Z',
            });

            expect(updated.success).toBe(true);
            expect(updated.subscription?.name).toBe('Netflix Premium');
        });
    });

    describe('deleteSubscription', () => {
        it('应该成功删除订阅', async () => {
            const created = await service.createSubscription({
                name: 'Netflix',
                expiryDate: '2024-12-31T00:00:00.000Z',
                isActive: true,
                autoRenew: true,
            });

            const result = await service.deleteSubscription(created.subscription!.id);

            expect(result.success).toBe(true);

            const subscriptions = await service.getAllSubscriptions();
            expect(subscriptions).toHaveLength(0);
        });
    });
});
