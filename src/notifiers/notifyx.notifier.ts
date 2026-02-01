import { BaseNotifier } from './base';
import type { Config, NotificationMessage, NotificationResult } from '../types';
import { requestWithRetry } from '../utils/http';

/**
 * NotifyX推送渠道
 */
export class NotifyXNotifier extends BaseNotifier {
  readonly name = 'notifyx';

  isConfigured(config: Config): boolean {
    return !!config.notifyx?.apiKey;
  }

  async send(
    message: NotificationMessage,
    config: Config
  ): Promise<NotificationResult> {
    try {
      if (!config.notifyx?.apiKey) {
        return this.createErrorResult('NotifyX配置不完整');
      }

      const content = message.subscriptions
        ? this.formatSubscriptions(message.subscriptions, config)
        : message.content;

      const response = await requestWithRetry(
        `https://www.notifyx.cn/api/v1/send/${config.notifyx.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: message.title,
            content: `## ${message.title}\n\n${content}`,
            description: '订阅提醒',
          }),
        },
        2,
        8000
      );

      const result = await response.json();

      if (result.status === 'queued') {
        return this.createSuccessResult(result);
      } else {
        return this.createErrorResult(result.message || '发送失败');
      }
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : '未知错误'
      );
    }
  }
}
