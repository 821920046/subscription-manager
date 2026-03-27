
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Env, Subscription, Config, WeChatOfficialAccountConfig } from '../types';
import { formatTimeInTimezone, formatTimezoneDisplay } from '../utils/date';
import { lunarCalendar } from '../utils/lunar';
import { requestWithRetry } from '../utils/http';

// 外部 API 响应类型定义
interface WeChatAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WeChatTemplateMessageResponse {
  errcode: number;
  errmsg: string;
  msgid?: string;
}

interface TelegramSendMessageResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
  error_code?: number;
}

interface NotifyXApiResponse {
  status: 'queued' | 'sent' | 'failed';
  message?: string;
  id?: string;
}

interface BarkApiResponse {
  code: number;
  message: string;
  timestamp?: number;
  id?: string;
}

interface ResendEmailResponse {
  id: string;
  from: string;
  to: string | string[];
  created_at: string;
}

interface WeChatBotResponse {
  errcode: number;
  errmsg: string;
}

interface FailureLogEntry {
  timestamp: string;
  title: string;
  failures: Array<{ channel: string; success: boolean }>;
  successes: Array<{ channel: string; success: boolean }>;
}

interface FailureLogIndex {
  key: string;
  id: number;
}

interface WeNotifyEdgeRequestBody {
  title: string;
  content: string;
  token: string;
  userid?: string;
  template_id?: string;
}

interface BarkPushRequestBody {
  title: string;
  body: string;
  device_key: string;
  isArchive?: number;
  sound?: string;
  icon?: string;
  group?: string;
  url?: string;
  copy?: string;
  autoCopy?: number;
}

type WeChatBotMessage =
  | { msgtype: 'text'; text: { content: string; mentioned_list?: string[]; mentioned_mobile_list?: string[] } }
  | { msgtype: 'markdown'; markdown: { content: string } };

interface WeChatTemplateData {
  thing01?: { value: string };
  thing02?: { value: string };
  time01?: { value: string };
  number01?: { value: string };
  [key: string]: { value: string } | undefined;
}

/**
 * 获取微信公众号 Access Token
 */
async function getWeChatAccessToken(env: Env, config: WeChatOfficialAccountConfig): Promise<string | null> {
  const key = 'wx_oa_access_token';
  const cached = await env.SUBSCRIPTIONS_KV.get(key);
  if (cached) return cached;

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`;
  try {
    const resp = await requestWithRetry(url, { method: 'GET' }, 2, 5000);
    const data = (await resp.json()) as WeChatAccessTokenResponse;
    if (data.access_token) {
      // 缓存 Token，有效期 7200 秒，这里设置 7000 秒
      await env.SUBSCRIPTIONS_KV.put(key, data.access_token, { expirationTtl: 7000 });
      return data.access_token;
    }
    console.error('[WeChat Official Account] 获取 Access Token 失败:', data);
    return null;
  } catch (e) {
    console.error('[WeChat Official Account] 获取 Access Token 错误:', e);
    return null;
  }
}

/**
 * 格式化通知内容
 */
export function formatNotificationContent(subscriptions: Subscription[], config: Config): string {
  const showLunar = config.showLunarGlobal === true;
  const timezone = config.timezone || 'UTC';
  let content = '';

  for (const sub of subscriptions) {
    const typeText = sub.customType || '其他';
    const periodText = (sub.periodValue && sub.periodUnit) ? `(周期: ${sub.periodValue} ${{ day: '天', month: '月', year: '年' }[sub.periodUnit] || sub.periodUnit})` : '';

    // 格式化到期日期（使用所选时区）
    const expiryDateObj = new Date(sub.expiryDate);
    const formattedExpiryDate = formatTimeInTimezone(expiryDateObj, timezone, 'date');

    // 农历日期
    let lunarExpiryText = '';
    if (showLunar) {
      const lunarExpiry = lunarCalendar.solar2lunar(expiryDateObj.getFullYear(), expiryDateObj.getMonth() + 1, expiryDateObj.getDate());
      lunarExpiryText = lunarExpiry ? `\n农历日期: ${lunarExpiry.fullStr}` : '';
    }

    // 状态和到期时间
    let statusText = '';
    let statusEmoji = '';

    // 计算剩余天数（需要根据时区重新计算，确保准确）
    // 这里简单使用 sub.daysRemaining，假设调用前已更新
    if (sub.daysRemaining === 0) {
      statusEmoji = '⚠️';
      statusText = '今天到期！';
    } else if (sub.daysRemaining !== undefined && sub.daysRemaining < 0) {
      statusEmoji = '🚨';
      statusText = `已过期 ${Math.abs(sub.daysRemaining)} 天`;
    } else {
      statusEmoji = '📅';
      statusText = `将在 ${sub.daysRemaining} 天后到期`;
    }

    // 获取日历类型和自动续期状态
    const calendarType = sub.useLunar ? '农历' : '公历';
    const autoRenewText = sub.autoRenew ? '是' : '否';

    // 构建格式化的通知内容
    const subscriptionContent = `${statusEmoji} **${sub.name}**
类型: ${typeText} ${periodText}
日历类型: ${calendarType}
到期日期: ${formattedExpiryDate}${lunarExpiryText}
自动续期: ${autoRenewText}
到期状态: ${statusText}`;

    // 添加备注
    const finalContent = sub.notes ?
      subscriptionContent + `\n备注: ${sub.notes}` :
      subscriptionContent;

    content += finalContent + '\n\n';
  }

  // 添加发送时间和时区信息
  const currentTime = formatTimeInTimezone(new Date(), timezone, 'datetime');
  content += `发送时间: ${currentTime}\n当前时区: ${formatTimezoneDisplay(timezone)}`;

  return content;
}

/**
 * 格式化企业微信 Markdown 内容 (支持颜色)
 */
export function formatWeChatMarkdownContent(subscriptions: Subscription[], config: Config): string {
  const showLunar = config.showLunarGlobal === true;
  const timezone = config.timezone || 'UTC';
  let content = '';

  for (const sub of subscriptions) {
    const typeText = sub.customType || '其他';
    const periodText = (sub.periodValue && sub.periodUnit) ? `(周期: ${sub.periodValue} ${{ day: '天', month: '月', year: '年' }[sub.periodUnit] || sub.periodUnit})` : '';

    // 格式化到期日期（使用所选时区）
    const expiryDateObj = new Date(sub.expiryDate);
    const formattedExpiryDate = formatTimeInTimezone(expiryDateObj, timezone, 'date');

    // 农历日期
    let lunarExpiryText = '';
    if (showLunar) {
      const lunarExpiry = lunarCalendar.solar2lunar(expiryDateObj.getFullYear(), expiryDateObj.getMonth() + 1, expiryDateObj.getDate());
      lunarExpiryText = lunarExpiry ? `\n<font color="comment">农历日期:</font> ${lunarExpiry.fullStr}` : '';
    }

    // 状态和到期时间
    let statusText = '';
    let statusEmoji = '';
    let isWarning = false;

    // 计算剩余天数
    if (sub.daysRemaining === 0) {
      statusEmoji = '⚠️';
      statusText = '今天到期！';
      isWarning = true;
    } else if (sub.daysRemaining !== undefined && sub.daysRemaining < 0) {
      statusEmoji = '🚨';
      statusText = `已过期 ${Math.abs(sub.daysRemaining)} 天`;
      isWarning = true;
    } else {
      statusEmoji = '📅';
      statusText = `将在 ${sub.daysRemaining} 天后到期`;
    }

    // 对到期状态应用颜色
    const finalStatusText = isWarning ? `<font color="warning">${statusText}</font>` : `<font color="info">${statusText}</font>`;

    // 标题颜色：警告状态用橙色，正常状态用绿色
    const titleColor = isWarning ? 'warning' : 'info';

    // 获取日历类型和自动续期状态
    const calendarType = sub.useLunar ? '农历' : '公历';
    const autoRenewText = sub.autoRenew ? '是' : '否';

    // 构建格式化的通知内容
    // 标签使用 comment (灰色) 颜色，标题和重要信息使用颜色高亮
    const subscriptionContent = `${statusEmoji} <font color="${titleColor}">**${sub.name}**</font>
<font color="comment">类型:</font> ${typeText} ${periodText}
<font color="comment">日历类型:</font> ${calendarType}
<font color="comment">到期日期:</font> **${formattedExpiryDate}**${lunarExpiryText}
<font color="comment">自动续期:</font> ${autoRenewText}
<font color="comment">到期状态:</font> ${finalStatusText}`;

    // 添加备注
    const finalContent = sub.notes ?
      subscriptionContent + `\n<font color="comment">备注:</font> ${sub.notes}` :
      subscriptionContent;

    content += finalContent + '\n\n';
  }

  // 添加发送时间和时区信息
  const currentTime = formatTimeInTimezone(new Date(), timezone, 'datetime');
  content += `<font color="comment">发送时间:</font> ${currentTime}\n<font color="comment">当前时区:</font> ${formatTimezoneDisplay(timezone)}`;

  return content;
}

/**
 * 格式化企微机器人精简通知内容（避免微信端截断）
 * 只保留：服务名、到期日期、状态，其他信息省略
 */
export function formatWechatBotCompactContent(subscriptions: Subscription[], config: Config): string {
  const timezone = config.timezone || 'UTC';
  let content = '';

  for (const sub of subscriptions) {
    // 状态判断
    let statusText = '';
    if (sub.daysRemaining === 0) {
      statusText = '⚠️ 今天到期！';
    } else if (sub.daysRemaining !== undefined && sub.daysRemaining < 0) {
      statusText = `🚨 已过期${Math.abs(sub.daysRemaining)}天`;
    } else {
      statusText = `📅 还有${sub.daysRemaining}天`;
    }

    // 到期日期
    const formattedExpiryDate = formatTimeInTimezone(new Date(sub.expiryDate), timezone, 'date');

    // 备注（可选，有就显示）
    const notesText = sub.notes ? ` | ${sub.notes}` : '';

    // 每条订阅一行：服务名 + 到期日 + 状态 + 备注
    content += `${sub.name} ${formattedExpiryDate} ${statusText}${notesText}\n`;
  }

  // 添加发送时间
  const currentTime = formatTimeInTimezone(new Date(), timezone, 'datetime');
  content += `\n⏰ ${currentTime}`;

  return content;
}

/**
 * 格式化 WeNotify Edge 结构化通知内容 (JSON)
 */
export function formatWeNotifyStructuredContent(subscriptions: Subscription[], config: Config): string {
  const showLunar = config.showLunarGlobal === true;
  const timezone = config.timezone || 'UTC';

  const items = subscriptions.map(sub => {
    const typeText = sub.customType || '其他';
    const periodText = (sub.periodValue && sub.periodUnit) ? `(周期: ${sub.periodValue} ${{ day: '天', month: '月', year: '年' }[sub.periodUnit] || sub.periodUnit})` : '';

    const expiryDateObj = new Date(sub.expiryDate);
    const formattedExpiryDate = formatTimeInTimezone(expiryDateObj, timezone, 'date');

    let lunarExpiryText = '';
    if (showLunar) {
      const lunarExpiry = lunarCalendar.solar2lunar(expiryDateObj.getFullYear(), expiryDateObj.getMonth() + 1, expiryDateObj.getDate());
      lunarExpiryText = lunarExpiry ? lunarExpiry.fullStr : '';
    }

    let statusText = '';
    let statusColor = '#4caf50'; // default green

    if (sub.daysRemaining === 0) {
      statusText = '今天到期！';
      statusColor = '#ff9800'; // orange
    } else if (sub.daysRemaining !== undefined && sub.daysRemaining < 0) {
      statusText = `已过期 ${Math.abs(sub.daysRemaining)} 天`;
      statusColor = '#f44336'; // red
    } else {
      statusText = `将在 ${sub.daysRemaining} 天后到期`;
    }

    const calendarType = sub.useLunar ? '农历' : '公历';
    const autoRenewText = sub.autoRenew ? '是' : '否';

    return {
      name: sub.name,
      type: `${typeText} ${periodText}`,
      calendarType: calendarType,
      expiryDate: formattedExpiryDate,
      lunarDate: lunarExpiryText,
      autoRenew: autoRenewText,
      statusText: statusText,
      statusColor: statusColor,
      notes: sub.notes || ''
    };
  });

  return JSON.stringify(items);
}

/**
 * 分发 WeNotify 通知内容
 */
export function distributeWeNotifyNotifications(subscriptions: Subscription[], config: Config): Map<string, Subscription[]> {
  const distribution = new Map<string, Subscription[]>();
  const globalUserIds = (config.wenotify?.userid || '').split(/[,;|]/).map(s => s.trim()).filter(Boolean);

  for (const sub of subscriptions) {
    let targets: string[] = [];
    if (sub.weNotifyUserIds) {
      targets = sub.weNotifyUserIds.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
    }

    if (targets.length === 0) {
      targets = globalUserIds.length > 0 ? globalUserIds : [''];
    }

    for (const userId of targets) {
      if (!distribution.has(userId)) {
        distribution.set(userId, []);
      }
      distribution.get(userId)!.push(sub);
    }
  }
  return distribution;
}

/**
 * 分发企微机器人通知内容
 */
export function distributeWechatBotNotifications(subscriptions: Subscription[], config: Config): Map<string, Subscription[]> {
  const distribution = new Map<string, Subscription[]>();
  const globalWebhooks = (config.wechatBot?.webhook || '').split('|').map(s => s.trim()).filter(Boolean);

  for (const sub of subscriptions) {
    let targets: string[] = [];
    if (sub.wechatBotKeys) {
      const targetKeys = sub.wechatBotKeys.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
      // 匹配包含对应 Key 的 Webhook
      targets = globalWebhooks.filter(url => {
        try {
          const urlObj = new URL(url);
          const key = urlObj.searchParams.get('key');
          return key && targetKeys.includes(key);
        } catch {
          return false;
        }
      });
    }

    if (targets.length === 0) {
      targets = globalWebhooks.length > 0 ? globalWebhooks : [''];
    }

    for (const url of targets) {
      if (!distribution.has(url)) {
        distribution.set(url, []);
      }
      distribution.get(url)!.push(sub);
    }
  }
  return distribution;
}

/**
 * 分发邮件通知内容
 */
export function distributeEmailNotifications(subscriptions: Subscription[], config: Config): Map<string, Subscription[]> {
  const distribution = new Map<string, Subscription[]>();
  const globalEmails = (config.email?.toEmail || '').split(/[,;|]/).map(s => s.trim()).filter(Boolean);

  for (const sub of subscriptions) {
    let targets: string[] = [];
    if (sub.emailAddresses) {
      targets = sub.emailAddresses.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
    }

    if (targets.length === 0) {
      targets = globalEmails.length > 0 ? globalEmails : [''];
    }

    for (const email of targets) {
      if (!distribution.has(email)) {
        distribution.set(email, []);
      }
      distribution.get(email)!.push(sub);
    }
  }
  return distribution;
}

/**
 * 发送通知到所有启用的渠道
 */
export async function sendNotificationToAllChannels(title: string, commonContent: string, config: Config, env: Env | null = null, logPrefix = '[定时任务]', subscriptions: Subscription[] | null = null): Promise<void> {
  if (!config.enabledNotifiers || config.enabledNotifiers.length === 0) {
    console.log(`${logPrefix} 未启用任何通知渠道。`);
    return;
  }

  const results: { channel: string; success: boolean }[] = [];

  if (config.enabledNotifiers.includes('notifyx')) {
    const notifyxContent = `## ${title}\n\n${commonContent}`;
    const success = await sendNotifyXNotification(title, notifyxContent, `订阅提醒`, config);
    results.push({ channel: 'notifyx', success });
    console.log(`${logPrefix} 发送NotifyX通知 ${success ? '成功' : '失败'}`);
  }
  if (config.enabledNotifiers.includes('wenotify')) {
    let success = false;
    // 如果有订阅数据，执行分发逻辑
    if (subscriptions && subscriptions.length > 0) {
      const distribution = distributeWeNotifyNotifications(subscriptions, config);
      for (const [userId, items] of distribution.entries()) {
        const userContent = formatWeNotifyStructuredContent(items, config);
        const target = userId === '' ? undefined : userId;
        const s = await sendWeNotifyEdgeNotification(title, userContent, config, false, target);
        if (s) success = true;
      }
    } else {
      // 无订阅数据（如测试、报警），发送给全局用户
      const globalUserIds = (config.wenotify?.userid || '').split(/[,;|]/).map(s => s.trim()).filter(Boolean);
      if (globalUserIds.length === 0) globalUserIds.push(''); // Default

      let content = commonContent.replace(/(\**|\*|##|#|`)/g, '');
      // 对于报警或测试，可以保留一些格式或直接发送

      for (const userId of globalUserIds) {
        const target = userId === '' ? undefined : userId;
        const s = await sendWeNotifyEdgeNotification(title, content, config, false, target);
        if (s) success = true;
      }
    }
    results.push({ channel: 'wenotify', success });
    console.log(`${logPrefix} 发送WeNotify Edge通知 ${success ? '成功' : '部分/全部失败'}`);
  }
  if (config.enabledNotifiers.includes('wechatOfficialAccount')) {
    const content = commonContent.replace(/(\**|\*|##|#|`)/g, '');
    const success = await sendWeChatOfficialAccountNotification(title, content, config, env);
    results.push({ channel: 'wechatOfficialAccount', success });
    console.log(`${logPrefix} 发送微信公众号通知 ${success ? '成功' : '失败'}`);
  }
  if (config.enabledNotifiers.includes('telegram')) {
    const telegramContent = `*${title}*\n\n${commonContent}`;
    const success = await sendTelegramNotification(telegramContent, config);
    results.push({ channel: 'telegram', success });
    console.log(`${logPrefix} 发送Telegram通知 ${success ? '成功' : '失败'}`);
  }
  if (config.enabledNotifiers.includes('webhook')) {
    const webhookContent = commonContent.replace(/(\**|\*|##|#|`)/g, '');
    const success = await sendWebhookNotification(title, webhookContent, config);
    results.push({ channel: 'webhook', success });
    console.log(`${logPrefix} 发送企业微信应用通知 ${success ? '成功' : '失败'}`);
  }
  if (config.enabledNotifiers.includes('wechatbot')) {
    let success = false;
    if (subscriptions && subscriptions.length > 0) {
      const distribution = distributeWechatBotNotifications(subscriptions, config);
      for (const [url, items] of distribution.entries()) {
        let wechatbotContent;
        if (config.wechatBot?.msgType === 'markdown') {
          wechatbotContent = formatWeChatMarkdownContent(items, config);
        } else {
          // 使用精简格式，避免微信端截断
          wechatbotContent = formatWechatBotCompactContent(items, config);
        }
        const target = url === '' ? undefined : url;
        const s = await sendWechatBotNotification(title, wechatbotContent, config, target);
        if (s) success = true;
      }
    } else {
      const globalWebhooks = (config.wechatBot?.webhook || '').split('|').map(s => s.trim()).filter(Boolean);
      if (globalWebhooks.length === 0) globalWebhooks.push('');
      const wechatbotContent = commonContent.replace(/(\**|\*|##|#|`)/g, '').slice(0, 500);
      for (const url of globalWebhooks) {
        const target = url === '' ? undefined : url;
        const s = await sendWechatBotNotification(title, wechatbotContent, config, target);
        if (s) success = true;
      }
    }
    results.push({ channel: 'wechatbot', success });
    console.log(`${logPrefix} 发送企业微信机器人通知 ${success ? '成功' : '部分/全部失败'}`);
  }
  if (config.enabledNotifiers.includes('email')) {
    let success = false;
    if (subscriptions && subscriptions.length > 0) {
      const distribution = distributeEmailNotifications(subscriptions, config);
      for (const [email, items] of distribution.entries()) {
        const emailContent = formatNotificationContent(items, config);
        const target = email === '' ? undefined : email;
        const s = await sendEmailNotification(title, emailContent, config, target);
        if (s) success = true;
      }
    } else {
      const globalEmails = (config.email?.toEmail || '').split(/[,;|]/).map(s => s.trim()).filter(Boolean);
      if (globalEmails.length === 0) globalEmails.push('');
      const emailContent = commonContent.replace(/(\**|\*|##|#|`)/g, '');
      for (const email of globalEmails) {
        const target = email === '' ? undefined : email;
        const s = await sendEmailNotification(title, emailContent, config, target);
        if (s) success = true;
      }
    }
    results.push({ channel: 'email', success });
    console.log(`${logPrefix} 发送邮件通知 ${success ? '成功' : '部分/全部失败'}`);
  }
  if (config.enabledNotifiers.includes('bark')) {
    const barkContent = commonContent.replace(/(\**|\*|##|#|`)/g, '');
    const success = await sendBarkNotification(title, barkContent, config);
    results.push({ channel: 'bark', success });
    console.log(`${logPrefix} 发送Bark通知 ${success ? '成功' : '失败'}`);
  }

  const failures = results.filter(r => !r.success);
  if (failures.length > 0 && env?.SUBSCRIPTIONS_KV) {
    const payload: FailureLogEntry = {
      timestamp: new Date().toISOString(),
      title,
      failures,
      successes: results.filter(r => r.success)
    };
    try {
      const id = Date.now();
      const key = `reminder_failure_${id}`;
      await env.SUBSCRIPTIONS_KV.put(key, JSON.stringify(payload));
      const idxRaw = await env.SUBSCRIPTIONS_KV.get('reminder_failure_index');
      let idx: FailureLogIndex[] = [];
      if (idxRaw) {
        try { idx = JSON.parse(idxRaw) || []; } catch { }
      }
      idx.push({ key, id });
      idx = idx.slice(-100);
      await env.SUBSCRIPTIONS_KV.put('reminder_failure_index', JSON.stringify(idx));
    } catch (e) {
      console.error(`${logPrefix} 写入提醒失败日志到KV失败:`, e);
    }
    // try to alert admin using a primary available channel
    const summary = `提醒发送失败渠道: ${failures.map(f => f.channel).join(', ')}`;
    const alertTitle = '提醒发送失败';
    const alertContent = `${summary}\n任务标题: ${title}\n时间: ${new Date().toLocaleString()}`;
    try {
      if (config.enabledNotifiers.includes('notifyx')) {
        await sendNotifyXNotification(alertTitle, `## ${alertTitle}\n\n${alertContent}`, '系统警报', config);
      } else if (config.enabledNotifiers.includes('wenotify')) {
        await sendWeNotifyEdgeNotification(alertTitle, alertContent, config);
      } else if (config.enabledNotifiers.includes('telegram')) {
        await sendTelegramNotification(`*${alertTitle}*\n\n${alertContent}`, config);
      } else if (config.enabledNotifiers.includes('wechatbot')) {
        await sendWechatBotNotification(alertTitle, alertContent, config);
      } else if (config.enabledNotifiers.includes('email')) {
        await sendEmailNotification(alertTitle, alertContent, config);
      } else if (config.enabledNotifiers.includes('bark')) {
        await sendBarkNotification(alertTitle, alertContent, config);
      }
    } catch (e) {
      console.error(`${logPrefix} 管理员告警发送失败:`, e);
    }
  }
}

// Telegram
export async function sendTelegramNotification(message: string, config: Config): Promise<boolean> {
  try {
    if (!config.telegram?.botToken || !config.telegram?.chatId) {
      console.error('[Telegram] 通知未配置，缺少Bot Token或Chat ID');
      return false;
    }

    const url = 'https://api.telegram.org/bot' + config.telegram.botToken + '/sendMessage';
    const response = await requestWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegram.chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    }, 2, 8000);

    const result = (await response.json()) as TelegramSendMessageResponse;
    return result.ok;
  } catch (error) {
    console.error('[Telegram] 发送通知失败:', error);
    return false;
  }
}

// NotifyX
export async function sendNotifyXNotification(title: string, content: string, description: string, config: Config): Promise<boolean> {
  try {
    if (!config.notifyx?.apiKey) {
      console.error('[NotifyX] 通知未配置，缺少API Key');
      return false;
    }

    const url = 'https://www.notifyx.cn/api/v1/send/' + config.notifyx.apiKey;
    const response = await requestWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        content: content,
        description: description || ''
      })
    }, 2, 8000);

    const result = (await response.json()) as NotifyXApiResponse;
    return result.status === 'queued';
  } catch (error) {
    console.error('[NotifyX] 发送通知失败:', error);
    return false;
  }
}

// WeNotify Edge
export async function sendWeNotifyEdgeNotification(title: string, content: string, config: Config, throwOnError = false, targetUserId?: string): Promise<boolean> {
  try {
    if (!config.wenotify?.url || !config.wenotify?.token) {
      const msg = '[WeNotify Edge] 通知未配置，缺少服务地址或Token';
      console.error(msg);
      if (throwOnError) throw new Error(msg);
      return false;
    }
    const base = config.wenotify.url.trim().replace(/\/+$/, '');

    const tokenStr = config.wenotify.token.trim();
    const path = (config.wenotify.path || '/wxsend').trim();
    const joined = base + (path.startsWith('/') ? '' : '/') + path;
    const addToken = (u: string) => u + (u.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(tokenStr);
    const primaryUrl = addToken(joined);

    const body: WeNotifyEdgeRequestBody = {
      title: title,
      content: content,
      token: tokenStr
    };

    // 优先使用传入的目标用户，否则使用配置的用户
    const finalUserId = targetUserId !== undefined ? targetUserId : config.wenotify.userid;
    if (finalUserId) {
      body.userid = finalUserId;
    }
    if (config.wenotify.templateId) {
      body.template_id = config.wenotify.templateId;
    }
    const response = await requestWithRetry(primaryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': tokenStr
      },
      body: JSON.stringify(body)
    }, 2, 8000);

    if (!response.ok) {
      const firstText = await response.text();
      const msg = `HTTP ${response.status}: ${firstText}`;
      if (throwOnError) throw new Error(msg);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[WeNotify Edge] 发送通知失败:', error);
    if (throwOnError) throw error;
    return false;
  }
}

// Bark
export async function sendBarkNotification(title: string, content: string, config: Config): Promise<boolean> {
  try {
    if (!config.bark?.deviceKey) {
      console.error('[Bark] 通知未配置，缺少设备Key');
      return false;
    }

    const serverUrl = config.bark.server || 'https://api.day.app';
    const url = serverUrl + '/push';
    const payload: BarkPushRequestBody = {
      title: title,
      body: content,
      device_key: config.bark.deviceKey
    };

    if (config.bark.isArchive === 'true') {
      payload.isArchive = 1;
    }

    const response = await requestWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    }, 2, 8000);

    const result = (await response.json()) as BarkApiResponse;
    return result.code === 200;
  } catch (error) {
    console.error('[Bark] 发送通知失败:', error);
    return false;
  }
}

// Email
export async function sendEmailNotification(title: string, content: string, config: Config, recipientEmail?: string): Promise<boolean> {
  try {
    const finalToEmail = recipientEmail || config.email?.toEmail;
    if (!config.email?.resendApiKey || !config.email?.fromEmail || !finalToEmail) {
      console.error('[邮件通知] 通知未配置，缺少必要参数');
      return false;
    }

    // 生成HTML邮件内容
    const htmlContent = `
<!DOCTYPE html>
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
            <p>订阅管理系统 | 发送时间: ${formatTimeInTimezone(new Date(), config.timezone || 'UTC', 'datetime')}</p>
        </div>
    </div>
</body>
</html>`;

    const fromEmail = config.email.fromEmail.includes('<') ?
      config.email.fromEmail :
      (config.email.fromEmail ? `Notification <${config.email.fromEmail}>` : '');

    const response = await requestWithRetry('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.email.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: finalToEmail,
        subject: title,
        html: htmlContent,
        text: content
      })
    }, 1, 10000);

    const result = (await response.json()) as ResendEmailResponse;
    return response.ok && !!result.id;
  } catch (error) {
    console.error('[邮件通知] 发送邮件失败:', error);
    return false;
  }
}

// 企业微信应用通知 (Webhook)
export async function sendWebhookNotification(title: string, content: string, config: Config): Promise<boolean> {
  try {
    if (!config.webhook?.url) {
      console.error('[企业微信应用通知] 未配置 Webhook URL');
      return false;
    }

    const method = config.webhook.method || 'POST';
    const headers = config.webhook.headers ? JSON.parse(config.webhook.headers) : { 'Content-Type': 'application/json' };
    const template = config.webhook.template ? JSON.parse(config.webhook.template) : null;

    let body;
    if (template) {
      // 使用模板替换变量
      const templateStr = JSON.stringify(template);
      const replacedStr = templateStr
        .replace(/{{title}}/g, title)
        .replace(/{{content}}/g, content)
        .replace(/{{timestamp}}/g, new Date().toISOString());
      body = replacedStr;
    } else {
      // 默认格式
      body = JSON.stringify({
        msgtype: 'text',
        text: {
          content: `${title}\n\n${content}`
        }
      });
    }

    const response = await requestWithRetry(config.webhook.url, {
      method: method,
      headers: headers,
      body: method !== 'GET' ? body : undefined
    }, 2, 8000);

    return response.ok;
  } catch (error) {
    console.error('[企业微信应用通知] 发送失败:', error);
    return false;
  }
}

// 企业微信机器人
export async function sendWechatBotNotification(title: string, content: string, config: Config, webhookUrl?: string): Promise<boolean> {
  try {
    const finalWebhook = webhookUrl || config.wechatBot?.webhook;
    if (!finalWebhook) {
      console.error('[企业微信机器人] 未配置 Webhook URL');
      return false;
    }

    const msgType = config.wechatBot?.msgType || 'text';
    let messageData: WeChatBotMessage;

    if (msgType === 'markdown') {
      const markdownContent = `### ${title}\n\n${content}`;
      messageData = {
        msgtype: 'markdown',
        markdown: {
          content: markdownContent
        }
      };
    } else {
      const textContent = `${title}\n\n${content}`;
      messageData = {
        msgtype: 'text',
        text: {
          content: textContent
        }
      };
    }

    if (config.wechatBot?.atAll === 'true') {
      if (msgType === 'text' && messageData.msgtype === 'text') {
        messageData.text.mentioned_list = ['@all'];
      }
    } else if (config.wechatBot?.atMobiles) {
      const mobiles = config.wechatBot.atMobiles.split(',').map((m: string) => m.trim()).filter((m: string) => m);
      if (mobiles.length > 0) {
        if (msgType === 'text' && messageData.msgtype === 'text') {
          messageData.text.mentioned_mobile_list = mobiles;
        }
      }
    }

    const response = await requestWithRetry(finalWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    }, 2, 8000);

    const responseText = await response.text();
    if (response.ok) {
      try {
        const result = JSON.parse(responseText) as WeChatBotResponse;
        return result.errcode === 0;
      } catch (parseError) {
        return false;
      }
    } else {
      return false;
    }
  } catch (error) {
    console.error('[企业微信机器人] 发送通知失败:', error);
    return false;
  }
}

// 微信公众号（服务号）通知
export async function sendWeChatOfficialAccountNotification(title: string, content: string, config: Config, env: Env | null): Promise<boolean> {
  try {
    if (!env) {
      console.error('[WeChat Official Account] 缺少 Env 环境，无法使用 KV 缓存 Token');
      return false;
    }
    const oaConfig = config.wechatOfficialAccount;
    if (!oaConfig?.appId || !oaConfig?.appSecret || !oaConfig?.templateId || !oaConfig?.userIds) {
      console.error('[WeChat Official Account] 通知未配置，缺少必要参数');
      return false;
    }

    const token = await getWeChatAccessToken(env, oaConfig);
    if (!token) return false;

    const userIds = oaConfig.userIds.split('|').map(id => id.trim()).filter(id => id);
    let successCount = 0;

    for (const userId of userIds) {
      // 构造符合微信模板消息的数据
      // 这里采用一种比较通用的映射方式，兼容 Plan 中提到的 thing01, time01, number01, thing02
      // 注意：微信对字段长度有限制，尤其是 thing 类型

      const payloadData: WeChatTemplateData = {
        thing01: { value: title.substring(0, 20) }, // 标题，截断到20字
        time01: { value: new Date().toISOString().split('T')[0] }, // 当前日期
        number01: { value: '1' }, // 这里的语义不太明确，暂时填1或者由外部传入
        thing02: { value: content.substring(0, 20) + (content.length > 20 ? '...' : '') } // 内容，截断
      };

      // 尝试发送
      const resp = await requestWithRetry(`https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: userId,
          template_id: oaConfig.templateId,
          data: payloadData
        })
      }, 2, 5000);

      if (resp.ok) {
        const resJson = (await resp.json()) as WeChatTemplateMessageResponse;
        if (resJson.errcode === 0) {
          successCount++;
        } else {
          console.error(`[WeChat Official Account] 发送给 ${userId} 失败:`, resJson);
        }
      }
    }

    return successCount > 0;
  } catch (error) {
    console.error('[WeChat Official Account] 发送通知失败:', error);
    return false;
  }
}
