/**
 * 监控和度量服务
 */

import { Env } from '../types';
import { Logger } from '../utils/logger';

export interface Metric {
    name: string;
    value: number;
    timestamp: number;
    tags?: Record<string, string>;
}

export interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
        kv: boolean;
        config: boolean;
        timestamp: number;
    };
    uptime: number;
}

/**
 * 监控服务类
 */
export class MonitoringService {
    private startTime: number;

    constructor() {
        this.startTime = Date.now();
    }

    /**
     * 记录度量指标
     */
    async trackMetric(metric: Metric): Promise<void> {
        try {
            Logger.info('Metric tracked', metric);
            // 未来可以集成 Cloudflare Analytics Engine
            // await env.ANALYTICS?.writeDataPoint({
            //   blobs: [metric.name],
            //   doubles: [metric.value],
            //   indexes: [metric.timestamp]
            // });
        } catch (error) {
            Logger.error('Failed to track metric', error);
        }
    }

    /**
     * 记录 API 请求
     */
    async trackRequest(path: string, method: string, statusCode: number, duration: number): Promise<void> {
        await this.trackMetric({
            name: 'api_request',
            value: duration,
            timestamp: Date.now(),
            tags: {
                path,
                method,
                status: statusCode.toString(),
            },
        });
    }

    /**
     * 记录通知发送
     */
    async trackNotification(channel: string, success: boolean): Promise<void> {
        await this.trackMetric({
            name: 'notification_sent',
            value: success ? 1 : 0,
            timestamp: Date.now(),
            tags: {
                channel,
                status: success ? 'success' : 'fail',
            },
        });
    }

    /**
     * 健康检查
     */
    async healthCheck(env: Env): Promise<HealthCheckResult> {
        const checks = {
            kv: false,
            config: false,
            timestamp: Date.now(),
        };

        try {
            // 检查 KV 是否可用
            const testKey = 'health_check_test';
            await env.SUBSCRIPTIONS_KV.put(testKey, 'ok');
            const testValue = await env.SUBSCRIPTIONS_KV.get(testKey);
            checks.kv = testValue === 'ok';
            await env.SUBSCRIPTIONS_KV.delete(testKey);
        } catch (error) {
            Logger.error('KV health check failed', error);
            checks.kv = false;
        }

        try {
            // 检查配置是否可读
            const config = await env.SUBSCRIPTIONS_KV.get('config');
            checks.config = config !== null;
        } catch (error) {
            Logger.error('Config health check failed', error);
            checks.config = false;
        }

        const uptime = Date.now() - this.startTime;
        const allHealthy = checks.kv && checks.config;
        const someHealthy = checks.kv || checks.config;

        return {
            status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
            checks,
            uptime,
        };
    }

    /**
     * 捕获异常
     */
    captureException(error: Error, context?: Record<string, unknown>): void {
        Logger.error('Exception captured', error);

        // 未来可以集成 Sentry 或其他错误追踪服务
        if (context) {
            Logger.info('Exception context', context);
        }
    }

    /**
     * 记录性能指标
     */
    async trackPerformance(operation: string, durationMs: number): Promise<void> {
        await this.trackMetric({
            name: 'performance',
            value: durationMs,
            timestamp: Date.now(),
            tags: {
                operation,
            },
        });

        if (durationMs > 1000) {
            Logger.warn('Slow operation detected', {
                operation,
                duration: durationMs,
            });
        }
    }

    /**
     * 获取系统统计信息
     */
    async getStats(env: Env): Promise<{
        totalSubscriptions: number;
        activeSubscriptions: number;
        inactiveSubscriptions: number;
        uptime: number;
    }> {
        try {
            const indexStr = await env.SUBSCRIPTIONS_KV.get('subscriptions:index');
            const totalSubscriptions = indexStr ? JSON.parse(indexStr).length : 0;

            // 简化版统计，实际使用时可以并行读取所有订阅来获取准确数据
            return {
                totalSubscriptions,
                activeSubscriptions: 0, // 需要遍历所有订阅计算
                inactiveSubscriptions: 0,
                uptime: Date.now() - this.startTime,
            };
        } catch (error) {
            Logger.error('Failed to get stats', error);
            return {
                totalSubscriptions: 0,
                activeSubscriptions: 0,
                inactiveSubscriptions: 0,
                uptime: Date.now() - this.startTime,
            };
        }
    }
}

/**
 * 性能监控装饰器工厂
 */
export function withPerformanceTracking(monitoringService: MonitoringService, operationName: string) {
    return function <T extends (...args: unknown[]) => Promise<unknown>>(
        _target: unknown,
        _propertyName: string,
        descriptor: TypedPropertyDescriptor<T>
    ): TypedPropertyDescriptor<T> {
        const originalMethod = descriptor.value;

        if (!originalMethod) {
            return descriptor;
        }

        descriptor.value = async function (this: unknown, ...args: unknown[]) {
            const startTime = Date.now();
            try {
                const result = await originalMethod.apply(this, args);
                const duration = Date.now() - startTime;
                await monitoringService.trackPerformance(operationName, duration);
                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                await monitoringService.trackPerformance(`${operationName}_error`, duration);
                throw error;
            }
        } as T;

        return descriptor;
    };
}
