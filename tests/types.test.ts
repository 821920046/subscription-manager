import { describe, it, expect } from 'vitest';
import {
  SubscriptionSchema,
  TelegramConfigSchema,
  EmailConfigSchema,
  WeChatBotConfigSchema,
  WeChatOAConfigSchema,
  BarkConfigSchema,
  NotifyXConfigSchema,
  WeNotifyConfigSchema,
  WebhookConfigSchema,
  ConfigSchema,
} from '../src/types';

describe('SubscriptionSchema', () => {
  it('should validate a valid subscription', () => {
    const validSubscription = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Netflix',
      startDate: '2024-01-01',
      expiryDate: '2024-12-31',
      periodValue: 1,
      periodUnit: 'month',
      price: 99.99,
      reminderDays: 7,
      notes: 'Monthly subscription',
      isActive: true,
      autoRenew: false,
      useLunar: false,
      dailyReminderTimes: ['08:00', '20:00'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const result = SubscriptionSchema.safeParse(validSubscription);
    expect(result.success).toBe(true);
  });

  it('should reject subscription with invalid UUID', () => {
    const invalidSubscription = {
      id: 'invalid-uuid',
      name: 'Netflix',
      startDate: '2024-01-01',
      expiryDate: '2024-12-31',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const result = SubscriptionSchema.safeParse(invalidSubscription);
    expect(result.success).toBe(false);
  });

  it('should reject subscription with empty name', () => {
    const invalidSubscription = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: '',
      startDate: '2024-01-01',
      expiryDate: '2024-12-31',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const result = SubscriptionSchema.safeParse(invalidSubscription);
    expect(result.success).toBe(false);
  });

  it('should reject subscription with invalid date format', () => {
    const invalidSubscription = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Netflix',
      startDate: '01-01-2024',
      expiryDate: '2024-12-31',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const result = SubscriptionSchema.safeParse(invalidSubscription);
    expect(result.success).toBe(false);
  });

  it('should reject subscription with negative price', () => {
    const invalidSubscription = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Netflix',
      startDate: '2024-01-01',
      expiryDate: '2024-12-31',
      price: -10,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const result = SubscriptionSchema.safeParse(invalidSubscription);
    expect(result.success).toBe(false);
  });

  it('should reject subscription with invalid period unit', () => {
    const invalidSubscription = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Netflix',
      startDate: '2024-01-01',
      expiryDate: '2024-12-31',
      periodUnit: 'week',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const result = SubscriptionSchema.safeParse(invalidSubscription);
    expect(result.success).toBe(false);
  });

  it('should accept subscription with optional fields omitted', () => {
    const minimalSubscription = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Netflix',
      startDate: '2024-01-01',
      expiryDate: '2024-12-31',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const result = SubscriptionSchema.safeParse(minimalSubscription);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
      expect(result.data.reminderDays).toBe(7);
      expect(result.data.autoRenew).toBe(false);
      expect(result.data.useLunar).toBe(false);
    }
  });
});

describe('TelegramConfigSchema', () => {
  it('should validate valid telegram config', () => {
    const config = {
      botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      chatId: '123456789',
    };

    const result = TelegramConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject config with empty botToken', () => {
    const config = {
      botToken: '',
      chatId: '123456789',
    };

    const result = TelegramConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('EmailConfigSchema', () => {
  it('should validate valid email config', () => {
    const config = {
      resendApiKey: 're_123456789',
      fromEmail: 'sender@example.com',
      fromName: 'Subscription Manager',
      toEmail: 'recipient@example.com',
    };

    const result = EmailConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject config with invalid email', () => {
    const config = {
      resendApiKey: 're_123456789',
      fromEmail: 'invalid-email',
      toEmail: 'recipient@example.com',
    };

    const result = EmailConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('WeChatBotConfigSchema', () => {
  it('should validate valid wechat bot config', () => {
    const config = {
      webhook: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=123',
      msgType: 'markdown',
      atMobiles: '13800138000',
      atAll: false,
    };

    const result = WeChatBotConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should use default values for optional fields', () => {
    const config = {
      webhook: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=123',
    };

    const result = WeChatBotConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.msgType).toBe('text');
      expect(result.data.atAll).toBe(false);
    }
  });
});

describe('BarkConfigSchema', () => {
  it('should validate valid bark config', () => {
    const config = {
      deviceKey: 'abc123def456',
      server: 'https://api.day.app',
      isArchive: true,
    };

    const result = BarkConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should use default server URL', () => {
    const config = {
      deviceKey: 'abc123def456',
    };

    const result = BarkConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.server).toBe('https://api.day.app');
      expect(result.data.isArchive).toBe(false);
    }
  });
});

describe('ConfigSchema', () => {
  it('should validate valid system config', () => {
    const config = {
      adminUsername: 'admin',
      adminPassword: 'securepassword123',
      jwtSecret: 'a'.repeat(32),
      timezone: 'Asia/Shanghai',
      showLunarGlobal: true,
      reminderTimes: ['08:00', '20:00'],
      enabledNotifiers: ['telegram', 'email'],
      telegram: {
        botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        chatId: '123456789',
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject config with short password', () => {
    const config = {
      adminPassword: 'short',
      jwtSecret: 'a'.repeat(32),
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject config with short jwtSecret', () => {
    const config = {
      adminPassword: 'securepassword123',
      jwtSecret: 'short',
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should use default values for optional fields', () => {
    const config = {
      adminPassword: 'securepassword123',
      jwtSecret: 'a'.repeat(32),
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.adminUsername).toBe('admin');
      expect(result.data.timezone).toBe('Asia/Shanghai');
      expect(result.data.showLunarGlobal).toBe(true);
      expect(result.data.reminderTimes).toEqual(['08:00']);
      expect(result.data.enabledNotifiers).toEqual(['notifyx']);
    }
  });

  it('should reject invalid notifier type', () => {
    const config = {
      adminPassword: 'securepassword123',
      jwtSecret: 'a'.repeat(32),
      enabledNotifiers: ['invalidNotifier'],
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should validate all supported notifier types', () => {
    const config = {
      adminPassword: 'securepassword123',
      jwtSecret: 'a'.repeat(32),
      enabledNotifiers: [
        'telegram',
        'email',
        'wechatBot',
        'wechatOfficialAccount',
        'bark',
        'notifyx',
        'wenotify',
        'webhook',
      ],
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});

describe('WebhookConfigSchema', () => {
  it('should validate valid webhook config', () => {
    const config = {
      url: 'https://example.com/webhook',
      method: 'POST',
      headers: '{"Authorization": "Bearer token"}',
      template: '{"message": "{{content}}"}',
    };

    const result = WebhookConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should use default method', () => {
    const config = {
      url: 'https://example.com/webhook',
    };

    const result = WebhookConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.method).toBe('POST');
    }
  });

  it('should reject invalid HTTP method', () => {
    const config = {
      url: 'https://example.com/webhook',
      method: 'DELETE',
    };

    const result = WebhookConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
