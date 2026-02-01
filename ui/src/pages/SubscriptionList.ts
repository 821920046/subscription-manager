// 订阅列表页面
export class SubscriptionList {
  private viewMode: 'card' | 'table' = 'card';

  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'subscription-list-page';

    // 页面标题和工具栏
    const header = document.createElement('div');
    header.className = 'page-header';
    header.style.marginBottom = 'var(--space-6)';

    const titleSection = document.createElement('div');
    titleSection.innerHTML = `
      <h1 class="page-title">订阅管理</h1>
      <p class="page-subtitle">管理您的所有订阅服务</p>
    `;
    header.appendChild(titleSection);

    // 工具栏
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.style.display = 'flex';
    toolbar.style.justifyContent = 'space-between';
    toolbar.style.alignItems = 'center';
    toolbar.style.marginTop = 'var(--space-4)';
    toolbar.style.flexWrap = 'wrap';
    toolbar.style.gap = 'var(--space-3)';

    // 左侧：筛选器
    const filters = document.createElement('div');
    filters.className = 'filters';
    filters.style.display = 'flex';
    filters.style.gap = 'var(--space-3)';
    filters.innerHTML = `
      <select style="padding: var(--space-2) var(--space-3); border: 1px solid var(--color-neutral-300); border-radius: var(--radius-md); background: white;">
        <option>全部状态</option>
        <option>生效中</option>
        <option>已过期</option>
      </select>
      <select style="padding: var(--space-2) var(--space-3); border: 1px solid var(--color-neutral-300); border-radius: var(--radius-md); background: white;">
        <option>全部类型</option>
        <option>软件</option>
        <option>娱乐</option>
        <option>工具</option>
      </select>
    `;
    toolbar.appendChild(filters);

    // 右侧：视图切换 + 新增按钮
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.style.display = 'flex';
    actions.style.gap = 'var(--space-3)';
    actions.style.alignItems = 'center';

    const viewToggle = document.createElement('div');
    viewToggle.className = 'view-toggle';
    viewToggle.style.display = 'flex';
    viewToggle.style.border = '1px solid var(--color-neutral-300)';
    viewToggle.style.borderRadius = 'var(--radius-md)';
    viewToggle.style.overflow = 'hidden';
    viewToggle.innerHTML = `
      <button id="view-card" style="padding: var(--space-2) var(--space-3); border: none; background: var(--color-primary-500); color: white; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;">⊞ 卡片</button>
      <button id="view-table" style="padding: var(--space-2) var(--space-3); border: none; background: white; color: var(--color-neutral-600); cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;">☰ 列表</button>
    `;
    actions.appendChild(viewToggle);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.style.padding = 'var(--space-3) var(--space-4)';
    addBtn.style.backgroundColor = 'var(--color-primary-600)';
    addBtn.style.color = 'white';
    addBtn.style.border = 'none';
    addBtn.style.borderRadius = 'var(--radius-md)';
    addBtn.style.cursor = 'pointer';
    addBtn.style.fontWeight = 'var(--font-weight-medium)';
    addBtn.innerHTML = '+ 新增订阅';
    addBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('navigate', { detail: '/subscriptions/new' }));
    });
    actions.appendChild(addBtn);

    toolbar.appendChild(actions);
    header.appendChild(toolbar);
    container.appendChild(header);

    // 内容区域
    const content = document.createElement('div');
    content.id = 'subscription-content';
    
    if (this.viewMode === 'card') {
      content.appendChild(this.createCardView());
    } else {
      content.appendChild(this.createTableView());
    }
    
    container.appendChild(content);

    // 绑定视图切换事件
    setTimeout(() => {
      const cardBtn = container.querySelector('#view-card');
      const tableBtn = container.querySelector('#view-table');
      
      cardBtn?.addEventListener('click', () => {
        this.viewMode = 'card';
        this.updateView(content);
        cardBtn.setAttribute('style', 'padding: var(--space-2) var(--space-3); border: none; background: var(--color-primary-500); color: white; cursor: pointer;');
        tableBtn?.setAttribute('style', 'padding: var(--space-2) var(--space-3); border: none; background: white; color: var(--color-neutral-600); cursor: pointer;');
      });
      
      tableBtn?.addEventListener('click', () => {
        this.viewMode = 'table';
        this.updateView(content);
        tableBtn.setAttribute('style', 'padding: var(--space-2) var(--space-3); border: none; background: var(--color-primary-500); color: white; cursor: pointer;');
        cardBtn?.setAttribute('style', 'padding: var(--space-2) var(--space-3); border: none; background: white; color: var(--color-neutral-600); cursor: pointer;');
      });
    }, 0);

    return container;
  }

  private updateView(content: HTMLElement): void {
    content.innerHTML = '';
    if (this.viewMode === 'card') {
      content.appendChild(this.createCardView());
    } else {
      content.appendChild(this.createTableView());
    }
  }

  private createCardView(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'subscription-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
    grid.style.gap = 'var(--space-6)';

    const subscriptions = [
      { id: '1', name: 'Adobe Creative Cloud', type: '软件', price: 298, period: '月', expiryDate: '2024-02-05', isActive: true, autoRenew: true },
      { id: '2', name: 'Netflix', type: '娱乐', price: 45, period: '月', expiryDate: '2024-02-07', isActive: true, autoRenew: false },
      { id: '3', name: 'Spotify', type: '娱乐', price: 35, period: '月', expiryDate: '2024-02-08', isActive: true, autoRenew: true },
      { id: '4', name: 'Notion', type: '工具', price: 128, period: '年', expiryDate: '2024-06-15', isActive: true, autoRenew: true },
      { id: '5', name: 'GitHub Pro', type: '工具', price: 50, period: '月', expiryDate: '2024-03-20', isActive: true, autoRenew: false },
      { id: '6', name: 'iCloud+', type: '工具', price: 68, period: '月', expiryDate: '2024-12-31', isActive: true, autoRenew: true },
    ];

    subscriptions.forEach(sub => {
      const card = this.createSubscriptionCard(sub);
      grid.appendChild(card);
    });

    return grid;
  }

  private createSubscriptionCard(sub: any): HTMLElement {
    const card = document.createElement('div');
    card.className = 'subscription-card';
    card.style.backgroundColor = 'white';
    card.style.borderRadius = 'var(--radius-lg)';
    card.style.padding = 'var(--space-6)';
    card.style.boxShadow = 'var(--shadow-md)';
    card.style.transition = 'box-shadow var(--transition-fast)';
    
    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = 'var(--shadow-lg)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = 'var(--shadow-md)';
    });

    const daysLeft = Math.ceil((new Date(sub.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgencyColor = daysLeft <= 7 ? 'var(--color-error-500)' : 
                         daysLeft <= 30 ? 'var(--color-warning-500)' : 'var(--color-success-500)';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4);">
        <div>
          <span style="display: inline-block; padding: var(--space-1) var(--space-2); background-color: var(--color-neutral-100); border-radius: var(--radius-full); font-size: var(--font-size-xs); color: var(--color-neutral-600); margin-bottom: var(--space-2);">
            ${sub.type}
          </span>
          <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-neutral-800);">
            ${sub.name}
          </h3>
        </div>
        <div style="display: flex; gap: var(--space-2);">
          ${sub.autoRenew ? '<span title="自动续费">🔄</span>' : ''}
          <span style="color: ${urgencyColor}; font-weight: var(--font-weight-medium);">${daysLeft}天</span>
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
        <div>
          <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: var(--color-neutral-800);">
            ¥${sub.price}
          </div>
          <div style="font-size: var(--font-size-sm); color: var(--color-neutral-500);">
            /${sub.period}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: var(--font-size-sm); color: var(--color-neutral-500);">到期日</div>
          <div style="font-weight: var(--font-weight-medium); color: var(--color-neutral-700);">${sub.expiryDate}</div>
        </div>
      </div>
      
      <div style="display: flex; gap: var(--space-2);">
        <button style="flex: 1; padding: var(--space-2) var(--space-3); border: 1px solid var(--color-neutral-300); background: white; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-sm); color: var(--color-neutral-700);">
          编辑
        </button>
        <button style="flex: 1; padding: var(--space-2) var(--space-3); border: none; background: var(--color-error-50); border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-sm); color: var(--color-error-600);">
          删除
        </button>
      </div>
    `;

    return card;
  }

  private createTableView(): HTMLElement {
    const table = document.createElement('div');
    table.className = 'subscription-table';
    table.style.backgroundColor = 'white';
    table.style.borderRadius = 'var(--radius-lg)';
    table.style.boxShadow = 'var(--shadow-md)';
    table.style.overflow = 'hidden';

    const subscriptions = [
      { id: '1', name: 'Adobe Creative Cloud', type: '软件', price: 298, period: '月', expiryDate: '2024-02-05', isActive: true, autoRenew: true },
      { id: '2', name: 'Netflix', type: '娱乐', price: 45, period: '月', expiryDate: '2024-02-07', isActive: true, autoRenew: false },
      { id: '3', name: 'Spotify', type: '娱乐', price: 35, period: '月', expiryDate: '2024-02-08', isActive: true, autoRenew: true },
      { id: '4', name: 'Notion', type: '工具', price: 128, period: '年', expiryDate: '2024-06-15', isActive: true, autoRenew: true },
      { id: '5', name: 'GitHub Pro', type: '工具', price: 50, period: '月', expiryDate: '2024-03-20', isActive: true, autoRenew: false },
      { id: '6', name: 'iCloud+', type: '工具', price: 68, period: '月', expiryDate: '2024-12-31', isActive: true, autoRenew: true },
    ];

    table.innerHTML = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: var(--color-neutral-50);">
            <th style="padding: var(--space-4) var(--space-6); text-align: left; font-weight: var(--font-weight-semibold); color: var(--color-neutral-700); border-bottom: 1px solid var(--color-neutral-200);">订阅名称</th>
            <th style="padding: var(--space-4) var(--space-6); text-align: left; font-weight: var(--font-weight-semibold); color: var(--color-neutral-700); border-bottom: 1px solid var(--color-neutral-200);">类型</th>
            <th style="padding: var(--space-4) var(--space-6); text-align: right; font-weight: var(--font-weight-semibold); color: var(--color-neutral-700); border-bottom: 1px solid var(--color-neutral-200);">价格</th>
            <th style="padding: var(--space-4) var(--space-6); text-align: left; font-weight: var(--font-weight-semibold); color: var(--color-neutral-700); border-bottom: 1px solid var(--color-neutral-200);">到期日</th>
            <th style="padding: var(--space-4) var(--space-6); text-align: center; font-weight: var(--font-weight-semibold); color: var(--color-neutral-700); border-bottom: 1px solid var(--color-neutral-200);">状态</th>
            <th style="padding: var(--space-4) var(--space-6); text-align: center; font-weight: var(--font-weight-semibold); color: var(--color-neutral-700); border-bottom: 1px solid var(--color-neutral-200);">操作</th>
          </tr>
        </thead>
        <tbody>
          ${subscriptions.map((sub, index) => `
            <tr style="border-bottom: ${index < subscriptions.length - 1 ? '1px solid var(--color-neutral-200)' : 'none'};">
              <td style="padding: var(--space-4) var(--space-6);">
                <div style="font-weight: var(--font-weight-medium); color: var(--color-neutral-800);">${sub.name}</div>
                ${sub.autoRenew ? '<span style="font-size: var(--font-size-xs); color: var(--color-success-600);">🔄 自动续费</span>' : ''}
              </td>
              <td style="padding: var(--space-4) var(--space-6);">
                <span style="padding: var(--space-1) var(--space-2); background-color: var(--color-neutral-100); border-radius: var(--radius-full); font-size: var(--font-size-xs); color: var(--color-neutral-600);">
                  ${sub.type}
                </span>
              </td>
              <td style="padding: var(--space-4) var(--space-6); text-align: right; font-weight: var(--font-weight-semibold); color: var(--color-neutral-800);">
                ¥${sub.price}/${sub.period}
              </td>
              <td style="padding: var(--space-4) var(--space-6); color: var(--color-neutral-700);">${sub.expiryDate}</td>
              <td style="padding: var(--space-4) var(--space-6); text-align: center;">
                <span style="padding: var(--space-1) var(--space-2); background-color: var(--color-success-50); color: var(--color-success-700); border-radius: var(--radius-full); font-size: var(--font-size-xs);">
                  生效中
                </span>
              </td>
              <td style="padding: var(--space-4) var(--space-6); text-align: center;">
                <button style="padding: var(--space-1) var(--space-2); border: none; background: transparent; cursor: pointer; color: var(--color-primary-600);">编辑</button>
                <button style="padding: var(--space-1) var(--space-2); border: none; background: transparent; cursor: pointer; color: var(--color-error-600);">删除</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    return table;
  }
}
