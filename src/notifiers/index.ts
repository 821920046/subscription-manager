// 通知器管理器 - 管理所有通知渠道

import type { NotificationMessage, NotificationResult, Config } from '../types';
import { NotificationService, createNotificationService } from '../services/notification';

// 通知器接口
interface Notifier {
  name: string;
  send(message: NotificationMessage): Promise<NotificationResult>;
}

// Telegram 通知器
class TelegramNotifier implements Notifier {
  name = 'telegram';
  private botToken: string;
  private chatId: string;

  constructor(config: { botToken: string; chatId: string }) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: `${message.title}\n\n${message.content}`,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      return { channel: this.name, success: true };
    } catch (error) {
      return {
        channel: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Email 通知器 (使用 Resend)
class EmailNotifier implements Notifier {
  name = 'email';
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private toEmail: string;

  constructor(config: { apiKey: string; fromEmail: string; fromName?: string; toEmail: string }) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName || 'Subscription Manager';
    this.toEmail = config.toEmail;
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: this.toEmail,
          subject: message.title,
          html: `<p>${message.content.replace(/\n/g, '<br>')}</p>`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Resend API error: ${response.status}`);
      }

      return { channel: this.name, success: true };
    } catch (error) {
      return {
        channel: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 企业微信机器人通知器
class WeChatBotNotifier implements Notifier {
  name = 'wechatBot';
  private webhook: string;
  private msgType: 'text' | 'markdown';
  private atMobiles?: string;
  private atAll: boolean;

  constructor(config: {
    webhook: string;
    msgType?: 'text' | 'markdown';
    atMobiles?: string;
    atAll?: boolean;
  }) {
    this.webhook = config.webhook;
    this.msgType = config.msgType || 'text';
    this.atMobiles = config.atMobiles;
    this.atAll = config.atAll || false;
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      const body: Record<string, any> = {
        msgtype: this.msgType,
      };

      if (this.msgType === 'markdown') {
        body.markdown = {
          content: `**${message.title}**\n\n${message.content}`,
        };
      } else {
        body.text = {
          content: `${message.title}\n\n${message.content}`,
          mentioned_mobile_list: this.atMobiles?.split(',') || [],
        };
      }

      if (this.atAll) {
        body.at = { isAtAll: true };
      }

      const response = await fetch(this.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`WeChat Bot API error: ${response.status}`);
      }

      return { channel: this.name, success: true };
    } catch (error) {
      return {
        channel: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Bark 通知器
class BarkNotifier implements Notifier {
  name = 'bark';
  private deviceKey: string;
  private server: string;
  private isArchive: boolean;

  constructor(config: { deviceKey: string; server?: string; isArchive?: boolean }) {
    this.deviceKey = config.deviceKey;
    this.server = config.server || 'https://api.day.app';
    this.isArchive = config.isArchive || false;
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      const url = `${this.server}/push`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_key: this.deviceKey,
          title: message.title,
          body: message.content,
          isArchive: this.isArchive ? 1 : 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`Bark API error: ${response.status}`);
      }

      return { channel: this.name, success: true };
    } catch (error) {
      return {
        channel: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Webhook 通知器
class WebhookNotifier implements Notifier {
  name = 'webhook';
  private url: string;
  private method: 'GET' | 'POST' | 'PUT';
  private headers?: Record<string, string>;
  private template?: string;

  constructor(config: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT';
    headers?: string;
    template?: string;
  }) {
    this.url = config.url;
    this.method = config.method || 'POST';
    this.headers = config.headers ? JSON.parse(config.headers) : undefined;
    this.template = config.template;
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      let body: string | undefined;

      if (this.template) {
        // 使用模板渲染
        body = this.template
          .replace('{{title}}', message.title)
          .replace('{{content}}', message.content);
      } else {
        body = JSON.stringify({
          title: message.title,
          content: message.content,
          timestamp: new Date().toISOString(),
        });
      }

      const response = await fetch(this.url, {
        method: this.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: this.method === 'GET' ? undefined : body,
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      return { channel: this.name, success: true };
    } catch (error) {
      return {
        channel: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 创建通知服务并注册所有通知器
export function createNotificationServiceWithNotifiers(
  config: Config
): NotificationService {
  const service = createNotificationService({
    timeout: 10000,
    retries: 3,
    retryDelay: 1000,
  });

  // 注册 Telegram
  if (config.telegram) {
    service.registerNotifier(
      new TelegramNotifier({
        botToken: config.telegram.botToken,
        chatId: config.telegram.chatId,
      })
    );
  }

  // 注册 Email
  if (config.email) {
    service.registerNotifier(
      new EmailNotifier({
        apiKey: config.email.resendApiKey,
        fromEmail: config.email.fromEmail,
        fromName: config.email.fromName,
        toEmail: config.email.toEmail,
      })
    );
  }

  // 注册企业微信机器人
  if (config.wechatBot) {
    service.registerNotifier(
      new WeChatBotNotifier({
        webhook: config.wechatBot.webhook,
        msgType: config.wechatBot.msgType,
        atMobiles: config.wechatBot.atMobiles,
        atAll: config.wechatBot.atAll,
      })
    );
  }

  // 注册 Bark
  if (config.bark) {
    service.registerNotifier(
      new BarkNotifier({
        deviceKey: config.bark.deviceKey,
        server: config.bark.server,
        isArchive: config.bark.isArchive,
      })
    );
  }

  // 注册 Webhook
  if (config.webhook) {
    service.registerNotifier(
      new WebhookNotifier({
        url: config.webhook.url,
        method: config.webhook.method,
        headers: config.webhook.headers,
        template: config.webhook.template,
      })
    );
  }

  return service;
}

export type { Notifier };
