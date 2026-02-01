import { BaseNotifier } from './base';
import type { Config, NotificationMessage, NotificationResult } from '../types';
import { requestWithRetry } from '../utils/http';

/**
 * WeNotify Edge推送渠道
 */
export class WeNotifyNotifier extends BaseNotifier {
  readonly name = 'wenotify';

  isConfigured(config: Config): boolean {
    return !!(config.wenotify?.url && config.wenotify?.token);
  }

  async send(
    message: NotificationMessage,
    config: Config
  ): Promise<NotificationResult> {
    try {
      if (!config.wenotify?.url || !config.wenotify?.token) {
        return this.createErrorResult('WeNotify配置不完整');
      }

      const base = config.wenotify.url.trim().replace(/\/+$/, '');
      const path = config.wenotify.path || '/wxsend';
      const joined = base + (path.startsWith('/') ? '' : '/') + path;

      // 构建内容
      let content: string;
      if (message.subscriptions && message.subscriptions.length > 0) {
        // 使用结构化数据
        content = this.formatStructuredContent(message.subscriptions, config);
      } else {
        content = message.content;
      }

      const body: any = {
        title: message.title,
        content: content,
        token: config.wenotify.token,
      };

      if (config.wenotify.userid) {
        body.userid = config.wenotify.userid;
      }

      if (config.wenotify.templateId) {
        body.template_id = config.wenotify.templateId;
      }

      const response = await requestWithRetry(
        joined,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: config.wenotify.token,
          },
          body: JSON.stringify(body),
        },
        2,
        8000
      );

      if (response.ok) {
        return this.createSuccessResult();
      } else {
        const text = await response.text();
        return this.createErrorResult(`HTTP ${response.status}: ${text}`);
      }
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : '未知错误'
      );
    }
  }

  private formatStructuredContent(
    subscriptions: NonNullable<NotificationMessage['subscriptions']>,
    config: Config
  ): string {
    const items = subscriptions.map((sub) => {
      let statusText = '';
      let statusColor = '#4caf50';

      if (sub.daysRemaining === 0) {
        statusText = '今天到期！';
        statusColor = '#ff9800';
      } else if (sub.daysRemaining !== undefined && sub.daysRemaining < 0) {
        statusText = `已过期 ${Math.abs(sub.daysRemaining)} 天`;
        statusColor = '#f44336';
      } else {
        statusText = `将在 ${sub.daysRemaining} 天后到期`;
      }

      return {
        name: sub.name,
        type: sub.customType || '其他',
        expiryDate: sub.expiryDate,
        statusText,
        statusColor,
        notes: sub.notes || '',
      };
    });

    return JSON.stringify(items);
  }
}
