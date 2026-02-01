import { Hono } from 'hono';
import type { Env } from '../types';
import { ConfigService } from '../services/config.service';
import { notificationManager } from '../notifiers';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const app = new Hono<{ Bindings: Env }>();

/**
 * 测试通知渠道
 * POST /api/notify/test
 */
app.post('/test', async (c) => {
  try {
    const { type, ...testConfig } = await c.req.json();
    const configService = new ConfigService(c.env);
    const config = await configService.getConfig();
    
    // 创建临时配置用于测试
    const tempConfig = { ...config };
    
    // 根据类型更新配置
    switch (type) {
      case 'telegram':
        tempConfig.telegram = {
          botToken: testConfig.TG_BOT_TOKEN || config.telegram?.botToken || '',
          chatId: testConfig.TG_CHAT_ID || config.telegram?.chatId || '',
        };
        break;
      case 'email':
        tempConfig.email = {
          resendApiKey: testConfig.RESEND_API_KEY || config.email?.resendApiKey || '',
          fromEmail: testConfig.EMAIL_FROM || config.email?.fromEmail || '',
          toEmail: testConfig.EMAIL_TO || config.email?.toEmail || '',
        };
        break;
      case 'wechatBot':
        tempConfig.wechatBot = {
          webhook: testConfig.WECHATBOT_WEBHOOK || config.wechatBot?.webhook || '',
          msgType: testConfig.WECHATBOT_MSG_TYPE || config.wechatBot?.msgType || 'text',
          atAll: testConfig.WECHATBOT_AT_ALL === 'true' || config.wechatBot?.atAll || false,
        };
        break;
      case 'wechatOfficialAccount':
        tempConfig.wechatOfficialAccount = {
          appId: testConfig.WECHAT_OA_APPID || config.wechatOfficialAccount?.appId || '',
          appSecret: testConfig.WECHAT_OA_APPSECRET || config.wechatOfficialAccount?.appSecret || '',
          templateId: testConfig.WECHAT_OA_TEMPLATE_ID || config.wechatOfficialAccount?.templateId || '',
          userIds: testConfig.WECHAT_OA_USERIDS || config.wechatOfficialAccount?.userIds || '',
        };
        break;
      case 'bark':
        tempConfig.bark = {
          deviceKey: testConfig.BARK_DEVICE_KEY || config.bark?.deviceKey || '',
          server: testConfig.BARK_SERVER || config.bark?.server || 'https://api.day.app',
        };
        break;
      case 'notifyx':
        tempConfig.notifyx = {
          apiKey: testConfig.NOTIFYX_API_KEY || config.notifyx?.apiKey || '',
        };
        break;
      case 'wenotify':
        tempConfig.wenotify = {
          url: testConfig.WENOTIFY_URL || config.wenotify?.url || '',
          token: testConfig.WENOTIFY_TOKEN || config.wenotify?.token || '',
        };
        break;
      case 'webhook':
        tempConfig.webhook = {
          url: testConfig.WEBHOOK_URL || config.webhook?.url || '',
          method: testConfig.WEBHOOK_METHOD || config.webhook?.method || 'POST',
        };
        break;
      default:
        return c.json(
          {
            success: false,
            error: {
              code: 'INVALID_TYPE',
              message: '未知的通知类型',
            },
          },
          400
        );
    }
    
    // 设置env
    notificationManager.setEnv(c.env);
    
    // 发送测试通知
    const result = await notificationManager.sendToChannel(
      type,
      {
        title: '测试通知',
        content: '这是一条测试通知消息',
      },
      tempConfig
    );
    
    return c.json({
      success: result.success,
      data: result,
      message: result.success ? '测试通知发送成功' : result.error,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: error instanceof Error ? error.message : '测试通知失败',
        },
      },
      500
    );
  }
});

/**
 * 第三方API通知
 * POST /api/notify/third-party
 */
app.post('/third-party', rateLimitMiddleware(20, 60), async (c) => {
  try {
    // 验证token
    const tokenHeader = c.req.header('X-Notify-Token') || '';
    const tokenQuery = c.req.query('token') || '';
    const providedToken = tokenHeader || tokenQuery;
    
    const configService = new ConfigService(c.env);
    const config = await configService.getConfig();
    
    if (!providedToken || providedToken !== config.jwtSecret) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权',
          },
        },
        403
      );
    }
    
    const { title, content } = await c.req.json();
    
    if (!content) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: '缺少content参数',
          },
        },
        400
      );
    }
    
    // 设置env
    notificationManager.setEnv(c.env);
    
    // 发送通知
    const results = await notificationManager.sendToAllChannels(
      {
        title: title || '第三方通知',
        content,
      },
      config,
      '[第三方API]'
    );
    
    const success = results.some((r) => r.success);
    
    return c.json({
      success,
      data: results,
      message: success ? '通知已发送' : '所有渠道发送失败',
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOTIFY_ERROR',
          message: error instanceof Error ? error.message : '发送通知失败',
        },
      },
      500
    );
  }
});

export const notifyRoutes = app;
