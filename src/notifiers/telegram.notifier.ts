import { BaseNotifier } from './base';
import type { Config, NotificationMessage, NotificationResult } from '../types';
import { requestWithRetry } from '../utils/http';

/**
 * Telegram推送渠道
 */
export class TelegramNotifier extends BaseNotifier {
  readonly name = 'telegram';

  isConfigured(config: Config): boolean {
    return !!(
      config.telegram?.botToken &&
      config.telegram?.chatId
    );
  }

  async send(
    message: NotificationMessage,
    config: Config
  ): Promise<NotificationResult> {
    try {
      if (!config.telegram?.botToken || !config.telegram?.chatId) {
        return this.createErrorResult('Telegram配置不完整');
      }

      const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;

      const content = message.subscriptions
        ? this.formatSubscriptions(message.subscriptions, config)
        : message.content;

      const response = await requestWithRetry(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: config.telegram.chatId,
            text: `*${message.title}*\n\n${content}`,
            parse_mode: 'Markdown',
          }),
        },
        2,
        8000
      );

      const result = await response.json();

      if (result.ok) {
        return this.createSuccessResult(result);
      } else {
        return this.createErrorResult(result.description || '发送失败');
      }
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : '未知错误'
      );
    }
  }
}
