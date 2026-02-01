import { BaseNotifier } from './base';
import type { Config, NotificationMessage, NotificationResult } from '../types';
import { requestWithRetry } from '../utils/http';

/**
 * Bark推送渠道（iOS推送）
 */
export class BarkNotifier extends BaseNotifier {
  readonly name = 'bark';

  isConfigured(config: Config): boolean {
    return !!config.bark?.deviceKey;
  }

  async send(
    message: NotificationMessage,
    config: Config
  ): Promise<NotificationResult> {
    try {
      if (!config.bark?.deviceKey) {
        return this.createErrorResult('Bark配置不完整');
      }

      const serverUrl = config.bark.server || 'https://api.day.app';
      const content = message.subscriptions
        ? this.formatSubscriptions(message.subscriptions, config)
        : message.content;

      const payload: any = {
        title: message.title,
        body: content,
        device_key: config.bark.deviceKey,
      };

      if (config.bark.isArchive) {
        payload.isArchive = 1;
      }

      const response = await requestWithRetry(
        `${serverUrl}/push`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify(payload),
        },
        2,
        8000
      );

      const result = await response.json();

      if (result.code === 200) {
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
