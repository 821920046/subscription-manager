// 设置页面
export class Settings {
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'settings-page';

    // 页面标题
    const header = document.createElement('div');
    header.className = 'page-header';
    header.style.marginBottom = 'var(--space-6)';
    header.innerHTML = `
      <h1 class="page-title">系统设置</h1>
      <p class="page-subtitle">配置通知渠道和系统偏好</p>
    `;
    container.appendChild(header);

    // 系统设置组
    const systemSection = this.createSettingsSection('系统设置');
    systemSection.appendChild(this.createSelectField('时区', 'timezone', [
      { value: 'Asia/Shanghai', label: '亚洲/上海 (UTC+8)' },
      { value: 'Asia/Hong_Kong', label: '亚洲/香港 (UTC+8)' },
      { value: 'Asia/Tokyo', label: '亚洲/东京 (UTC+9)' },
      { value: 'America/New_York', label: '美洲/纽约 (UTC-5)' },
    ]));
    systemSection.appendChild(this.createToggleField('全局显示农历', 'showLunarGlobal', true));
    systemSection.appendChild(this.createTextField('默认提醒时间', 'reminderTimes', '08:00', '多个时间用逗号分隔，如：08:00,20:00'));
    container.appendChild(systemSection);

    // 通知渠道组
    const notifierSection = this.createSettingsSection('通知渠道');
    
    const notifiers = [
      { id: 'telegram', name: 'Telegram', icon: '📱' },
      { id: 'email', name: 'Email', icon: '📧' },
      { id: 'wechatBot', name: '企业微信机器人', icon: '💬' },
      { id: 'wechatOA', name: '微信公众号', icon: '📢' },
      { id: 'bark', name: 'Bark', icon: '🔔' },
      { id: 'webhook', name: 'Webhook', icon: '🔗' },
    ];

    notifiers.forEach(notifier => {
      notifierSection.appendChild(this.createNotifierToggle(notifier));
    });

    container.appendChild(notifierSection);

    // Telegram配置（默认展开示例）
    const telegramConfig = this.createSettingsSection('Telegram 配置');
    telegramConfig.appendChild(this.createTextField('Bot Token', 'telegramBotToken', '', '从 @BotFather 获取'));
    telegramConfig.appendChild(this.createTextField('Chat ID', 'telegramChatId', '', '目标聊天ID'));
    container.appendChild(telegramConfig);

    // 操作按钮
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = 'var(--space-4)';
    actions.style.marginTop = 'var(--space-8)';

    const saveBtn = document.createElement('button');
    saveBtn.style.padding = 'var(--space-3) var(--space-6)';
    saveBtn.style.backgroundColor = 'var(--color-primary-600)';
    saveBtn.style.color = 'white';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = 'var(--radius-md)';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.fontWeight = 'var(--font-weight-medium)';
    saveBtn.textContent = '保存设置';
    saveBtn.addEventListener('click', () => {
      alert('设置已保存');
    });

    const resetBtn = document.createElement('button');
    resetBtn.style.padding = 'var(--space-3) var(--space-6)';
    resetBtn.style.backgroundColor = 'white';
    resetBtn.style.color = 'var(--color-neutral-700)';
    resetBtn.style.border = '1px solid var(--color-neutral-300)';
    resetBtn.style.borderRadius = 'var(--radius-md)';
    resetBtn.style.cursor = 'pointer';
    resetBtn.textContent = '重置';

    actions.appendChild(saveBtn);
    actions.appendChild(resetBtn);
    container.appendChild(actions);

    return container;
  }

  private createSettingsSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.style.backgroundColor = 'white';
    section.style.borderRadius = 'var(--radius-lg)';
    section.style.padding = 'var(--space-6)';
    section.style.boxShadow = 'var(--shadow-md)';
    section.style.marginBottom = 'var(--space-6)';

    const heading = document.createElement('h3');
    heading.style.fontSize = 'var(--font-size-lg)';
    heading.style.fontWeight = 'var(--font-weight-semibold)';
    heading.style.color = 'var(--color-neutral-800)';
    heading.style.marginBottom = 'var(--space-4)';
    heading.style.paddingBottom = 'var(--space-3)';
    heading.style.borderBottom = '1px solid var(--color-neutral-200)';
    heading.textContent = title;
    section.appendChild(heading);

    return section;
  }

  private createSelectField(label: string, name: string, options: { value: string; label: string }[]): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = 'var(--space-4)';

    const labelEl = document.createElement('label');
    labelEl.style.display = 'block';
    labelEl.style.fontSize = 'var(--font-size-sm)';
    labelEl.style.fontWeight = 'var(--font-weight-medium)';
    labelEl.style.color = 'var(--color-neutral-700)';
    labelEl.style.marginBottom = 'var(--space-2)';
    labelEl.textContent = label;
    wrapper.appendChild(labelEl);

    const select = document.createElement('select');
    select.name = name;
    select.style.width = '100%';
    select.style.maxWidth = '300px';
    select.style.padding = 'var(--space-3)';
    select.style.border = '1px solid var(--color-neutral-300)';
    select.style.borderRadius = 'var(--radius-md)';
    select.style.fontSize = 'var(--font-size-base)';
    select.style.backgroundColor = 'white';
    select.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');

    wrapper.appendChild(select);
    return wrapper;
  }

  private createTextField(label: string, name: string, value: string, placeholder: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = 'var(--space-4)';

    const labelEl = document.createElement('label');
    labelEl.style.display = 'block';
    labelEl.style.fontSize = 'var(--font-size-sm)';
    labelEl.style.fontWeight = 'var(--font-weight-medium)';
    labelEl.style.color = 'var(--color-neutral-700)';
    labelEl.style.marginBottom = 'var(--space-2)';
    labelEl.textContent = label;
    wrapper.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'text';
    input.name = name;
    input.value = value;
    input.placeholder = placeholder;
    input.style.width = '100%';
    input.style.maxWidth = '400px';
    input.style.padding = 'var(--space-3)';
    input.style.border = '1px solid var(--color-neutral-300)';
    input.style.borderRadius = 'var(--radius-md)';
    input.style.fontSize = 'var(--font-size-base)';

    wrapper.appendChild(input);
    return wrapper;
  }

  private createToggleField(label: string, name: string, checked: boolean): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = 'var(--space-4)';

    const labelEl = document.createElement('label');
    labelEl.style.display = 'flex';
    labelEl.style.alignItems = 'center';
    labelEl.style.gap = 'var(--space-3)';
    labelEl.style.cursor = 'pointer';

    const toggle = document.createElement('div');
    toggle.className = 'toggle-switch';
    toggle.style.width = '44px';
    toggle.style.height = '24px';
    toggle.style.backgroundColor = checked ? 'var(--color-primary-600)' : 'var(--color-neutral-300)';
    toggle.style.borderRadius = 'var(--radius-full)';
    toggle.style.position = 'relative';
    toggle.style.transition = 'background-color var(--transition-fast)';

    const knob = document.createElement('div');
    knob.style.width = '20px';
    knob.style.height = '20px';
    knob.style.backgroundColor = 'white';
    knob.style.borderRadius = '50%';
    knob.style.position = 'absolute';
    knob.style.top = '2px';
    knob.style.left = checked ? '22px' : '2px';
    knob.style.transition = 'left var(--transition-fast)';
    toggle.appendChild(knob);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.checked = checked;
    input.style.display = 'none';

    toggle.addEventListener('click', () => {
      input.checked = !input.checked;
      toggle.style.backgroundColor = input.checked ? 'var(--color-primary-600)' : 'var(--color-neutral-300)';
      knob.style.left = input.checked ? '22px' : '2px';
    });

    const text = document.createElement('span');
    text.style.color = 'var(--color-neutral-700)';
    text.textContent = label;

    labelEl.appendChild(toggle);
    labelEl.appendChild(input);
    labelEl.appendChild(text);
    wrapper.appendChild(labelEl);

    return wrapper;
  }

  private createNotifierToggle(notifier: { id: string; name: string; icon: string }): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'space-between';
    wrapper.style.padding = 'var(--space-3) 0';
    wrapper.style.borderBottom = '1px solid var(--color-neutral-100)';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = 'var(--space-3)';
    left.innerHTML = `
      <span style="font-size: 1.25rem;">${notifier.icon}</span>
      <span style="font-weight: var(--font-weight-medium); color: var(--color-neutral-700);">${notifier.name}</span>
    `;

    const toggle = document.createElement('div');
    toggle.className = 'toggle-switch';
    toggle.style.width = '44px';
    toggle.style.height = '24px';
    toggle.style.backgroundColor = 'var(--color-neutral-300)';
    toggle.style.borderRadius = 'var(--radius-full)';
    toggle.style.position = 'relative';
    toggle.style.cursor = 'pointer';
    toggle.style.transition = 'background-color var(--transition-fast)';

    const knob = document.createElement('div');
    knob.style.width = '20px';
    knob.style.height = '20px';
    knob.style.backgroundColor = 'white';
    knob.style.borderRadius = '50%';
    knob.style.position = 'absolute';
    knob.style.top = '2px';
    knob.style.left = '2px';
    knob.style.transition = 'left var(--transition-fast)';
    toggle.appendChild(knob);

    let isEnabled = false;
    toggle.addEventListener('click', () => {
      isEnabled = !isEnabled;
      toggle.style.backgroundColor = isEnabled ? 'var(--color-primary-600)' : 'var(--color-neutral-300)';
      knob.style.left = isEnabled ? '22px' : '2px';
    });

    wrapper.appendChild(left);
    wrapper.appendChild(toggle);

    return wrapper;
  }
}
