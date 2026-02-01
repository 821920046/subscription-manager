/**
 * 日期处理工具函数
 */

/**
 * 在指定时区格式化时间
 */
export function formatTimeInTimezone(
  date: Date,
  timezone: string,
  format: 'date' | 'datetime' | 'time' = 'datetime'
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour12: false,
  };

  if (format === 'date' || format === 'datetime') {
    options.year = 'numeric';
    options.month = '2-digit';
    options.day = '2-digit';
  }

  if (format === 'time' || format === 'datetime') {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  const formatter = new Intl.DateTimeFormat('zh-CN', options);
  const parts = formatter.formatToParts(date);
  
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  
  if (format === 'date') {
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  
  if (format === 'time') {
    return `${get('hour')}:${get('minute')}`;
  }
  
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

/**
 * 格式化时区显示
 */
export function formatTimezoneDisplay(timezone: string): string {
  const timezoneMap: Record<string, string> = {
    'Asia/Shanghai': '北京时间 (UTC+8)',
    'Asia/Hong_Kong': '香港时间 (UTC+8)',
    'Asia/Taipei': '台北时间 (UTC+8)',
    'Asia/Tokyo': '东京时间 (UTC+9)',
    'Asia/Seoul': '首尔时间 (UTC+9)',
    'Asia/Singapore': '新加坡时间 (UTC+8)',
    'Asia/Dubai': '迪拜时间 (UTC+4)',
    'Europe/London': '伦敦时间 (UTC+0/+1)',
    'Europe/Paris': '巴黎时间 (UTC+1/+2)',
    'Europe/Berlin': '柏林时间 (UTC+1/+2)',
    'America/New_York': '纽约时间 (UTC-5/-4)',
    'America/Los_Angeles': '洛杉矶时间 (UTC-8/-7)',
    'America/Chicago': '芝加哥时间 (UTC-6/-5)',
    'Australia/Sydney': '悉尼时间 (UTC+10/+11)',
    'UTC': 'UTC时间',
  };
  
  return timezoneMap[timezone] || timezone;
}

/**
 * 获取当前时间在指定时区的小时和分钟
 */
export function getCurrentTimeInTimezone(timezone: string): { hour: string; minute: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  
  return {
    hour: get('hour'),
    minute: get('minute'),
  };
}

/**
 * 计算两个日期之间的天数差
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const diff = date2.getTime() - date1.getTime();
  return Math.ceil(diff / oneDay);
}

/**
 * 添加天数到日期
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 添加月份到日期
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * 添加年份到日期
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * 格式化日期为YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 解析日期字符串
 */
export function parseDate(dateStr: string): Date | null {
  const match = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return null;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  
  return date;
}
