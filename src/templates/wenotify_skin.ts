/* eslint-disable */
// @ts-nocheck
// 注意：此文件内容需要兼容 WeNotify 平台的 JavaScript 环境，请勿使用 TypeScript 类型注解
export function renderHackerSkin(title, message, date) {
  const esc = (s = '') => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const t = esc(title);
  const d = esc(date);

  let contentHtml = '';

  try {
    const parsed = JSON.parse(message);
    const items = Array.isArray(parsed) ? parsed : [parsed];

    contentHtml = items.map((item) => {
      // Compatibility with raw strings or non-object types
      if (typeof item !== 'object' || item === null) {
        const cleanedRaw = String(item).replace(/^\s*(当前时间|时间)\s*[:：].*$/mg, '').replace(/\n{3,}/g, '\n\n').trim();
        return `<div class="info-content">${esc(cleanedRaw).replace(/\n/g, '<br>')}</div>`;
      }

      // Structured Data Rendering
      let html = '';

      // Header with Name
      if (item.name) {
        html += `<div style="font-size:1.2rem; color:#e0f7fa; margin-bottom:15px; font-weight:600; display:flex; align-items:center;">
          <span style="margin-right:8px;">📅</span> ${esc(item.name)}
        </div>`;
      }

      const row = (label, value, color, labelColor) => {
        if (!value) return '';
        const lColor = labelColor || '#888888';
        const valHtml = color ? `<span style="color:${color}">${esc(value)}</span>` : esc(value);
        return `<div style="margin-bottom:8px; line-height:1.6;">
          <span style="color:${lColor}; margin-right:4px;">${esc(label)}:</span> 
          ${valHtml}
        </div>`;
      };

      html += row('类型', item.type);
      html += row('日历类型', item.calendarType);
      html += row('到期日期', item.expiryDate, undefined, '#ff4d4f');
      html += row('农历日期', item.lunarDate);
      html += row('自动续期', item.autoRenew);
      html += row('到期状态', item.statusText, item.statusColor, '#ff4d4f');
      html += row('备注', item.notes);

      return `<div class="info-content" style="margin-bottom: 20px; border-bottom: 1px solid rgba(0,188,212,0.1); padding-bottom: 20px;">${html}</div>`;
    }).join('');

  } catch (e) {
    // Fallback for raw string message
    const cleanedRaw = String(message).replace(/^\s*(当前时间|时间)\s*[:：].*$/mg, '').replace(/\n{3,}/g, '\n\n').trim();
    contentHtml = `<div class="info-content">${esc(cleanedRaw).replace(/\n/g, '<br>')}</div>`;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI','Microsoft YaHei',sans-serif; }
    body { background: linear-gradient(135deg,#0c0c2e 0%,#1a1a3e 100%); color:#e0f7fa; min-height:100vh; display:flex; justify-content:center; align-items:center; padding:20px; overflow-x:hidden; position:relative; }
    body::before { content:''; position:absolute; top:0; left:0; width:100%; height:100%; background:
      radial-gradient(circle at 20% 30%, rgba(0,150,136,0.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(0,188,212,0.15) 0%, transparent 50%); z-index:-1; }
    .container { max-width:800px; width:100%; background:rgba(18,18,40,0.85); backdrop-filter:blur(10px); border-radius:16px; padding:40px;
      box-shadow:0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,150,136,0.2), 0 0 20px rgba(0,188,212,0.3); position:relative; overflow:hidden; transition:transform .3s ease, box-shadow .3s ease; }
    .container:hover { transform: translateY(-5px); box-shadow:0 15px 35px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,150,136,0.4), 0 0 30px rgba(0,188,212,0.5); }
    .container::before { content:''; position:absolute; top:0; left:0; width:100%; height:4px; background:linear-gradient(90deg,#00bcd4,#009688); }
    .title { text-align:center; margin-bottom:40px; font-size:2.2rem; font-weight:300; letter-spacing:2px; color:#00bcd4; position:relative; padding-bottom:15px; }
    .title::after { content:''; position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:100px; height:2px; background:linear-gradient(90deg,transparent,#00bcd4,transparent); }
    .info-card { background:rgba(30,30,60,0.7); border-radius:12px; padding:25px; margin-bottom:25px; border-left:4px solid #00bcd4; transition:all .3s ease; box-shadow:0 5px 15px rgba(0,0,0,0.2); }
    .info-card:hover { transform:translateX(5px); background:rgba(40,40,70,0.8); box-shadow:0 8px 20px rgba(0,0,0,0.3); }
    .info-label { font-size:1.1rem; color:#80deea; margin-bottom:10px; display:flex; align-items:center; }
    .dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#00bcd4; margin-right:10px; }
    .info-content { font-size:1.05rem; color:#e0f7fa; font-weight:500; word-break:break-word; line-height:1.7; }
    .info-content:last-child { border-bottom: none !important; margin-bottom: 0 !important; padding-bottom: 0 !important; }
    .pulse { animation:pulse 2s infinite; }
    @keyframes pulse { 0% { box-shadow:0 0 0 0 rgba(0,188,212,0.4); } 70% { box-shadow:0 0 0 10px rgba(0,188,212,0); } 100% { box-shadow:0 0 0 0 rgba(0,188,212,0); } }
    .info-time { margin-top:10px; font-size:.95rem; color:#80deea; }
    .footer { margin-top:10px; font-size:.9rem; color:#80deea; }
  </style>
</head>
<body>
  <div class="container pulse">
    <div class="title">${t}</div>
    <div class="info-card">
      <div class="info-label"><span class="dot"></span>消息内容</div>
      ${contentHtml}
      <div class="info-time">时间：${d}</div>
    </div>
    <div class="footer">WeNotify Edge</div>
  </div>
</body>
</html>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let title = url.searchParams.get('title') || '消息推送';
    let message = url.searchParams.get('message') || '无告警信息';
    let date = url.searchParams.get('date') || '';

    if (request.method === 'POST') {
      try {
        const body = await request.json();
        if (body.title) title = body.title;
        // Support both 'content' (from subscription-manager) and 'message'
        if (body.content) message = body.content;
        if (body.message) message = body.message;
        if (body.date) date = body.date;
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    const html = renderHackerSkin(title, message, date);
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
