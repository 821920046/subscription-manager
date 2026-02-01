// 通知服务 - 并行化多渠道通知发送

import type { NotificationMessage, NotificationResult } from '../types';

// 通知渠道接口
interface Notifier {
  name: string;
  send(message: NotificationMessage): Promise<NotificationResult>;
}

// 通知配置
interface NotificationConfig {
  timeout?: number; // 单个渠道超时时间（毫秒）
  retries?: number; // 重试次数
  retryDelay?: number; // 初始重试延迟（毫秒）
}

// 通知服务类
export class NotificationService {
  private notifiers: Map<string, Notifier> = new Map();
  private config: Required<NotificationConfig>;

  constructor(config: NotificationConfig = {}) {
    this.config = {
      timeout: config.timeout || 10000, // 默认10秒超时
      retries: config.retries || 3, // 默认3次重试
      retryDelay: config.retryDelay || 1000, // 默认1秒初始延迟
    };
  }

  // 注册通知器
  registerNotifier(notifier: Notifier): void {
    this.notifiers.set(notifier.name, notifier);
  }

  // 并行发送通知到所有渠道
  async sendToAll(message: NotificationMessage, enabledChannels: string[]): Promise<NotificationResult[]> {
    // 过滤启用的渠道
    const enabledNotifiers = enabledChannels
      .map((channel) => this.notifiers.get(channel))
      .filter((notifier): notifier is Notifier => notifier !== undefined);

    if (enabledNotifiers.length === 0) {
      return [];
    }

    // 并行发送，使用 Promise.allSettled 确保所有渠道都尝试
    const results = await Promise.allSettled(
      enabledNotifiers.map((notifier) => this.sendWithTimeoutAndRetry(notifier, message))
    );

    // 整理结果
    return results.map((result, index) => {
      const channel = enabledNotifiers[index].name;
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          channel,
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });
  }

  // 带超时和重试的发送
  private async sendWithTimeoutAndRetry(
    notifier: Notifier,
    message: NotificationMessage
  ): Promise<NotificationResult> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        // 使用 Promise.race 实现超时控制
        const result = await Promise.race([
          notifier.send(message),
          this.createTimeoutPromise(notifier.name),
        ]);

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 最后一次尝试，不再重试
        if (attempt === this.config.retries - 1) {
          break;
        }

        // 指数退避延迟
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    return {
      channel: notifier.name,
      success: false,
      error: lastError?.message || 'Max retries exceeded',
    };
  }

  // 创建超时 Promise
  private createTimeoutPromise(channel: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });
  }

  // 睡眠函数
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 获取已注册的通知器列表
  getRegisteredChannels(): string[] {
    return Array.from(this.notifiers.keys());
  }
}

// 创建通知服务实例的工厂函数
export function createNotificationService(config?: NotificationConfig): NotificationService {
  return new NotificationService(config);
}

// 批量发送通知（用于定时任务）
export async function batchSendNotifications(
  service: NotificationService,
  messages: NotificationMessage[],
  enabledChannels: string[],
  batchSize: number = 5
): Promise<NotificationResult[][]> {
  const results: NotificationResult[][] = [];

  // 分批处理，避免一次性发送太多
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((message) => service.sendToAll(message, enabledChannels))
    );
    results.push(...batchResults);

    // 批次间延迟，避免 rate limit
    if (i + batchSize < messages.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}
