// 仪表盘页面
export class Dashboard {
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'dashboard-page';

    // 页面标题
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1 class="page-title">仪表盘</h1>
      <p class="page-subtitle">查看您的订阅概览和即将到期的提醒</p>
    `;
    container.appendChild(header);

    // 统计卡片区域
    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';
    statsGrid.style.display = 'grid';
    statsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(240px, 1fr))';
    statsGrid.style.gap = 'var(--space-6)';
    statsGrid.style.marginBottom = 'var(--space-8)';

    const stats = [
      { icon: '📦', value: '12', label: '总订阅数', trend: '+2', trendUp: true },
      { icon: '💰', value: '¥860', label: '月度费用', trend: '-5%', trendUp: false },
      { icon: '💳', value: '¥10,320', label: '年度费用', trend: '+8%', trendUp: true },
      { icon: '⚠️', value: '3', label: '即将到期', trend: '7天内', trendUp: null },
    ];

    stats.forEach(stat => {
      const card = this.createStatCard(stat);
      statsGrid.appendChild(card);
    });

    container.appendChild(statsGrid);

    // 图表占位区域
    const chartSection = document.createElement('div');
    chartSection.className = 'chart-section';
    chartSection.style.display = 'grid';
    chartSection.style.gridTemplateColumns = 'repeat(auto-fit, minmax(400px, 1fr))';
    chartSection.style.gap = 'var(--space-6)';
    chartSection.style.marginBottom = 'var(--space-8)';

    const trendChart = this.createChartPlaceholder('月度费用趋势', 'line');
    const categoryChart = this.createChartPlaceholder('订阅分类占比', 'pie');
    
    chartSection.appendChild(trendChart);
    chartSection.appendChild(categoryChart);
    container.appendChild(chartSection);

    // 即将到期列表
    const expirySection = document.createElement('div');
    expirySection.className = 'expiry-section';
    
    const expiryHeader = document.createElement('div');
    expiryHeader.style.display = 'flex';
    expiryHeader.style.justifyContent = 'space-between';
    expiryHeader.style.alignItems = 'center';
    expiryHeader.style.marginBottom = 'var(--space-4)';
    expiryHeader.innerHTML = `
      <h2 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); color: var(--color-neutral-800);">
        ⚠️ 即将到期
      </h2>
      <a href="/subscriptions" style="color: var(--color-primary-600); text-decoration: none; font-size: var(--font-size-sm);">
        查看全部 →
      </a>
    `;
    expirySection.appendChild(expiryHeader);

    const expiryList = this.createExpiryList();
    expirySection.appendChild(expiryList);
    container.appendChild(expirySection);

    return container;
  }

  private createStatCard(stat: any): HTMLElement {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.style.backgroundColor = 'white';
    card.style.borderRadius = 'var(--radius-lg)';
    card.style.padding = 'var(--space-6)';
    card.style.boxShadow = 'var(--shadow-md)';
    card.style.display = 'flex';
    card.style.alignItems = 'flex-start';
    card.style.gap = 'var(--space-4)';

    const trendColor = stat.trendUp === null ? 'var(--color-neutral-500)' : 
                       stat.trendUp ? 'var(--color-success-600)' : 'var(--color-error-600)';
    const trendIcon = stat.trendUp === null ? '' : stat.trendUp ? '↑' : '↓';

    card.innerHTML = `
      <div style="font-size: 2rem;">${stat.icon}</div>
      <div style="flex: 1;">
        <div style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-neutral-800); margin-bottom: var(--space-1);">
          ${stat.value}
        </div>
        <div style="font-size: var(--font-size-sm); color: var(--color-neutral-500); margin-bottom: var(--space-2);">
          ${stat.label}
        </div>
        <div style="font-size: var(--font-size-xs); color: ${trendColor}; font-weight: var(--font-weight-medium);">
          ${trendIcon} ${stat.trend}
        </div>
      </div>
    `;

    return card;
  }

  private createChartPlaceholder(title: string, type: string): HTMLElement {
    const container = document.createElement('div');
    container.className = 'chart-placeholder';
    container.style.backgroundColor = 'white';
    container.style.borderRadius = 'var(--radius-lg)';
    container.style.padding = 'var(--space-6)';
    container.style.boxShadow = 'var(--shadow-md)';
    container.style.height = '300px';

    container.innerHTML = `
      <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-neutral-800); margin-bottom: var(--space-4);">
        ${title}
      </h3>
      <div style="display: flex; align-items: center; justify-content: center; height: calc(100% - 40px); background-color: var(--color-neutral-100); border-radius: var(--radius-md); color: var(--color-neutral-400);">
        <div style="text-align: center;">
          <div style="font-size: 3rem; margin-bottom: var(--space-3);">📊</div>
          <div>${type === 'line' ? '趋势图' : '饼图'}占位符</div>
          <div style="font-size: var(--font-size-sm); margin-top: var(--space-2);">(集成图表库后实现)</div>
        </div>
      </div>
    `;

    return container;
  }

  private createExpiryList(): HTMLElement {
    const list = document.createElement('div');
    list.className = 'expiry-list';
    list.style.backgroundColor = 'white';
    list.style.borderRadius = 'var(--radius-lg)';
    list.style.boxShadow = 'var(--shadow-md)';
    list.style.overflow = 'hidden';

    const expiringItems = [
      { name: 'Adobe Creative Cloud', expiryDate: '2024-02-05', daysLeft: 5, price: 298 },
      { name: 'Netflix', expiryDate: '2024-02-07', daysLeft: 7, price: 45 },
      { name: 'Spotify', expiryDate: '2024-02-08', daysLeft: 8, price: 35 },
    ];

    expiringItems.forEach((item, index) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.padding = 'var(--space-4) var(--space-6)';
      row.style.borderBottom = index < expiringItems.length - 1 ? '1px solid var(--color-neutral-200)' : 'none';
      row.style.gap = 'var(--space-4)';

      const urgencyColor = item.daysLeft <= 3 ? 'var(--color-error-500)' : 'var(--color-warning-500)';

      row.innerHTML = `
        <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: ${urgencyColor}20; display: flex; align-items: center; justify-content: center; color: ${urgencyColor}; font-weight: var(--font-weight-bold);">
          ${item.daysLeft}
        </div>
        <div style="flex: 1;">
          <div style="font-weight: var(--font-weight-medium); color: var(--color-neutral-800); margin-bottom: var(--space-1);">
            ${item.name}
          </div>
          <div style="font-size: var(--font-size-sm); color: var(--color-neutral-500);">
            到期日: ${item.expiryDate}
          </div>
        </div>
        <div style="font-weight: var(--font-weight-semibold); color: var(--color-neutral-700);">
          ¥${item.price}
        </div>
        <button style="padding: var(--space-2) var(--space-3); border: 1px solid var(--color-primary-500); background: transparent; color: var(--color-primary-600); border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-sm);">
          续期
        </button>
      `;

      list.appendChild(row);
    });

    return list;
  }
}
