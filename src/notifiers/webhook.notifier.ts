import { BaseNotifier } from './base';
import type { Config, NotificationMessage, NotificationResult } from '../types';
import { requestWithRetry } from '../utils/http';
import { safeJSONParse } from '../utils/http';

/**
 * 通用Webhook推送渠道
 */
export class WebhookNotifier extends BaseNotifier {
  readonly name = 'webhook';

  isConfigured(config: Config): boolean {
    return !!config.webhook?.url;
  }

  async send(
    message: NotificationMessage,
    config: Config
  ): Promise<NotificationResult> {
    try {
      if (!config.webhook?.url) {
        return this.createErrorResult('Webhook配置不完整');
      }

      const method = config.webhook.method || 'POST';
      const headers = config.webhook.headers
        ? safeJSONParse(config.webhook.headers, {})
        : { 'Content-Type': 'application/json' };

      const content = message.subscriptions
        ? this.formatSubscriptions(message.subscriptions, config)
        : message.content;

      let body: string | undefined;

      if (config.webhook.template) {
        // 使用模板替换变量
        const template = safeJSONParse(config.webhook.template, {});
        const templateStr = JSON.stringify(template);
        const replacedStr = templateStr
          .replace(/\{\{title\}\}/g, message.title)
          .replace(/\{\{content\}\}/g, content)
          .replace(/\{\{timestamp\}\}/g, new Date().toISOString());
        body = replacedStr;
      } else {
        // 默认格式
        body = JSON.stringify({
          msgtype: 'text',
          text: {
            content: `${message.title}\n\n${content}`,
          },
        });
      }

      const response = await requestWithRetry(
        config.webhook.url,
        {
          method,
          headers,
          body: method !== 'GET' ? body : undefined,
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
}
