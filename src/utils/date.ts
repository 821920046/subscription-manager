export function getCurrentTimeInTimezone(_timezone = 'UTC'): Date {
  try {
    // 直接返回当前时间，时区转换在后续计算中处理
    // 这样可以避免时区信息丢失的问题
    return new Date();
  } catch (error: any) {
    console.error(`时区转换错误: ${error.message}`);
    // 如果时区无效，返回UTC时间
    return new Date();
  }
}

export function getTimestampInTimezone(timezone = 'UTC'): number {
  return getCurrentTimeInTimezone(timezone).getTime();
}

export function convertUTCToTimezone(utcTime: string | number | Date, _timezone = 'UTC'): Date {
  try {
    // 直接返回原始时间，时区转换在后续计算中处理
    // 这样可以避免时区信息丢失的问题
    return new Date(utcTime);
  } catch (error: any) {
    console.error(`时区转换错误: ${error.message}`);
    return new Date(utcTime);
  }
}

export function calculateExpirationTime(expirationMinutes: number, timezone = 'UTC'): Date {
  const currentTime = getCurrentTimeInTimezone(timezone);
  const expirationTime = new Date(currentTime.getTime() + (expirationMinutes * 60 * 1000));
  return expirationTime;
}

export function isExpired(targetTime: string | number | Date, timezone = 'UTC'): boolean {
  const currentTime = getCurrentTimeInTimezone(timezone);
  const target = new Date(targetTime);
  return currentTime > target;
}

export function formatTimeInTimezone(time: string | number | Date, timezone = 'UTC', format = 'full'): string {
  try {
    const date = new Date(time);

    if (format === 'date') {
      return date.toLocaleDateString('zh-CN', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } else if (format === 'datetime') {
      return date.toLocaleString('zh-CN', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } else {
      // full format
      return date.toLocaleString('zh-CN', {
        timeZone: timezone
      });
    }
  } catch (error: any) {
    console.error(`时间格式化错误: ${error.message}`);
    return new Date(time).toISOString();
  }
}

export function getTimezoneOffset(timezone = 'UTC'): number {
  try {
    // 使用更准确的时区偏移计算方法
    const now = new Date();
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const parts = dtf.formatToParts(now);
    const get = (type: string) => Number(parts.find(x => x.type === type)?.value);
    const target = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    const utc = now.getTime();
    return Math.round((target - utc) / (1000 * 60 * 60));
  } catch (error: any) {
    console.error(`获取时区偏移量错误: ${error.message}`);
    return 0;
  }
}

export function formatTimezoneDisplay(timezone = 'UTC'): string {
  try {
    const offset = getTimezoneOffset(timezone);
    const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;

    // 时区中文名称映射
    const timezoneNames: { [key: string]: string } = {
      'UTC': '世界标准时间',
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
      'Pacific/Auckland': '奥克兰时间'
    };

    const timezoneName = timezoneNames[timezone] || timezone;
    return `${timezoneName} (UTC${offsetStr})`;
  } catch (error) {
    console.error('格式化时区显示失败:', error);
    return timezone;
  }
}

export function isValidTimezone(timezone: string): boolean {
  try {
    // 尝试使用该时区格式化时间
    new Date().toLocaleString('en-US', { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}
