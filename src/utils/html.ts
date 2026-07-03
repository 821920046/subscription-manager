/**
 * HTML 安全工具
 * 用于在服务端渲染时对用户可控数据进行转义，防止 HTML 注入 / XSS。
 */

/**
 * 转义 HTML 特殊字符。
 * 适用于将不可信文本插入到 HTML 文本节点或属性值中。
 */
export function escapeHtml(input: unknown): string {
  const str = input === null || input === undefined ? '' : String(input);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 转义并把换行转换为 <br>，用于把纯文本安全地嵌入 HTML 邮件正文。
 */
export function escapeHtmlWithBreaks(input: unknown): string {
  return escapeHtml(input).replace(/\r?\n/g, '<br>');
}
