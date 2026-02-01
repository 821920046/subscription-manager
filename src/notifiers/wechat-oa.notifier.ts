import { BaseNotifier } from './base';
import type { Config, NotificationMessage, NotificationResult, Env } from '../types';
import { requestWithRetry } from '../utils/http';

/**
 * 微信公众号（服务号）推送渠道
 */
export class WeChatOANotifier extends BaseNotifier {
  readonly name = 'wechatOfficialAccount';
  private env: Env | null = null;

  setEnv(env: Env) {
    this.env = env;
  }

  isConfigured(config: Config): boolean {
    return !!(
      config.wechatOfficialAccount?.appId &&
      config.wechatOfficialAccount?.appSecret &&
      config.wechatOfficialAccount?.templateId &&
      config.wechatOfficialAccount?.userIds
    );
  }

  async send(
    message: NotificationMessage,
    config: Config
  ): Promise<NotificationResult> {
    try {
      if (!this.isConfigured(config)) {
        return this.createErrorResult('微信公众号配置不完整');
      }

      if (!this.env) {
        return this.createErrorResult('缺少Env环境，无法使用KV缓存');
      }

      const oaConfig = config.wechatOfficialAccount!;
      const token = await this.getAccessToken(oaConfig);

      if (!token) {
        return this.createErrorResult('获取Access Token失败');
      }

      const userIds = oaConfig.userIds.split('|').map((id) => id.trim()).filter((id) => id);
      let successCount = 0;
      const errors: string[] = [];

      const content = message.subscriptions
        ? this.formatSubscriptions(message.subscriptions, config)
        : message.content;

      for (const userId of userIds) {
        try {
          const payloadData = {
            thing01: { value: message.title.substring(0, 20) },
            time01: { value: new Date().toISOString().split('T')[0] },
            number01: { value: '1' },
            thing02: {
              value:
                content.substring(0, 20) + (content.length > 20 ? '...' : ''),
            },
          };

          const response = await requestWithRetry(
            `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                touser: userId,
                template_id: oaConfig.templateId,
                data: payloadData,
              }),
            },
            2,
            5000
          );

          const result = await response.json();

          if (result.errcode === 0) {
            successCount++;
          } else {
            errors.push(`${userId}: ${result.errmsg}`);
          }
        } catch (error) {
          errors.push(`${userId}: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      if (successCount > 0) {
        return this.createSuccessResult({
          successCount,
          totalCount: userIds.length,
          errors: errors.length > 0 ? errors : undefined,
        });
      } else {
        return this.createErrorResult(`所有用户发送失败: ${errors.join(', ')}`);
      }
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : '未知错误'
      );
    }
  }

  private async getAccessToken(
    config: NonNullable<Config['wechatOfficialAccount']>
  ): Promise<string | null> {
    if (!this.env) return null;

    const key = 'wx_oa_access_token';
    const cached = await this.env.SUBSCRIPTIONS_KV.get(key);
    if (cached) return cached;

    try {
      const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`;
      const response = await requestWithRetry(url, { method: 'GET' }, 2, 5000);
      const data: any = await response.json();

      if (data.access_token) {
        // 缓存Token，有效期7200秒，这里设置7000秒
        await this.env.SUBSCRIPTIONS_KV.put(key, data.access_token, {
          expirationTtl: 7000,
        });
        return data.access_token;
      }

      return null;
    } catch {
      return null;
    }
  }
}
