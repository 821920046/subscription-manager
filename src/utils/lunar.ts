/**
 * 农历转换工具
 * 基于传统农历算法实现
 */

interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
  fullStr: string;
}

// 农历数据表（1900-2100年）
// 每个元素为16进制，表示该年的农历信息
// 高12位表示每个月的大小月（1=大月30天，0=小月29天）
// 低4位表示闰月月份，0表示无闰月
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
];

// 天干
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
// 地支
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 生肖
const ZODIAC_ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
// 农历月份名称
const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
// 农历日期名称
const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

/**
 * 获取农历年份的天干地支
 */
function getLunarYearName(year: number): string {
  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;
  return HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex];
}

/**
 * 获取生肖
 */
function getZodiacAnimal(year: number): string {
  return ZODIAC_ANIMALS[(year - 4) % 12];
}

/**
 * 判断农历年是否有闰月
 */
function hasLeapMonth(lunarInfo: number): boolean {
  return (lunarInfo & 0x0f) !== 0;
}

/**
 * 获取闰月月份
 */
function getLeapMonth(lunarInfo: number): number {
  return lunarInfo & 0x0f;
}

/**
 * 获取农历月天数
 */
function getLunarMonthDays(lunarInfo: number, month: number, isLeap: boolean): number {
  if (isLeap) {
    // 闰月天数在16进制数据的第16位
    return (lunarInfo & 0x10000) ? 30 : 29;
  }
  // 普通月份天数
  return (lunarInfo & (0x10000 >> month)) ? 30 : 29;
}

/**
 * 获取农历年总天数
 */
function getLunarYearDays(year: number): number {
  const lunarInfo = LUNAR_INFO[year - 1900];
  let days = 0;
  
  for (let i = 0; i < 12; i++) {
    days += getLunarMonthDays(lunarInfo, i, false);
  }
  
  if (hasLeapMonth(lunarInfo)) {
    days += getLunarMonthDays(lunarInfo, 0, true);
  }
  
  return days;
}

/**
 * 公历转农历
 */
export function solar2lunar(year: number, month: number, day: number): LunarDate | null {
  // 验证输入
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  
  // 计算从1900年1月31日（农历1900年正月初一）到目标日期的天数
  const baseDate = new Date(1900, 0, 31);
  const targetDate = new Date(year, month - 1, day);
  let offset = Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000);
  
  // 计算农历年份
  let lunarYear = 1900;
  while (offset > 0) {
    const yearDays = getLunarYearDays(lunarYear);
    if (offset < yearDays) break;
    offset -= yearDays;
    lunarYear++;
  }
  
  // 计算农历月份和日期
  const lunarInfo = LUNAR_INFO[lunarYear - 1900];
  let lunarMonth = 0;
  let isLeap = false;
  
  // 检查是否有闰月
  const leapMonth = getLeapMonth(lunarInfo);
  
  for (let i = 0; i < 12; i++) {
    const monthDays = getLunarMonthDays(lunarInfo, i, false);
    
    if (offset < monthDays) {
      lunarMonth = i;
      break;
    }
    offset -= monthDays;
    
    // 检查是否是闰月
    if (leapMonth === i + 1) {
      const leapDays = getLunarMonthDays(lunarInfo, 0, true);
      if (offset < leapDays) {
        lunarMonth = i;
        isLeap = true;
        break;
      }
      offset -= leapDays;
    }
  }
  
  // 如果遍历完12个月还没找到，说明在闰月之后
  if (lunarMonth === 0 && offset > 0 && leapMonth > 0) {
    for (let i = 0; i < 12; i++) {
      const monthDays = getLunarMonthDays(lunarInfo, i, false);
      if (offset < monthDays) {
        lunarMonth = i;
        break;
      }
      offset -= monthDays;
    }
  }
  
  const lunarDay = offset;
  
  // 构建完整字符串
  const yearName = getLunarYearName(lunarYear);
  const zodiac = getZodiacAnimal(lunarYear);
  const monthStr = isLeap ? `闰${LUNAR_MONTHS[lunarMonth]}` : LUNAR_MONTHS[lunarMonth];
  const dayStr = LUNAR_DAYS[lunarDay];
  
  return {
    year: lunarYear,
    month: lunarMonth + 1,
    day: lunarDay + 1,
    isLeap,
    fullStr: `${yearName}年 (${zodiac}年) ${monthStr}月${dayStr}`,
  };
}

/**
 * 农历转公历
 */
export function lunar2solar(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  isLeap: boolean = false
): Date | null {
  // 验证输入
  if (lunarYear < 1900 || lunarYear > 2100) return null;
  if (lunarMonth < 1 || lunarMonth > 12) return null;
  if (lunarDay < 1 || lunarDay > 30) return null;
  
  const lunarInfo = LUNAR_INFO[lunarYear - 1900];
  const leapMonth = getLeapMonth(lunarInfo);
  
  // 验证闰月
  if (isLeap && leapMonth !== lunarMonth) return null;
  
  // 计算从1900年1月31日到目标农历日期的天数
  let offset = 0;
  
  for (let year = 1900; year < lunarYear; year++) {
    offset += getLunarYearDays(year);
  }
  
  for (let month = 0; month < lunarMonth - 1; month++) {
    offset += getLunarMonthDays(lunarInfo, month, false);
    
    if (leapMonth === month + 1) {
      offset += getLunarMonthDays(lunarInfo, 0, true);
    }
  }
  
  // 如果是闰月
  if (isLeap) {
    offset += getLunarMonthDays(lunarInfo, lunarMonth - 1, false);
  }
  
  offset += lunarDay - 1;
  
  // 计算公历日期
  const baseDate = new Date(1900, 0, 31);
  const solarDate = new Date(baseDate.getTime() + offset * 86400000);
  
  return solarDate;
}

/**
 * 获取下一个农历周期的公历日期
 */
export function getNextLunarCycle(
  currentSolarDate: Date,
  periodValue: number,
  periodUnit: 'day' | 'month' | 'year'
): Date {
  const year = currentSolarDate.getFullYear();
  const month = currentSolarDate.getMonth() + 1;
  const day = currentSolarDate.getDate();
  
  // 先转换为农历
  const lunar = solar2lunar(year, month, day);
  if (!lunar) return currentSolarDate;
  
  // 计算下一个农历日期
  let nextLunarYear = lunar.year;
  let nextLunarMonth = lunar.month;
  let nextLunarDay = lunar.day;
  let nextIsLeap = lunar.isLeap;
  
  switch (periodUnit) {
    case 'day':
      // 农历按天计算比较复杂，这里简化处理
      nextLunarDay += periodValue;
      break;
    case 'month':
      nextLunarMonth += periodValue;
      break;
    case 'year':
      nextLunarYear += periodValue;
      break;
  }
  
  // 转换回公历
  const nextSolar = lunar2solar(nextLunarYear, nextLunarMonth, nextLunarDay, nextIsLeap);
  return nextSolar || currentSolarDate;
}

// 导出农历工具对象
export const lunarCalendar = {
  solar2lunar,
  lunar2solar,
  getNextLunarCycle,
};
