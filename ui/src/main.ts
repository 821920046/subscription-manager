// 主入口文件
import { DashboardLayout } from './layouts/DashboardLayout.js';
import { Dashboard } from './pages/Dashboard.js';
import { SubscriptionList } from './pages/SubscriptionList.js';
import { SubscriptionEdit } from './pages/SubscriptionEdit.js';
import { Statistics } from './pages/Statistics.js';
import { Settings } from './pages/Settings.js';

// 路由配置
const routes = {
  '/': Dashboard,
  '/dashboard': Dashboard,
  '/subscriptions': SubscriptionList,
  '/subscriptions/new': SubscriptionEdit,
  '/subscriptions/edit': SubscriptionEdit,
  '/statistics': Statistics,
  '/settings': Settings,
};

// 应用类
class App {
  private layout: DashboardLayout;
  private currentPage: string = '/';

  constructor() {
    this.layout = new DashboardLayout();
    this.init();
  }

  private init(): void {
    // 初始化主题
    this.initTheme();
    
    // 渲染布局
    const app = document.getElementById('app');
    if (app) {
      app.appendChild(this.layout.render());
    }

    // 初始化路由
    this.initRouter();
    
    // 渲染初始页面
    this.renderPage(window.location.pathname);
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  private initRouter(): void {
    // 处理导航点击
    document.addEventListener('navigate', (e: Event) => {
      const path = (e as CustomEvent).detail;
      this.navigate(path);
    });

    // 处理浏览器前进后退
    window.addEventListener('popstate', () => {
      this.renderPage(window.location.pathname);
    });
  }

  private navigate(path: string): void {
    window.history.pushState({}, '', path);
    this.renderPage(path);
  }

  private renderPage(path: string): void {
    const PageComponent = routes[path] || Dashboard;
    const page = new PageComponent();
    this.layout.setContent(page.render());
    this.currentPage = path;
  }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
