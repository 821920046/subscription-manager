/**
 * HTML 转义工具测试（防 XSS 回归）
 */
import { describe, it, expect } from 'vitest';
import { escapeHtml, escapeHtmlWithBreaks } from '../../src/utils/html';

describe('escapeHtml', () => {
  it('应该中和 XSS payload', () => {
    const out = escapeHtml('<img src=x onerror=alert(1)>');
    expect(out).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(out).not.toContain('<');
  });

  it('应该转义所有敏感字符', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('应该安全处理 null / undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('escapeHtmlWithBreaks 应该转换换行且先转义', () => {
    expect(escapeHtmlWithBreaks('a\n<b>')).toBe('a<br>&lt;b&gt;');
  });
});
