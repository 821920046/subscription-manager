/**
 * 日期 / 时区工具
 *
 * 设计要点（第一性原则）：
 * - Cloudflare Workers 运行在 UTC；`new Date()` 本身是一个绝对时刻（时区无关）。
 * - “还剩多少天到期”属于日历天数计算，必须在用户配置的时区下按自然日（午夜到午夜）比较，
 *   否则对于非 UTC 用户会出现±1 天的偏差（例如本应“今天到期”却显示“明天”）。
 */

/**
 * 获取当前绝对时刻。
 * 时区转换统一在具体的日历计算/格式化环节处理，这里只返回真实时刻。
 */
export function getCurrentTimeInTimezone(_timezone = 'UTC'): Date {
  return new Date();
}

export function getTimestampInTimezone(timezone = 'UTC'): number {
  return getCurrentTimeInTimezone(timezone).getTime();
}

export function convertUTCToTimezone(utcTime: string | number | Date, _timezone = 'UTC'): Date {
  return new Date(utcTime);
}

export function calculateExpirationTime(expirationMinutes: number, timezone = 'UTC'): Date {
  const currentTime = getCurrentTimeInTimezone(timezone);
  return new Date(currentTime.getTime() + expirationMinutes * 60 * 1000);
}

export function isExpired(targetTime: string | number | Date, timezone = 'UTC'): boolean {
  const currentTime = getCurrentTimeInTimezone(timezone);
  return currentTime > new Date(targetTime);
}

/**
 * 获取某个时刻在指定时区下的年/月/日。
 */
function getYmdInTimezone(
  time: string | number | Date,
  timezone = 'UTC'
): { year: number; month: number; day: number } {
  const date = new Date(time);
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const get = (type: string): number =>
      Number(parts.find((p) => p.type === type)?.value);
    return { year: get('year'), month: get('month'), day: get('day') };
  } catch {
    // 无效时区：回退到 UTC
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }
}

/**
 * 以“时区本地自然日”为单位计算 target 相对于 base 的天数差。
 * 返回正数表示 target 在 base 之后。
 */
export function dayDiffInTimezone(
  target: string | number | Date,
  base: string | number | Date,
  timezone = 'UTC'
): number {
  const t = getYmdInTimezone(target, timezone);
  const b = getYmdInTimezone(base, timezone);
  const tUtc = Date.UTC(t.year, t.month - 1, t.day);
  const bUtc = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((tUtc - bUtc) / (1000 * 60 * 60 * 24));
}

export function formatTimeInTimezone(
  time: string | number | Date,
  timezone = 'UTC',
  format = 'full'
): string {
  try {
    const date = new Date(time);
    if (format === 'date') {
      return date.toLocaleDateString('zh-CN', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } else if (format === 'datetime') {
      return date.toLocaleString('zh-CN', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
    return date.toLocaleString('zh-CN', { timeZone: timezone });
  } catch (error) {
    console.error('时间格式化错误:', error instanceof Error ? error.message : error);
    return new Date(time).toISOString();
  }
}

export function getTimezoneOffset(timezone = 'UTC'): number {
  try {
    const now = new Date();
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = dtf.formatToParts(now);
    const get = (type: string): number => Number(parts.find((x) => x.type === type)?.value);
    let hour = get('hour');
    // Intl 在部分环境中可能把午夜输出为 24
    if (hour === 24) hour = 0;
    const target = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
    const utc = now.getTime();
    return Math.round((target - utc) / (1000 * 60 * 60));
  } catch (error) {
    console.error('获取时区偏移量错误:', error instanceof Error ? error.message : error);
    return 0;
  }
}

export function formatTimezoneDisplay(timezone = 'UTC'): string {
  try {
    const offset = getTimezoneOffset(timezone);
    const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
    const timezoneNames: { [key: string]: string } = {
      UTC: '世界标准时间',
      'Asia/Shanghai': '中国标准时间',
      'Asia/Hong_Kong': '香港时间',
      'Asia/Taipei': '台北时间',
      'Asia/Singapore': '新加坡时间',
      'Asia/Tokyo': '日本时间',
      'Asia/Seoul': '韩国时间',
      'America/New_York': '美国东部时间',
      'America/Los_Angeles': '美国太平洋时间',
      'America/Chicago': '美国中部时间',
      'America/Denver': '美国山地时间',
      'Europe/London': '英国时间',
      'Europe/Paris': '巴黎时间',
      'Europe/Berlin': '柏林时间',
      'Europe/Moscow': '莫斯科时间',
      'Australia/Sydney': '悉尼时间',
      'Australia/Melbourne': '墨尔本时间',
      'Pacific/Auckland': '奥克兰时间',
    };
    const timezoneName = timezoneNames[timezone] || timezone;
    return `${timezoneName} (UTC${offsetStr})`;
  } catch (error) {
    console.error('格式化时区显示失败:', error instanceof Error ? error.message : error);
    return timezone;
  }
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Date().toLocaleString('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
