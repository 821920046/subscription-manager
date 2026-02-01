import { BaseNotifier } from './base';
import type { Config, NotificationMessage, NotificationResult } from '../types';
import { requestWithRetry } from '../utils/http';
import { formatTimeInTimezone } from '../utils/date';

/**
 * 邮件推送渠道（使用Resend API）
 */
export class EmailNotifier extends BaseNotifier {
  readonly name = 'email';

  isConfigured(config: Config): boolean {
    return !!(
      config.email?.resendApiKey &&
      config.email?.fromEmail &&
      config.email?.toEmail
    );
  }

  async send(
    message: NotificationMessage,
    config: Config
  ): Promise<NotificationResult> {
    try {
      if (!this.isConfigured(config)) {
        return this.createErrorResult('邮件配置不完整');
      }

      const content = message.subscriptions
        ? this.formatSubscriptions(message.subscriptions, config)
        : message.content;

      const htmlContent = this.generateHTMLContent(
        message.title,
        content,
        config
      );

      const fromEmail = config.email!.fromEmail.includes('<')
        ? config.email!.fromEmail
        : `${config.email!.fromName || 'Notification'} <${config.email!.fromEmail}>`;

      const response = await requestWithRetry(
        'https://api.resend.com/emails',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.email!.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: config.email!.toEmail,
            subject: message.title,
            html: htmlContent,
            text: content,
          }),
        },
        1,
        10000
      );

      const result = await response.json();

      if (response.ok && result.id) {
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

  private generateHTMLContent(
    title: string,
    content: string,
    config: Config
  ): string {
    const currentTime = formatTimeInTimezone(
      new Date(),
      config.timezone || 'UTC',
      'datetime'
    );

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; }
        .content h2 { color: #333; margin-top: 0; }
        .content p { color: #666; line-height: 1.6; margin: 16px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .highlight { background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 ${title}</h1>
        </div>
        <div class="content">
            <div class="highlight">
                ${content.replace(/\n/g, '<br>')}
            </div>
            <p>此邮件由订阅管理系统自动发送，请及时处理相关订阅事务。</p>
        </div>
        <div class="footer">
            <p>订阅管理系统 | 发送时间: ${currentTime}</p>
        </div>
    </div>
</body>
</html>`;
  }
}
