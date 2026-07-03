/**
 * API 路由处理器
 * 处理所有 /api/* 路由
 */

import { Config, Env } from '../types';
import { SubscriptionService } from '../services/subscription';
import {
    sendNotificationToAllChannels,
    sendTelegramNotification,
    sendNotifyXNotification,
    sendWeNotifyEdgeNotification,
    sendWebhookNotification,
    sendWechatBotNotification,
    sendWeChatOfficialAccountNotification,
    sendEmailNotification,
    sendBarkNotification,
    formatNotificationContent,
} from '../services/notification';
import { getConfig, getRawConfig, clearConfigCache } from '../utils/config';
import {
    generateJWT,
    verifyJWT,
    generateRandomSecret,
    hashPasswordPBKDF2,
    timingSafeEqual,
} from '../utils/auth';
import { verifyAdminPassword } from '../utils/config';
import { getCookieValue } from '../utils/http';
import { isRateLimited, getClientIP } from '../middleware/rateLimit';
import { CONFIG } from '../config/constants';
import { dayDiffInTimezone } from '../utils/date';
import { z } from 'zod';
import {
    LoginSchema,
    ThirdPartyNotifySchema,
    ConfigSchema,
    TestNotificationSchema,
    SubscriptionSchema,
    SubscriptionUpdateSchema,
} from '../utils/validation';
import { jsonResponse, errorResponse, redirectResponse } from '../middleware/security';

/**
 * API 路由上下文
 */
interface ApiContext {
    request: Request;
    env: Env;
    url: URL;
    path: string;
    method: string;
    config: Config;
    ip: string;
}

// 含敏感凭据的配置键：GET 时以掩码占位回传，POST/测试时若仍为掩码则视为“未修改”
const SECRET_CONFIG_KEYS = [
    'TG_BOT_TOKEN',
    'NOTIFYX_API_KEY',
    'WENOTIFY_TOKEN',
    'WECHAT_OA_APPSECRET',
    'RESEND_API_KEY',
    'BARK_DEVICE_KEY',
] as const;
const SECRET_MASK = '__SECRET_UNCHANGED__';

/**
 * CSRF 纵深防御：校验写请求的 Origin 是否与当前主机同源。
 * 无 Origin 头（多为非浏览器客户端）放行；浏览器发起的跨站写请求必带 Origin。
 */
function isSameOrigin(ctx: ApiContext): boolean {
    const origin = ctx.request.headers.get('Origin');
    if (!origin) return true;
    try {
        return new URL(origin).host === ctx.url.host;
    } catch {
        return false;
    }
}

/**
 * 健康检查端点（公开，不含任何敏感信息）
 */
function handleHealth(ctx: ApiContext): Response {
    return jsonResponse(
        {
            status: 'ok',
            kvBound: !!ctx.env.SUBSCRIPTIONS_KV,
            timestamp: new Date().toISOString(),
        },
        200,
        { 'Cache-Control': 'no-store' }
    );
}

/**
 * 处理 API 请求
 */
export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.slice(4); // Remove '/api'
    const method = request.method;
    const config = await getConfig(env);
    const ip = getClientIP(request);

    const ctx: ApiContext = { request, env, url, path, method, config, ip };

    // 公开 API 路由
    if (path === '/dev/reset-login' && method === 'POST') {
        return handleDevResetLogin(ctx);
    }

    if (path === '/login' && method === 'POST') {
        return handleLogin(ctx);
    }

    if (path === '/logout' && (method === 'GET' || method === 'POST')) {
        return handleLogout(ctx);
    }

    if (path === '/health' && method === 'GET') {
        return handleHealth(ctx);
    }

    if (path.startsWith('/notify/') && method === 'POST') {
        return handleThirdPartyNotify(ctx);
    }

    // 需要认证的路由
    const token = getCookieValue(request.headers.get('Cookie'), 'token');
    let user = token ? await verifyJWT(token, config.jwtSecret!) : null;
    // 服务端会话吸销：登出后签发时间早于吸销点的 token 视为失效
    if (user && (config.tokenValidFrom || 0) > (user.iat || 0)) {
        user = null;
    }

    if (!user) {
        return errorResponse('Unauthorized', 401);
    }

    // CSRF 纵深防御：对基于 Cookie 鉴权的写操作校验同源
    if ((method === 'POST' || method === 'PUT' || method === 'DELETE') && !isSameOrigin(ctx)) {
        return errorResponse('Cross-origin request forbidden', 403);
    }

    // 认证后的路由
    if (path === '/config') {
        return handleConfigApi(ctx, method);
    }

    if (path === '/failure-logs' && method === 'GET') {
        return handleFailureLogs(ctx);
    }

    if (path === '/test-notification' && method === 'POST') {
        return handleTestNotification(ctx);
    }

    if (path === '/subscriptions') {
        return handleSubscriptionsApi(ctx);
    }

    if (path.startsWith('/subscriptions/')) {
        return handleSubscriptionByIdApi(ctx);
    }

    if (path === '/export' && method === 'GET') {
        return handleExport(ctx);
    }

    return errorResponse('Not Found', 404);
}

/**
 * 开发环境重置登录
 */
async function handleDevResetLogin(ctx: ApiContext): Promise<Response> {
    try {
        const isLocal =
            ctx.url.hostname === '127.0.0.1' || ctx.url.hostname === 'localhost';
        if (!isLocal) {
            return errorResponse('仅限本地开发使用', 403);
        }
        const raw = await getRawConfig(ctx.env);
        raw.ADMIN_USERNAME = 'admin';
        raw.ADMIN_PASSWORD = 'password';
        if (!raw.JWT_SECRET) {
            raw.JWT_SECRET = generateRandomSecret();
        }
        await ctx.env.SUBSCRIPTIONS_KV.put('config', JSON.stringify(raw));
        return jsonResponse({ success: true });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : '未知错误';
        return errorResponse(message, 500);
    }
}

/**
 * 登录处理
 */
async function handleLogin(ctx: ApiContext): Promise<Response> {
    try {
        const limited = await isRateLimited(
            ctx.env.SUBSCRIPTIONS_KV,
            'login',
            ctx.ip,
            CONFIG.RATE_LIMIT.LOGIN.maxRequests
        );
        if (limited) {
            return errorResponse('请求过于频繁', 429);
        }

        const json = await ctx.request.json();
        const body = await LoginSchema.parseAsync(json);

        const expectedUser = ctx.config.adminUsername || 'admin';
        const expectedPass = ctx.config.adminPassword || 'password';
        const inputUser = body.username;
        const inputPass = body.password;

        const ok =
            inputUser === expectedUser &&
            (await verifyAdminPassword(inputPass, expectedPass));

        if (ok) {
            const token = await generateJWT(body.username, ctx.config.jwtSecret!);
            const secureFlag = ctx.url.protocol === 'https:' ? '; Secure' : '';
            return jsonResponse(
                { success: true },
                200,
                {
                    'Set-Cookie': `token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`,
                }
            );
        } else {
            return jsonResponse({ success: false, message: '用户名或密码错误' });
        }
    } catch (e: unknown) {
        if (e instanceof z.ZodError) {
            return errorResponse(e.issues[0].message, 400);
        }
        return errorResponse('Invalid request', 400);
    }
}

/**
 * 登出处理
 */
async function handleLogout(ctx: ApiContext): Promise<Response> {
    // 服务端吸销：将 TOKEN_VALID_FROM 置为当前时间，使所有已签发的旧 token 立即失效
    try {
        const raw = await getRawConfig(ctx.env);
        raw.TOKEN_VALID_FROM = Math.floor(Date.now() / 1000);
        await ctx.env.SUBSCRIPTIONS_KV.put('config', JSON.stringify(raw));
        clearConfigCache();
    } catch (e) {
        console.error('[Logout] 写入吸销时间失败', e);
    }
    const secureFlag = ctx.url.protocol === 'https:' ? '; Secure' : '';
    return redirectResponse('/', 302, {
        'Set-Cookie': `token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`,
    });
}

/**
 * 第三方通知 API
 */
async function handleThirdPartyNotify(ctx: ApiContext): Promise<Response> {
    try {
        const limited = await isRateLimited(
            ctx.env.SUBSCRIPTIONS_KV,
            'notify',
            ctx.ip,
            CONFIG.RATE_LIMIT.NOTIFY.maxRequests
        );
        if (limited) {
            return errorResponse('请求过于频繁', 429);
        }

        const tokenHeader = ctx.request.headers.get('X-Notify-Token') || '';
        const tokenQuery = ctx.url.searchParams.get('token') || '';
        const providedToken = tokenHeader || tokenQuery;

        if (!providedToken || !timingSafeEqual(providedToken, ctx.config.thirdPartyToken || '')) {
            return errorResponse('Unauthorized', 403);
        }

        const json = await ctx.request.json();
        const body = await ThirdPartyNotifySchema.parseAsync(json);

        await sendNotificationToAllChannels(body.title, body.content, ctx.config, ctx.env, '[第三方API]');

        return jsonResponse({
            message: '发送成功',
            response: { errcode: 0, errmsg: 'ok', msgid: 'MSGID' + Date.now() },
        });
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            return errorResponse(error.issues[0].message, 400);
        }
        const message = error instanceof Error ? error.message : '未知错误';
        return jsonResponse(
            {
                message: '发送失败',
                response: { errcode: 1, errmsg: message },
            },
            500
        );
    }
}

/**
 * 配置 API
 */
async function handleConfigApi(ctx: ApiContext, method: string): Promise<Response> {
    if (method === 'GET') {
        const rawConfig = await getRawConfig(ctx.env);
        const safeConfig = { ...rawConfig };
        delete safeConfig.JWT_SECRET;
        delete safeConfig.ADMIN_PASSWORD;
        delete safeConfig.THIRD_PARTY_TOKEN;
        // 敏感凭据不回传明文：非空则以掩码占位，前端原样回填；保存/测试时掩码会被视为“未修改”
        for (const key of SECRET_CONFIG_KEYS) {
            if (typeof safeConfig[key] === 'string' && (safeConfig[key] as string).length > 0) {
                safeConfig[key] = SECRET_MASK;
            }
        }
        // 配置中含敏感凭据，禁止中间缓存/浏览器缓存
        return jsonResponse(safeConfig, 200, { 'Cache-Control': 'no-store' });
    }

    if (method === 'POST') {
        try {
            const json = (await ctx.request.json()) as Record<string, unknown>;
            const body = await ConfigSchema.partial().parseAsync(json);
            const currentRawConfig = await getRawConfig(ctx.env);

            // 仅覆盖请求中显式提供的字段，避免部分更新时清空其它已保存配置
            const providedKeys = new Set(Object.keys(json));
            const bodyRecord = body as Record<string, unknown>;
            const updatedConfig: Record<string, unknown> = { ...currentRawConfig };
            for (const key of providedKeys) {
                if (key === 'ADMIN_PASSWORD') continue; // 密码单独处理
                if (!(key in bodyRecord)) continue;
                // 敏感字段仍为掩码占位 => 用户未修改，保留原值
                if (
                    (SECRET_CONFIG_KEYS as readonly string[]).includes(key) &&
                    bodyRecord[key] === SECRET_MASK
                ) {
                    continue;
                }
                updatedConfig[key] = bodyRecord[key];
            }

            // 管理员密码：仅在显式提供且非空时更新，并以 WebCrypto PBKDF2 ���盐哈希后存储
            if (typeof body.ADMIN_PASSWORD === 'string' && body.ADMIN_PASSWORD.length > 0) {
                updatedConfig.ADMIN_PASSWORD = await hashPasswordPBKDF2(body.ADMIN_PASSWORD);
            }

            // 确保第三方 Token / JWT 密钥存在
            if (!updatedConfig.THIRD_PARTY_TOKEN || updatedConfig.THIRD_PARTY_TOKEN === 'your-secret-key') {
                updatedConfig.THIRD_PARTY_TOKEN = generateRandomSecret();
            }

            if (!updatedConfig.JWT_SECRET || updatedConfig.JWT_SECRET === 'your-secret-key') {
                updatedConfig.JWT_SECRET = generateRandomSecret();
            }

            await ctx.env.SUBSCRIPTIONS_KV.put('config', JSON.stringify(updatedConfig));

            // 清除配置缓存
            try {
                const { clearConfigCache } = await import('../utils/config');
                clearConfigCache();
            } catch (e) {
                console.error('Failed to clear config cache', e);
            }

            return jsonResponse({ success: true });
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                return errorResponse(error.issues[0].message, 400);
            }
            const message = error instanceof Error ? error.message : '未知错误';
            return errorResponse(message, 400);
        }
    }

    return errorResponse('Method not allowed', 405);
}

/**
 * 失败日志 API
 */
async function handleFailureLogs(ctx: ApiContext): Promise<Response> {
    try {
        const idxRaw = await ctx.env.SUBSCRIPTIONS_KV.get('reminder_failure_index');
        let idx: Array<{ key: string; id: number }> = [];
        if (idxRaw) {
            try {
                idx = JSON.parse(idxRaw) || [];
            } catch {
                // ignore parse error
            }
        }
        const limit = parseInt(ctx.url.searchParams.get('limit') || '50');
        const keys = idx.slice(-limit).reverse();
        const out: Array<{
            key: string;
            id: number;
            timestamp: string;
            title: string;
            failures: Array<{ channel: string; success: boolean }>;
            successes: Array<{ channel: string; success: boolean }>;
        }> = [];

        for (const item of keys) {
            const raw = await ctx.env.SUBSCRIPTIONS_KV.get(item.key);
            if (!raw) continue;
            try {
                const obj = JSON.parse(raw);
                out.push({ key: item.key, id: item.id, ...obj });
            } catch {
                // ignore parse error
            }
        }
        return jsonResponse(out);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : '未知错误';
        return errorResponse(message, 500);
    }
}

/**
 * 测试通知 API
 */
async function handleTestNotification(ctx: ApiContext): Promise<Response> {
    try {
        const json = await ctx.request.json();
        // 使用 Zod 验证
        const body = await TestNotificationSchema.parseAsync(json);
        // 掩码占位视为“未修改”，回退到已保存的凭据
        const bodyRec = body as Record<string, unknown>;
        for (const key of SECRET_CONFIG_KEYS) {
            if (bodyRec[key] === SECRET_MASK) bodyRec[key] = '';
        }

        let success = false;
        const tempConfig = { ...ctx.config };

        switch (body.type) {
            case 'telegram':
                tempConfig.telegram = {
                    botToken: body.TG_BOT_TOKEN || ctx.config.telegram?.botToken || '',
                    chatId: body.TG_CHAT_ID || ctx.config.telegram?.chatId || '',
                };
                success = await sendTelegramNotification(
                    '*测试通知*\n\n这是一条测试通知...',
                    tempConfig
                );
                break;

            case 'notifyx':
                tempConfig.notifyx = {
                    apiKey: body.NOTIFYX_API_KEY || ctx.config.notifyx?.apiKey || '',
                };
                success = await sendNotifyXNotification('测试通知', '## 测试通知...', '测试描述', tempConfig);
                break;

            case 'wenotify':
                tempConfig.wenotify = {
                    url: body.WENOTIFY_URL || ctx.config.wenotify?.url || '',
                    token: body.WENOTIFY_TOKEN || ctx.config.wenotify?.token || '',
                    userid: body.WENOTIFY_USERID || ctx.config.wenotify?.userid || '',
                    templateId: body.WENOTIFY_TEMPLATE_ID || ctx.config.wenotify?.templateId || '',
                };
                success = await sendWeNotifyEdgeNotification('测试通知', '测试通知...', tempConfig, true);
                break;

            case 'webhook':
                tempConfig.webhook = {
                    url: body.WEBHOOK_URL || ctx.config.webhook?.url || '',
                    method: body.WEBHOOK_METHOD || ctx.config.webhook?.method || 'POST',
                    headers: body.WEBHOOK_HEADERS || ctx.config.webhook?.headers || '',
                    template: body.WEBHOOK_TEMPLATE || ctx.config.webhook?.template || '',
                    payloadMode: body.WEBHOOK_PAYLOAD_MODE || ctx.config.webhook?.payloadMode || 'auto',
                };
                success = await sendWebhookNotification('测试通知', '测试通知...', tempConfig);
                break;

            case 'wechatbot':
                tempConfig.wechatBot = {
                    webhook: body.WECHATBOT_WEBHOOK || ctx.config.wechatBot?.webhook || '',
                    msgType: body.WECHATBOT_MSG_TYPE || ctx.config.wechatBot?.msgType || 'text',
                    atMobiles: body.WECHATBOT_AT_MOBILES || ctx.config.wechatBot?.atMobiles || '',
                    atAll: body.WECHATBOT_AT_ALL || ctx.config.wechatBot?.atAll || 'false',
                };
                success = await sendWechatBotNotification('测试通知', '测试通知...', tempConfig);
                break;

            case 'wechatOfficialAccount':
                tempConfig.wechatOfficialAccount = {
                    appId: body.WECHAT_OA_APPID || ctx.config.wechatOfficialAccount?.appId || '',
                    appSecret: body.WECHAT_OA_APPSECRET || ctx.config.wechatOfficialAccount?.appSecret || '',
                    templateId: body.WECHAT_OA_TEMPLATE_ID || ctx.config.wechatOfficialAccount?.templateId || '',
                    userIds: body.WECHAT_OA_USERIDS || ctx.config.wechatOfficialAccount?.userIds || '',
                };
                success = await sendWeChatOfficialAccountNotification(
                    '测试通知',
                    '这是一条测试通知',
                    tempConfig,
                    ctx.env
                );
                break;

            case 'email':
                tempConfig.email = {
                    resendApiKey: body.RESEND_API_KEY || ctx.config.email?.resendApiKey || '',
                    fromEmail: body.EMAIL_FROM || ctx.config.email?.fromEmail || '',
                    toEmail: body.EMAIL_TO || ctx.config.email?.toEmail || '',
                };
                success = await sendEmailNotification('测试通知', '测试通知...', tempConfig);
                break;

            case 'bark':
                tempConfig.bark = {
                    server: body.BARK_SERVER || ctx.config.bark?.server || '',
                    deviceKey: body.BARK_DEVICE_KEY || ctx.config.bark?.deviceKey || '',
                    isArchive: body.BARK_IS_ARCHIVE || ctx.config.bark?.isArchive || 'false',
                };
                success = await sendBarkNotification('测试通知', '测试通知...', tempConfig);
                break;
        }

        return jsonResponse({
            success,
            message: success ? '发送成功' : '发送失败',
        });
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            return errorResponse(error.issues[0].message, 400);
        }
        const message = error instanceof Error ? error.message : '未知错误';
        return jsonResponse({ success: false, message }, 200);
    }
}

/**
 * 导出/备份所有订阅（下载 JSON）
 */
async function handleExport(ctx: ApiContext): Promise<Response> {
    const service = new SubscriptionService(ctx.env);
    const subscriptions = await service.getAllSubscriptions();
    const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        count: subscriptions.length,
        subscriptions,
    };
    const date = new Date().toISOString().slice(0, 10);
    return jsonResponse(payload, 200, {
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="subscriptions-backup-${date}.json"`,
    });
}

/**
 * 订阅列表 API
 */
async function handleSubscriptionsApi(ctx: ApiContext): Promise<Response> {
    const subscriptionService = new SubscriptionService(ctx.env);

    if (ctx.method === 'GET') {
        const subscriptions = await subscriptionService.getAllSubscriptions();
        return jsonResponse(subscriptions);
    }

    if (ctx.method === 'POST') {
        try {
            const json = await ctx.request.json();
            const sub = await SubscriptionSchema.parseAsync(json);
            const result = await subscriptionService.createSubscription(sub);
            return jsonResponse(result, result.success ? 201 : 400);
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                return errorResponse(error.issues[0].message, 400);
            }
            return errorResponse('Invalid request', 400);
        }
    }

    return errorResponse('Method not allowed', 405);
}

/**
 * 单个订阅 API
 */
async function handleSubscriptionByIdApi(ctx: ApiContext): Promise<Response> {
    const subscriptionService = new SubscriptionService(ctx.env);
    const parts = ctx.path.split('/');
    const id = parts[2];

    // 测试通知
    if (parts[3] === 'test-notify' && ctx.method === 'POST') {
        try {
            const sub = await subscriptionService.getSubscription(id);
            if (!sub) {
                return errorResponse('Subscription not found', 404);
            }

            const now = new Date();
            const expiry = new Date(sub.expiryDate);
            sub.daysRemaining = dayDiffInTimezone(expiry, now, ctx.config.timezone || 'UTC');

            const content = formatNotificationContent([sub], ctx.config);
            await sendNotificationToAllChannels('订阅提醒测试', content, ctx.config, ctx.env, '[手动测试]', [
                sub,
            ]);
            return jsonResponse({ success: true, message: '已发送' });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : '未知错误';
            return errorResponse(message, 500);
        }
    }

    if (ctx.method === 'GET') {
        const sub = await subscriptionService.getSubscription(id);
        return jsonResponse(sub);
    }

    if (ctx.method === 'PUT') {
        try {
            const json = await ctx.request.json();
            const sub = await SubscriptionUpdateSchema.parseAsync(json);
            const result = await subscriptionService.updateSubscription(id, sub);
            return jsonResponse(result, result.success ? 200 : 400);
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                return errorResponse(error.issues[0].message, 400);
            }
            return errorResponse('Invalid request', 400);
        }
    }

    if (ctx.method === 'DELETE') {
        const result = await subscriptionService.deleteSubscription(id);
        return jsonResponse(result, result.success ? 200 : 400);
    }

    return errorResponse('Method not allowed', 405);
}
