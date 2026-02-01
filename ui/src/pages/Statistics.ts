// 统计报表页面
export class Statistics {
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'statistics-page';

    // 页面标题
    const header = document.createElement('div');
    header.className = 'page-header';
    header.style.marginBottom = 'var(--space-6)';
    header.innerHTML = `
      <h1 class="page-title">统计报表</h1>
      <p class="page-subtitle">分析您的订阅支出情况</p>
    `;
    container.appendChild(header);

    // 时间筛选
    const filterBar = document.createElement('div');
    filterBar.style.display = 'flex';
    filterBar.style.gap = 'var(--space-3)';
    filterBar.style.marginBottom = 'var(--space-6)';
    filterBar.innerHTML = `
      <button style="padding: var(--space-2) var(--space-4); border: none; background: var(--color-primary-600); color: white; border-radius: var(--radius-md); cursor: pointer; font-weight: var(--font-weight-medium);">本月</button>
      <button style="padding: var(--space-2) var(--space-4); border: 1px solid var(--color-neutral-300); background: white; color: var(--color-neutral-700); border-radius: var(--radius-md); cursor: pointer;">本季度</button>
      <button style="padding: var(--space-2) var(--space-4); border: 1px solid var(--color-neutral-300); background: white; color: var(--color-neutral-700); border-radius: var(--radius-md); cursor: pointer;">本年</button>
      <button style="padding: var(--space-2) var(--space-4); border: 1px solid var(--color-neutral-300); background: white; color: var(--color-neutral-700); border-radius: var(--radius-md); cursor: pointer;">自定义</button>
    `;
    container.appendChild(filterBar);

    // 统计卡片
    const statsGrid = document.createElement('div');
    statsGrid.style.display = 'grid';
    statsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    statsGrid.style.gap = 'var(--space-6)';
    statsGrid.style.marginBottom = 'var(--space-8)';

    const stats = [
      { label: '总支出', value: '¥2,580', icon: '💰', color: 'var(--color-primary-500)' },
      { label: '月均支出', value: '¥860', icon: '📊', color: 'var(--color-info-500)' },
      { label: '订阅数量', value: '12个', icon: '📦', color: 'var(--color-success-500)' },
      { label: '最贵订阅', value: '¥298', icon: '👑', color: 'var(--color-warning-500)' },
    ];

    stats.forEach(stat => {
      const card = document.createElement('div');
      card.style.backgroundColor = 'white';
      card.style.borderRadius = 'var(--radius-lg)';
      card.style.padding = 'var(--space-6)';
      card.style.boxShadow = 'var(--shadow-md)';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.gap = 'var(--space-4)';

      card.innerHTML = `
        <div style="width: 48px; height: 48px; border-radius: var(--radius-lg); background-color: ${stat.color}20; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
          ${stat.icon}
        </div>
        <div>
          <div style="font-size: var(--font-size-sm); color: var(--color-neutral-500); margin-bottom: var(--space-1);">${stat.label}</div>
          <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: var(--color-neutral-800);">${stat.value}</div>
        </div>
      `;

      statsGrid.appendChild(card);
    });

    container.appendChild(statsGrid);

    // 图表区域
    const chartsSection = document.createElement('div');
    chartsSection.style.display = 'grid';
    chartsSection.style.gridTemplateColumns = 'repeat(auto-fit, minmax(400px, 1fr))';
    chartsSection.style.gap = 'var(--space-6)';
    chartsSection.style.marginBottom = 'var(--space-8)';

    // 月度趋势图
    const trendChart = document.createElement('div');
    trendChart.style.backgroundColor = 'white';
    trendChart.style.borderRadius = 'var(--radius-lg)';
    trendChart.style.padding = 'var(--space-6)';
    trendChart.style.boxShadow = 'var(--shadow-md)';
    trendChart.innerHTML = `
      <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-neutral-800); margin-bottom: var(--space-4);">月度费用趋势</h3>
      <div style="height: 250px; display: flex; align-items: flex-end; justify-content: space-around; padding: var(--space-4); background-color: var(--color-neutral-50); border-radius: var(--radius-md);">
        ${[850, 920, 810, 950, 880, 1020].map((value, index) => `
          <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-2);">
            <div style="width: 40px; background: linear-gradient(to top, var(--color-primary-600), var(--color-primary-400)); border-radius: var(--radius-sm) var(--radius-sm) 0 0; height: ${value / 5}px; transition: height var(--transition-slow);"></div>
            <span style="font-size: var(--font-size-xs); color: var(--color-neutral-500);">${index + 1}月</span>
          </div>
        `).join('')}
      </div>
    `;
    chartsSection.appendChild(trendChart);

    // 分类占比图
    const categoryChart = document.createElement('div');
    categoryChart.style.backgroundColor = 'white';
    categoryChart.style.borderRadius = 'var(--radius-lg)';
    categoryChart.style.padding = 'var(--space-6)';
    categoryChart.style.boxShadow = 'var(--shadow-md)';
    
    const categories = [
      { name: '软件', value: 1200, color: '#4f46e5', percentage: 46.5 },
      { name: '娱乐', value: 800, color: '#22c55e', percentage: 31.0 },
      { name: '工具', value: 580, color: '#f59e0b', percentage: 22.5 },
    ];

    categoryChart.innerHTML = `
      <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-neutral-800); margin-bottom: var(--space-4);">订阅分类占比</h3>
      <div style="display: flex; gap: var(--space-6);">
        <div style="width: 150px; height: 150px; border-radius: 50%; background: conic-gradient(
          ${categories.map((cat, index) => `${cat.color} ${index === 0 ? 0 : categories.slice(0, index).reduce((sum, c) => sum + c.percentage, 0)}% ${categories.slice(0, index + 1).reduce((sum, c) => sum + c.percentage, 0)}%`).join(', ')}
        ); flex-shrink: 0;"></div>
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; gap: var(--space-3);">
          ${categories.map(cat => `
            <div style="display: flex; align-items: center; gap: var(--space-3);">
              <div style="width: 12px; height: 12px; border-radius: 2px; background-color: ${cat.color};"></div>
              <div style="flex: 1; display: flex; justify-content: space-between;">
                <span style="font-size: var(--font-size-sm); color: var(--color-neutral-700);">${cat.name}</span>
                <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-neutral-800);">¥${cat.value} (${cat.percentage}%)</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    chartsSection.appendChild(categoryChart);

    container.appendChild(chartsSection);

    // 费用明细表
    const detailSection = document.createElement('div');
    detailSection.innerHTML = `
      <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-neutral-800); margin-bottom: var(--space-4);">费用明细</h3>
    `;

    const table = document.createElement('div');
    table.style.backgroundColor = 'white';
    table.style.borderRadius = 'var(--radius-lg)';
    table.style.boxShadow = 'var(--shadow-md)';
    table.style.overflow = 'hidden';

    const details = [
      { name: 'Adobe Creative Cloud', type: '软件', period: '月', price: 298 },
      { name: 'Notion', type: '工具', period: '年', price: 128 },
      { name: 'GitHub Pro', type: '工具', period: '月', price: 50 },
      { name: 'Netflix', type: '娱乐', period: '月', price: 45 },
      { name: 'Spotify', type: '娱乐', period: '月', price: 35 },
      { name: 'iCloud+', type: '工具', period: '月', price: 68 },
    ];

    table.innerHTML = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: var(--color-neutral-50);">
            <th style="padding: var(--space-4) var(--space-6); text-align: left; font-weight: var(--font-weight-semibold); color: var(--color-neutral-700); border-bottom: 1px solid var(--color-neutral-200);">订阅名称</th>
            <th style="padding: var(--space-4) var(--space-6); text-align: left; font-weight: var(--font-weight-semibold); color: var(--color-neutral-700); border-bottom: 1px solid var(--color-neutral-200);">类型</th>
            <th style="padding: var(--space-4) var(--space-6); text-align: left; font-weight: var(--font-weight-semibold); color: var(--color-neutral-700); border-bottom: 1px solid var(--color-neutral-200);">周期</th>
            <th style="padding: var(--space-4) var(--space-6); text-align: right; font-weight: var(--font-weight-semibold); color: var(--color-neutral-700); border-bottom: 1px solid var(--color-neutral-200);">费用</th>
          </tr>
        </thead>
        <tbody>
          ${details.map((item, index) => `
            <tr style="border-bottom: ${index < details.length - 1 ? '1px solid var(--color-neutral-200)' : 'none'};">
              <td style="padding: var(--space-4) var(--space-6); color: var(--color-neutral-800); font-weight: var(--font-weight-medium);">${item.name}</td>
              <td style="padding: var(--space-4) var(--space-6);">
                <span style="padding: var(--space-1) var(--space-2); background-color: var(--color-neutral-100); border-radius: var(--radius-full); font-size: var(--font-size-xs); color: var(--color-neutral-600);">${item.type}</span>
              </td>
              <td style="padding: var(--space-4) var(--space-6); color: var(--color-neutral-600);">/${item.period}</td>
              <td style="padding: var(--space-4) var(--space-6); text-align: right; font-weight: var(--font-weight-semibold); color: var(--color-neutral-800);">¥${item.price}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    detailSection.appendChild(table);
    container.appendChild(detailSection);

    return container;
  }
}
