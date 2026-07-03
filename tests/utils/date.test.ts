/**
 * 时区日期工具测试（验证时区感知的天数计算）
 */
import { describe, it, expect } from 'vitest';
import { dayDiffInTimezone } from '../../src/utils/date';

describe('dayDiffInTimezone', () => {
  it('应在不同时区下给出不同的自然日差', () => {
    const now = '2026-01-01T20:00:00Z'; // UTC: 1日 ; Asia/Shanghai: 2日 04:00
    const expiry = '2026-01-02T00:00:00Z'; // UTC: 2日 ; Asia/Shanghai: 2日 08:00
    expect(dayDiffInTimezone(expiry, now, 'Asia/Shanghai')).toBe(0);
    expect(dayDiffInTimezone(expiry, now, 'UTC')).toBe(1);
  });

  it('当天到期在配置时区下应为 0', () => {
    expect(dayDiffInTimezone('2026-07-03T15:00:00Z', '2026-07-03T09:17:00Z', 'Asia/Shanghai')).toBe(0);
  });

  it('已过期应为负数', () => {
    expect(dayDiffInTimezone('2026-06-30T00:00:00Z', '2026-07-03T00:00:00Z', 'UTC')).toBe(-3);
  });

  it('无效时区应回退而不抛错', () => {
    expect(typeof dayDiffInTimezone('2026-07-10T00:00:00Z', '2026-07-03T00:00:00Z', 'Not/AZone')).toBe('number');
  });
});
