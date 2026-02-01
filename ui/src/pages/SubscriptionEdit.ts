// 订阅编辑页面
export class SubscriptionEdit {
  private isEdit: boolean = false;
  private subscriptionId: string | null = null;

  constructor() {
    // 从URL判断是新建还是编辑
    const path = window.location.pathname;
    this.isEdit = path.includes('/edit');
    const urlParams = new URLSearchParams(window.location.search);
    this.subscriptionId = urlParams.get('id');
  }

  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'subscription-edit-page';

    // 页面标题
    const header = document.createElement('div');
    header.className = 'page-header';
    header.style.marginBottom = 'var(--space-6)';
    header.innerHTML = `
      <h1 class="page-title">${this.isEdit ? '编辑订阅' : '新增订阅'}</h1>
      <p class="page-subtitle">${this.isEdit ? '修改订阅信息' : '添加新的订阅服务'}</p>
    `;
    container.appendChild(header);

    // 表单
    const form = document.createElement('form');
    form.className = 'subscription-form';
    form.style.backgroundColor = 'white';
    form.style.borderRadius = 'var(--radius-lg)';
    form.style.padding = 'var(--space-8)';
    form.style.boxShadow = 'var(--shadow-md)';
    form.style.maxWidth = '800px';

    // 基本信息组
    const basicSection = this.createFormSection('基本信息');
    basicSection.appendChild(this.createFormRow([
      this.createFormField('订阅名称', 'name', 'text', '例如：Netflix、Spotify', true),
      this.createFormField('订阅类型', 'type', 'select', '', true, ['软件', '娱乐', '工具', '服务', '其他'])
    ]));
    form.appendChild(basicSection);

    // 日期设置组
    const dateSection = this.createFormSection('日期设置');
    dateSection.appendChild(this.createFormRow([
      this.createFormField('开始日期', 'startDate', 'date', '', true),
      this.createFormField('到期日期', 'expiryDate', 'date', '', true)
    ]));
    
    // 农历切换
    const lunarRow = document.createElement('div');
    lunarRow.style.marginTop = 'var(--space-4)';
    lunarRow.innerHTML = `
      <label style="display: flex; align-items: center; gap: var(--space-3); cursor: pointer;">
        <input type="checkbox" name="useLunar" style="width: 18px; height: 18px; accent-color: var(--color-primary-600);">
        <span style="color: var(--color-neutral-700);">使用农历日期</span>
      </label>
    `;
    dateSection.appendChild(lunarRow);
    form.appendChild(dateSection);

    // 周期设置组
    const periodSection = this.createFormSection('周期设置');
    periodSection.appendChild(this.createFormRow([
      this.createFormField('周期数值', 'periodValue', 'number', '例如：1、3、12', false),
      this.createFormField('周期单位', 'periodUnit', 'select', '', false, ['天', '月', '年'])
    ]));
    form.appendChild(periodSection);

    // 费用设置组
    const priceSection = this.createFormSection('费用设置');
    priceSection.appendChild(this.createFormRow([
      this.createFormField('价格（元）', 'price', 'number', '例如：35、298', false),
      this.createFormField('提醒天数', 'reminderDays', 'number', '到期前提醒', false, '7')
    ]));
    form.appendChild(priceSection);

    // 其他设置组
    const otherSection = this.createFormSection('其他设置');
    
    const autoRenewRow = document.createElement('div');
    autoRenewRow.style.marginBottom = 'var(--space-4)';
    autoRenewRow.innerHTML = `
      <label style="display: flex; align-items: center; gap: var(--space-3); cursor: pointer;">
        <input type="checkbox" name="autoRenew" style="width: 18px; height: 18px; accent-color: var(--color-primary-600);">
        <span style="color: var(--color-neutral-700);">自动续费</span>
      </label>
    `;
    otherSection.appendChild(autoRenewRow);

    const notesField = this.createTextareaField('备注', 'notes', '添加备注信息...', false);
    otherSection.appendChild(notesField);
    form.appendChild(otherSection);

    // 操作按钮
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = 'var(--space-4)';
    actions.style.marginTop = 'var(--space-8)';
    actions.style.paddingTop = 'var(--space-6)';
    actions.style.borderTop = '1px solid var(--color-neutral-200)';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.style.padding = 'var(--space-3) var(--space-6)';
    saveBtn.style.backgroundColor = 'var(--color-primary-600)';
    saveBtn.style.color = 'white';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = 'var(--radius-md)';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.fontWeight = 'var(--font-weight-medium)';
    saveBtn.textContent = '保存';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.style.padding = 'var(--space-3) var(--space-6)';
    cancelBtn.style.backgroundColor = 'white';
    cancelBtn.style.color = 'var(--color-neutral-700)';
    cancelBtn.style.border = '1px solid var(--color-neutral-300)';
    cancelBtn.style.borderRadius = 'var(--radius-md)';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('navigate', { detail: '/subscriptions' }));
    });

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    form.appendChild(actions);

    // 表单提交事件
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit(form);
    });

    container.appendChild(form);
    return container;
  }

  private createFormSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'form-section';
    section.style.marginBottom = 'var(--space-8)';

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

  private createFormRow(fields: HTMLElement[]): HTMLElement {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
    row.style.gap = 'var(--space-6)';
    
    fields.forEach(field => row.appendChild(field));
    return row;
  }

  private createFormField(label: string, name: string, type: string, placeholder: string, required: boolean, options?: string[] | string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';

    const labelEl = document.createElement('label');
    labelEl.style.display = 'block';
    labelEl.style.fontSize = 'var(--font-size-sm)';
    labelEl.style.fontWeight = 'var(--font-weight-medium)';
    labelEl.style.color = 'var(--color-neutral-700)';
    labelEl.style.marginBottom = 'var(--space-2)';
    labelEl.innerHTML = `${label} ${required ? '<span style="color: var(--color-error-500);">*</span>' : ''}`;
    wrapper.appendChild(labelEl);

    let input: HTMLInputElement | HTMLSelectElement;

    if (type === 'select' && Array.isArray(options)) {
      input = document.createElement('select');
      input.innerHTML = `
        <option value="">请选择</option>
        ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
      `;
    } else {
      input = document.createElement('input');
      input.type = type;
      input.placeholder = placeholder;
      if (typeof options === 'string') {
        input.value = options;
      }
    }

    input.name = name;
    input.required = required;
    input.style.width = '100%';
    input.style.padding = 'var(--space-3)';
    input.style.border = '1px solid var(--color-neutral-300)';
    input.style.borderRadius = 'var(--radius-md)';
    input.style.fontSize = 'var(--font-size-base)';
    input.style.backgroundColor = 'white';
    input.style.transition = 'border-color var(--transition-fast), box-shadow var(--transition-fast)';

    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--color-primary-500)';
      input.style.boxShadow = '0 0 0 3px var(--color-primary-100)';
    });

    input.addEventListener('blur', () => {
      input.style.borderColor = 'var(--color-neutral-300)';
      input.style.boxShadow = 'none';
    });

    wrapper.appendChild(input);
    return wrapper;
  }

  private createTextareaField(label: string, name: string, placeholder: string, required: boolean): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';

    const labelEl = document.createElement('label');
    labelEl.style.display = 'block';
    labelEl.style.fontSize = 'var(--font-size-sm)';
    labelEl.style.fontWeight = 'var(--font-weight-medium)';
    labelEl.style.color = 'var(--color-neutral-700)';
    labelEl.style.marginBottom = 'var(--space-2)';
    labelEl.innerHTML = `${label} ${required ? '<span style="color: var(--color-error-500);">*</span>' : ''}`;
    wrapper.appendChild(labelEl);

    const textarea = document.createElement('textarea');
    textarea.name = name;
    textarea.placeholder = placeholder;
    textarea.required = required;
    textarea.rows = 4;
    textarea.style.width = '100%';
    textarea.style.padding = 'var(--space-3)';
    textarea.style.border = '1px solid var(--color-neutral-300)';
    textarea.style.borderRadius = 'var(--radius-md)';
    textarea.style.fontSize = 'var(--font-size-base)';
    textarea.style.fontFamily = 'inherit';
    textarea.style.resize = 'vertical';
    textarea.style.backgroundColor = 'white';

    textarea.addEventListener('focus', () => {
      textarea.style.borderColor = 'var(--color-primary-500)';
      textarea.style.boxShadow = '0 0 0 3px var(--color-primary-100)';
    });

    textarea.addEventListener('blur', () => {
      textarea.style.borderColor = 'var(--color-neutral-300)';
      textarea.style.boxShadow = 'none';
    });

    wrapper.appendChild(textarea);
    return wrapper;
  }

  private handleSubmit(form: HTMLFormElement): void {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // 处理复选框
    const useLunar = form.querySelector('input[name="useLunar"]') as HTMLInputElement;
    const autoRenew = form.querySelector('input[name="autoRenew"]') as HTMLInputElement;
    
    console.log('表单数据:', {
      ...data,
      useLunar: useLunar?.checked || false,
      autoRenew: autoRenew?.checked || false,
    });

    // 显示成功提示（实际项目中这里会调用API）
    alert(this.isEdit ? '订阅已更新' : '订阅已创建');
    document.dispatchEvent(new CustomEvent('navigate', { detail: '/subscriptions' }));
  }
}
