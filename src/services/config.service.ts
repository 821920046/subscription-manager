import type { Env, Config } from '../types';
import { safeJSONParse } from '../utils/http';
import { generateRandomSecret } from '../utils/crypto';

/**
 * 配置服务
 * 管理系统配置的读取和更新
 */
export class ConfigService {
  private env: Env;
  private static readonly CONFIG_KEY = 'config';
  private static readonly FAILURE_LOG_INDEX_KEY = 'reminder_failure_index';

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * 获取原始配置
   */
  async getRawConfig(): Promise<Record<string, any>> {
    const configStr = await this.env.SUBSCRIPTIONS_KV.get(ConfigService.CONFIG_KEY);
    if (!configStr) {
      // 返回默认配置
      return this.getDefaultConfig();
    }
    return safeJSONParse(configStr, this.getDefaultConfig());
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<Config> {
    const rawConfig = await this.getRawConfig();
    
    // 转换为Config类型
    return {
      adminUsername: rawConfig.ADMIN_USERNAME || 'admin',
      adminPassword: rawConfig.ADMIN_PASSWORD || 'password',
      jwtSecret: rawConfig.JWT_SECRET || generateRandomSecret(),
      timezone: rawConfig.TIMEZONE || 'Asia/Shanghai',
      showLunarGlobal: rawConfig.SHOW_LUNAR === true,
      reminderTimes: this.parseReminderTimes(rawConfig.REMINDER_TIMES),
      enabledNotifiers: rawConfig.ENABLED_NOTIFIERS || ['notifyx'],
      
      // Telegram
      telegram: rawConfig.TG_BOT_TOKEN ? {
        botToken: rawConfig.TG_BOT_TOKEN,
        chatId: rawConfig.TG_CHAT_ID || '',
      } : undefined,
      
      // Email
      email: rawConfig.RESEND_API_KEY ? {
        resendApiKey: rawConfig.RESEND_API_KEY,
        fromEmail: rawConfig.EMAIL_FROM || '',
        fromName: rawConfig.EMAIL_FROM_NAME,
        toEmail: rawConfig.EMAIL_TO || '',
      } : undefined,
      
      // WeChat Bot
      wechatBot: rawConfig.WECHATBOT_WEBHOOK ? {
        webhook: rawConfig.WECHATBOT_WEBHOOK,
        msgType: rawConfig.WECHATBOT_MSG_TYPE || 'text',
        atMobiles: rawConfig.WECHATBOT_AT_MOBILES,
        atAll: rawConfig.WECHATBOT_AT_ALL === 'true',
      } : undefined,
      
      // WeChat Official Account
      wechatOfficialAccount: rawConfig.WECHAT_OA_APPID ? {
        appId: rawConfig.WECHAT_OA_APPID,
        appSecret: rawConfig.WECHAT_OA_APPSECRET || '',
        templateId: rawConfig.WECHAT_OA_TEMPLATE_ID || '',
        userIds: rawConfig.WECHAT_OA_USERIDS || '',
      } : undefined,
      
      // Bark
      bark: rawConfig.BARK_DEVICE_KEY ? {
        deviceKey: rawConfig.BARK_DEVICE_KEY,
        server: rawConfig.BARK_SERVER || 'https://api.day.app',
        isArchive: rawConfig.BARK_IS_ARCHIVE === 'true',
      } : undefined,
      
      // NotifyX
      notifyx: rawConfig.NOTIFYX_API_KEY ? {
        apiKey: rawConfig.NOTIFYX_API_KEY,
      } : undefined,
      
      // WeNotify
      wenotify: rawConfig.WENOTIFY_URL ? {
        url: rawConfig.WENOTIFY_URL,
        token: rawConfig.WENOTIFY_TOKEN || '',
        userid: rawConfig.WENOTIFY_USERID,
        templateId: rawConfig.WENOTIFY_TEMPLATE_ID,
        path: rawConfig.WENOTIFY_PATH || '/wxsend',
      } : undefined,
      
      // Webhook
      webhook: rawConfig.WEBHOOK_URL ? {
        url: rawConfig.WEBHOOK_URL,
        method: rawConfig.WEBHOOK_METHOD || 'POST',
        headers: rawConfig.WEBHOOK_HEADERS,
        template: rawConfig.WEBHOOK_TEMPLATE,
      } : undefined,
    };
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Record<string, any>): Promise<void> {
    const currentConfig = await this.getRawConfig();
    const newConfig = { ...currentConfig, ...config };
    await this.env.SUBSCRIPTIONS_KV.put(
      ConfigService.CONFIG_KEY,
      JSON.stringify(newConfig)
    );
  }

  /**
   * 获取失败日志
   */
  async getFailureLogs(limit: number = 50): Promise<any[]> {
    const indexStr = await this.env.SUBSCRIPTIONS_KV.get(
      ConfigService.FAILURE_LOG_INDEX_KEY
    );
    const index = safeJSONParse(indexStr, []);
    
    const logs: any[] = [];
    const keys = index.slice(-limit).reverse();
    
    for (const item of keys) {
      const logStr = await this.env.SUBSCRIPTIONS_KV.get(item.key);
      if (logStr) {
        try {
          const log = JSON.parse(logStr);
          logs.push({ key: item.key, id: item.id, ...log });
        } catch {
          // 忽略解析错误的日志
        }
      }
    }
    
    return logs;
  }

  /**
   * 记录失败日志
   */
  async logFailure(
    title: string,
    failures: any[],
    successes: any[]
  ): Promise<void> {
    const id = Date.now();
    const key = `reminder_failure_${id}`;
    
    const payload = {
      timestamp: new Date().toISOString(),
      title,
      failures,
      successes,
    };
    
    await this.env.SUBSCRIPTIONS_KV.put(key, JSON.stringify(payload));
    
    // 更新索引
    const indexStr = await this.env.SUBSCRIPTIONS_KV.get(
      ConfigService.FAILURE_LOG_INDEX_KEY
    );
    const index = safeJSONParse(indexStr, []);
    index.push({ key, id });
    
    // 只保留最近100条
    const trimmedIndex = index.slice(-100);
    await this.env.SUBSCRIPTIONS_KV.put(
      ConfigService.FAILURE_LOG_INDEX_KEY,
      JSON.stringify(trimmedIndex)
    );
  }

  private getDefaultConfig(): Record<string, any> {
    return {
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: 'password',
      JWT_SECRET: generateRandomSecret(),
      TIMEZONE: 'Asia/Shanghai',
      SHOW_LUNAR: true,
      REMINDER_TIMES: '08:00',
      ENABLED_NOTIFIERS: ['notifyx'],
    };
  }

  private parseReminderTimes(timesStr?: string): string[] {
    if (!timesStr) return ['08:00'];
    
    return timesStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t));
  }
}
