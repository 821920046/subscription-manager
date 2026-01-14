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
