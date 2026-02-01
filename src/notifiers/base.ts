import type { Config, NotificationMessage, NotificationResult } from '../types';

/**
 * 推送渠道抽象基类
 */
export abstract class BaseNotifier {
  /**
   * 渠道名称
   */
  abstract readonly name: string;

  /**
   * 检查是否已配置
   */
  abstract isConfigured(config: Config): boolean;

  /**
   * 发送通知
   */
  abstract send(
    message: NotificationMessage,
    config: Config
  ): Promise<NotificationResult>;

  /**
   * 格式化订阅数据为通知内容
   */
  protected formatSubscriptions(
    subscriptions: NotificationMessage['subscriptions'],
    config: Config
  ): string {
    if (!subscriptions || subscriptions.length === 0) {
      return message.content;
    }

    let content = '';

    for (const sub of subscriptions) {
      const typeText = sub.customType || '其他';
      const periodText =
        sub.periodValue && sub.periodUnit
          ? `(周期: ${sub.periodValue}${
              { day: '天', month: '月', year: '年' }[sub.periodUnit]
            })`
          : '';

      let statusEmoji = '📅';
      let statusText = '';

      if (sub.daysRemaining === 0) {
        statusEmoji = '⚠️';
        statusText = '今天到期！';
      } else if (sub.daysRemaining !== undefined && sub.daysRemaining < 0) {
        statusEmoji = '🚨';
        statusText = `已过期 ${Math.abs(sub.daysRemaining)} 天`;
      } else {
        statusText = `将在 ${sub.daysRemaining} 天后到期`;
      }

      const calendarType = sub.useLunar ? '农历' : '公历';
      const autoRenewText = sub.autoRenew ? '是' : '否';

      content += `${statusEmoji} **${sub.name}**
类型: ${typeText} ${periodText}
日历类型: ${calendarType}
到期日期: ${sub.expiryDate}
自动续期: ${autoRenewText}
到期状态: ${statusText}`;

      if (sub.notes) {
        content += `\n备注: ${sub.notes}`;
      }

      content += '\n\n';
    }

    return content;
  }

  /**
   * 创建成功结果
   */
  protected createSuccessResult(response?: any): NotificationResult {
    return {
      channel: this.name,
      success: true,
      response,
    };
  }

  /**
   * 创建失败结果
   */
  protected createErrorResult(error: string): NotificationResult {
    return {
      channel: this.name,
      success: false,
      error,
    };
  }
}
