/// <reference types="@cloudflare/workers-types" />
import { z } from 'zod';

// 基础类型定义
export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  customType: z.string().max(50).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodValue: z.number().int().min(1).optional(),
  periodUnit: z.enum(['day', 'month', 'year']).optional(),
  price: z.number().min(0).optional(),
  reminderDays: z.number().int().min(0).max(365).default(7),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  autoRenew: z.boolean().default(false),
  useLunar: z.boolean().default(false),
  dailyReminderTimes: z.array(z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

// 通知渠道配置
export const TelegramConfigSchema = z.object({
  botToken: z.string().min(1),
  chatId: z.string().min(1),
});

export const EmailConfigSchema = z.object({
  resendApiKey: z.string().min(1),
  fromEmail: z.string().email(),
  fromName: z.string().optional(),
  toEmail: z.string().email(),
});

export const WeChatBotConfigSchema = z.object({
  webhook: z.string().url(),
  msgType: z.enum(['text', 'markdown']).default('text'),
  atMobiles: z.string().optional(),
  atAll: z.boolean().default(false),
});

export const WeChatOAConfigSchema = z.object({
  appId: z.string().min(1),
  appSecret: z.string().min(1),
  templateId: z.string().min(1),
  userIds: z.string().min(1),
});

export const BarkConfigSchema = z.object({
  deviceKey: z.string().min(1),
  server: z.string().url().default('https://api.day.app'),
  isArchive: z.boolean().default(false),
});

export const NotifyXConfigSchema = z.object({
  apiKey: z.string().min(1),
});

export const WeNotifyConfigSchema = z.object({
  url: z.string().url(),
  token: z.string().min(1),
  userid: z.string().optional(),
  templateId: z.string().optional(),
  path: z.string().default('/wxsend'),
});

export const WebhookConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT']).default('POST'),
  headers: z.string().optional(),
  template: z.string().optional(),
});

// 系统配置
export const ConfigSchema = z.object({
  adminUsername: z.string().min(1).default('admin'),
  adminPassword: z.string().min(6),
  jwtSecret: z.string().min(32),
  timezone: z.string().default('Asia/Shanghai'),
  showLunarGlobal: z.boolean().default(true),
  reminderTimes: z.array(z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)).default(['08:00']),
  enabledNotifiers: z.array(z.enum([
    'telegram', 'email', 'wechatBot', 'wechatOfficialAccount',
    'bark', 'notifyx', 'wenotify', 'webhook'
  ])).default(['notifyx']),
  
  telegram: TelegramConfigSchema.optional(),
  email: EmailConfigSchema.optional(),
  wechatBot: WeChatBotConfigSchema.optional(),
  wechatOfficialAccount: WeChatOAConfigSchema.optional(),
  bark: BarkConfigSchema.optional(),
  notifyx: NotifyXConfigSchema.optional(),
  wenotify: WeNotifyConfigSchema.optional(),
  webhook: WebhookConfigSchema.optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

// 环境变量类型
export interface Env {
  SUBSCRIPTIONS_KV: KVNamespace;
}

// 通知消息类型
export interface NotificationMessage {
  title: string;
  content: string;
  subscriptions?: Subscription[];
  metadata?: Record<string, any>;
}

// 通知结果类型
export interface NotificationResult {
  channel: string;
  success: boolean;
  error?: string;
  response?: any;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// 失败日志类型
export interface FailureLog {
  id: string;
  timestamp: string;
  title: string;
  failures: NotificationResult[];
  successes: NotificationResult[];
}
