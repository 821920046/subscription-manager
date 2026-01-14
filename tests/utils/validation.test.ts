/**
 * 数据验证测试
 */

import { describe, it, expect } from 'vitest';
import {
    SubscriptionSchema,
    LoginSchema,
    ConfigSchema,
} from '../../src/utils/validation';

describe('Validation Schemas', () => {
    describe('SubscriptionSchema', () => {
        it('应该验证有效的订阅数据', () => {
            const validData = {
                name: 'Netflix',
                expiryDate: '2024-12-31T00:00:00.000Z',
                isActive: true,
                autoRenew: true,
            };

            const result = SubscriptionSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('应该拒绝缺少必填字段的数据', () => {
            const invalidData = {
                name: 'Netflix',
                // 缺少 expiryDate
            };

            const result = SubscriptionSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('应该拒绝无效的时间格式', () => {
            const invalidData = {
                name: 'Netflix',
                expiryDate: 'invalid-date',
                dailyReminderTimes: ['25:00'], // 无效时间
            };

            const result = SubscriptionSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('应该拒绝超过最大长度的字段', () => {
            const invalidData = {
                name: 'N'.repeat(101), // 超过 100 字符
                expiryDate: '2024-12-31T00:00:00.000Z',
            };

            const result = SubscriptionSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('LoginSchema', () => {
        it('应该验证有效的登录数据', () => {
            const validData = {
                username: 'admin',
                password: 'password123',
            };

            const result = LoginSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('应该拒绝空用户名或密码', () => {
            const invalidData = {
                username: '',
                password: 'password123',
            };

            const result = LoginSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('ConfigSchema', () => {
        it('应该验证有效的配置数据', () => {
            const validData = {
                ADMIN_USERNAME: 'admin',
                ADMIN_PASSWORD: 'password123',
                TIMEZONE: 'Asia/Shanghai',
            };

            const result = ConfigSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('应该拒绝过短的密码', () => {
            const invalidData = {
                ADMIN_PASSWORD: '12345', // 少于 6 个字符
            };

            const result = ConfigSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });
});
