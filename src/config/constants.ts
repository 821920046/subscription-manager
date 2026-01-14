/**
 * 应用程序全局常量配置
 */

export const CONFIG = {
    // JWT 配置
    JWT: {
        EXPIRY: '24h',
        MIN_SECRET_LENGTH: 32,
        ALGORITHM: 'HS256' as const,
    },

    // 速率限制配置
    RATE_LIMIT: {
        LOGIN: {
            maxRequests: 5,
            windowMs: 60000, // 1 分钟
        },
        API: {
            maxRequests: 100,
            windowMs: 60000,
        },
        NOTIFY: {
            maxRequests: 20,
            windowMs: 60000,
        },
    },

    // 缓存配置
    CACHE: {
        CONFIG_TTL: 60000, // 1 分钟
        SUBSCRIPTION_TTL: 30000, // 30 秒
    },

    // 验证配置
    VALIDATION: {
        MAX_NAME_LENGTH: 100,
        MAX_NOTES_LENGTH: 500,
        MAX_CUSTOM_TYPE_LENGTH: 50,
        MAX_PRICE: 999999.99,
        MIN_PRICE: 0,
        MAX_PERIOD_VALUE: 100,
        MIN_PERIOD_VALUE: 1,
        MAX_REMINDER_DAYS: 365,
        MIN_REMINDER_DAYS: 0,
    },

    // 批处理配置
    BATCH: {
        SUBSCRIPTION_BATCH_SIZE: 50, // KV 批量查询每批数量
    },

    // 错误日志配置
    FAILURE_LOG: {
        MAX_RECORDS: 100, // 最多保留的失败日志数量
        DEFAULT_LIMIT: 50, // 默认查询数量
    },

    // 默认值
    DEFAULTS: {
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD: 'password',
        TIMEZONE: 'UTC',
        REMINDER_DAYS: 7,
        PERIOD_VALUE: 1,
        PERIOD_UNIT: 'month' as const,
        BARK_SERVER: 'https://api.day.app',
    },
} as const;

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
} as const;

export const CONTENT_TYPE = {
    JSON: 'application/json',
    HTML: 'text/html; charset=utf-8',
    TEXT: 'text/plain; charset=utf-8',
} as const;
