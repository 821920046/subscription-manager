// 仪表盘布局组件
export class DashboardLayout {
  private sidebarCollapsed: boolean = false;
  private element: HTMLElement | null = null;
  private contentArea: HTMLElement | null = null;
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private currentPath: string = '/';

  render(): HTMLElement {
    this.element = document.createElement('div');
    this.element.className = 'app-layout';

    // 创建侧边栏
    const sidebar = this.createSidebar();
    
    // 创建顶部导航
    const header = this.createHeader();
    
    // 创建主内容区
    this.contentArea = document.createElement('main');
    this.contentArea.className = 'main-content';

    this.element.appendChild(sidebar);
    this.element.appendChild(header);
    this.element.appendChild(this.contentArea);

    // 移动端遮罩
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', () => this.closeMobileSidebar());
    this.element.appendChild(overlay);

    // 添加触摸手势支持
    this.initTouchGestures();

    // 监听路由变化显示/隐藏FAB
    this.initFAB();

    return this.element;
  }

  private createSidebar(): HTMLElement {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';

    // Logo区域
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    const logo = document.createElement('div');
    logo.className = 'sidebar-logo';
    logo.textContent = '📊 订阅管理';
    header.appendChild(logo);
    sidebar.appendChild(header);

    // 导航菜单
    const nav = document.createElement('nav');
    nav.className = 'sidebar-nav';

    const navItems = [
      { path: '/dashboard', icon: '📈', text: '仪表盘' },
      { path: '/subscriptions', icon: '📋', text: '订阅管理' },
      { path: '/statistics', icon: '📊', text: '统计报表' },
      { path: '/settings', icon: '⚙️', text: '设置' },
    ];

    navItems.forEach(item => {
      const button = document.createElement('button');
      button.className = 'nav-item';
      button.innerHTML = `
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-text">${item.text}</span>
      `;
      button.addEventListener('click', () => this.navigate(item.path));
      nav.appendChild(button);
    });

    sidebar.appendChild(nav);

    // 折叠按钮
    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'sidebar-toggle';
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn';
    toggleBtn.innerHTML = '◀';
    toggleBtn.addEventListener('click', () => this.toggleSidebar());
    toggleDiv.appendChild(toggleBtn);
    sidebar.appendChild(toggleDiv);

    return sidebar;
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'header';

    // 左侧：移动端菜单按钮 + 标题
    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = 'var(--space-3)';

    const mobileMenuBtn = document.createElement('button');
    mobileMenuBtn.className = 'mobile-menu-btn';
    mobileMenuBtn.innerHTML = '☰';
    mobileMenuBtn.addEventListener('click', () => this.openMobileSidebar());
    left.appendChild(mobileMenuBtn);

    const title = document.createElement('h1');
    title.className = 'header-title';
    title.textContent = '订阅管理系统';
    left.appendChild(title);

    header.appendChild(left);

    // 右侧：主题切换 + 用户信息
    const actions = document.createElement('div');
    actions.className = 'header-actions';

    const themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle';
    themeBtn.innerHTML = '🌙';
    themeBtn.addEventListener('click', () => this.toggleTheme());
    actions.appendChild(themeBtn);

    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.innerHTML = `
      <div class="user-avatar">管</div>
      <span class="user-name">管理员</span>
    `;
    actions.appendChild(userInfo);

    header.appendChild(actions);

    return header;
  }

  setContent(content: HTMLElement): void {
    if (this.contentArea) {
      this.contentArea.innerHTML = '';
      this.contentArea.appendChild(content);
    }
  }

  private navigate(path: string): void {
    document.dispatchEvent(new CustomEvent('navigate', { detail: path }));
    this.closeMobileSidebar();
  }

  private toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    if (this.element) {
      this.element.classList.toggle('collapsed', this.sidebarCollapsed);
    }
  }

  private openMobileSidebar(): void {
    const sidebar = this.element?.querySelector('.sidebar');
    const overlay = this.element?.querySelector('.sidebar-overlay');
    sidebar?.classList.add('open');
    overlay?.classList.add('open');
  }

  private closeMobileSidebar(): void {
    const sidebar = this.element?.querySelector('.sidebar');
    const overlay = this.element?.querySelector('.sidebar-overlay');
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
  }

  private toggleTheme(): void {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }

  // 初始化触摸手势
  private initTouchGestures(): void {
    // 只在移动端启用
    if (window.innerWidth > 768) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // 监听主内容区的触摸事件
    this.contentArea?.addEventListener('touchstart', (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    this.contentArea?.addEventListener('touchend', (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    }, { passive: true });

    // 监听侧边栏的滑动手势（用于关闭）
    const sidebar = this.element?.querySelector('.sidebar');
    sidebar?.addEventListener('touchstart', (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    sidebar?.addEventListener('touchend', (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      
      // 检测左滑关闭侧边栏
      const diffX = touchStartX - touchEndX;
      const diffY = Math.abs(touchStartY - touchEndY);
      
      if (diffX > 50 && diffY < 100) {
        this.closeMobileSidebar();
      }
    }, { passive: true });
  }

  // 处理滑动手势
  private handleSwipe(startX: number, startY: number, endX: number, endY: number): void {
    const diffX = endX - startX;
    const diffY = Math.abs(endY - startY);
    
    // 水平滑动距离大于50px，垂直滑动小于100px（防止误触）
    if (Math.abs(diffX) > 50 && diffY < 100) {
      // 从左边缘（<50px）右滑打开侧边栏
      if (diffX > 0 && startX < 50) {
        this.openMobileSidebar();
      }
    }
  }

  // 初始化浮动操作按钮
  private initFAB(): void {
    // 创建FAB元素
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '+';
    fab.style.display = 'none'; // 默认隐藏
    fab.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('navigate', { detail: '/subscriptions/new' }));
    });
    
    this.element?.appendChild(fab);

    // 监听路由变化
    document.addEventListener('navigate', (e: Event) => {
      const path = (e as CustomEvent).detail;
      this.currentPath = path;
      
      // 只在订阅列表页面显示FAB
      if (path === '/subscriptions' && window.innerWidth <= 768) {
        fab.style.display = 'flex';
      } else {
        fab.style.display = 'none';
      }
    });

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        fab.style.display = 'none';
      } else if (this.currentPath === '/subscriptions') {
        fab.style.display = 'flex';
      }
    });
  }
}
