import { BaseNotifier } from './base';
import type { Config, NotificationMessage, NotificationResult } from '../types';
import { requestWithRetry } from '../utils/http';

/**
 * 企业微信机器人推送渠道
 */
export class WeChatBotNotifier extends BaseNotifier {
  readonly name = 'wechatBot';

  isConfigured(config: Config): boolean {
    return !!config.wechatBot?.webhook;
  }

  async send(
    message: NotificationMessage,
    config: Config
  ): Promise<NotificationResult> {
    try {
      if (!config.wechatBot?.webhook) {
        return this.createErrorResult('企业微信机器人配置不完整');
      }

      const content = message.subscriptions
        ? this.formatSubscriptions(message.subscriptions, config)
        : message.content;

      const msgType = config.wechatBot.msgType || 'text';
      let messageData: any;

      if (msgType === 'markdown') {
        messageData = {
          msgtype: 'markdown',
          markdown: {
            content: `### ${message.title}\n\n${content}`,
          },
        };
      } else {
        messageData = {
          msgtype: 'text',
          text: {
            content: `${message.title}\n\n${content}`,
          },
        };

        // 添加@功能
        if (config.wechatBot.atAll) {
          messageData.text.mentioned_list = ['@all'];
        } else if (config.wechatBot.atMobiles) {
          const mobiles = config.wechatBot.atMobiles
            .split(',')
            .map((m) => m.trim())
            .filter((m) => m);
          if (mobiles.length > 0) {
            messageData.text.mentioned_mobile_list = mobiles;
          }
        }
      }

      const response = await requestWithRetry(
        config.wechatBot.webhook,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messageData),
        },
        2,
        8000
      );

      const responseText = await response.text();

      if (response.ok) {
        const result = JSON.parse(responseText);
        if (result.errcode === 0) {
          return this.createSuccessResult(result);
        } else {
          return this.createErrorResult(result.errmsg || '发送失败');
        }
      } else {
        return this.createErrorResult(`HTTP ${response.status}: ${responseText}`);
      }
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : '未知错误'
      );
    }
  }
}
