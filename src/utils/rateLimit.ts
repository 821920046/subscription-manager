/**
 * 速率限制器
 */

import { Env } from '../types';
import { CONFIG } from '../config/constants';
import { RateLimitError } from './errors';
import { Logger } from './logger';

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

/**
 * 速率限制器类
 */
export class RateLimiter {
    private static configs: Record<string, RateLimitConfig> = {
        login: CONFIG.RATE_LIMIT.LOGIN,
        api: CONFIG.RATE_LIMIT.API,
        notify: CONFIG.RATE_LIMIT.NOTIFY,
    };

    /**
     * 检查是否超过速率限制
     */
    static async check(
        env: Env,
        ip: string,
        type: keyof typeof RateLimiter.configs = 'api'
    ): Promise<RateLimitResult> {
        const config = this.configs[type] || this.configs.api;
        const bucket = Math.floor(Date.now() / config.windowMs);
        const rateLimitKey = `ratelimit:${type}:${ip}:${bucket}`;

        try {
            const current = await env.SUBSCRIPTIONS_KV.get(rateLimitKey);
            const count = current ? parseInt(current, 10) : 0;

            const remaining = Math.max(0, config.maxRequests - count - 1);
            const resetAt = (bucket + 1) * config.windowMs;

            if (count >= config.maxRequests) {
                Logger.warn('Rate limit exceeded', { ip, type, count });
                return { allowed: false, remaining: 0, resetAt };
            }

            // 更新计数，设置过期时间为窗口时间的2倍（防止边界问题）
            const ttl = Math.ceil(config.windowMs / 1000) * 2;
            await env.SUBSCRIPTIONS_KV.put(rateLimitKey, String(count + 1), {
                expirationTtl: ttl,
            });

            return { allowed: true, remaining, resetAt };
        } catch (error) {
            Logger.error('Rate limit check failed', error);
            // 如果速率限制检查失败，允许请求通过（降级策略）
            return { allowed: true, remaining: config.maxRequests, resetAt: Date.now() + config.windowMs };
        }
    }

    /**
     * 检查并抛出错误（如果超限）
     */
    static async checkOrThrow(
        env: Env,
        ip: string,
        type: keyof typeof RateLimiter.configs = 'api'
    ): Promise<void> {
        const result = await this.check(env, ip, type);
        if (!result.allowed) {
            throw new RateLimitError('请求过于频繁，请稍后再试');
        }
    }

    /**
     * 重置特定 IP 的速率限制（用于测试或管理）
     */
    static async reset(env: Env, ip: string, type: string): Promise<void> {
        const bucket = Math.floor(Date.now() / (this.configs[type]?.windowMs || CONFIG.RATE_LIMIT.API.windowMs));
        const rateLimitKey = `ratelimit:${type}:${ip}:${bucket}`;
        await env.SUBSCRIPTIONS_KV.delete(rateLimitKey);
    }
}
