import type { Env, Subscription } from '../types';
import { daysBetween, addDays, addMonths, addYears } from '../utils/date';
import { lunarCalendar } from '../utils/lunar';

interface CreateResult {
  success: boolean;
  message?: string;
}

interface UpdateResult {
  success: boolean;
  message?: string;
  subscription?: Subscription;
}

interface NotificationItem {
  subscription: Subscription;
  daysUntil: number;
}

export class SubscriptionService {
  private env: Env;
  private static readonly SUBSCRIPTION_PREFIX = 'sub:';

  constructor(env: Env) {
    this.env = env;
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    const subscriptions: Subscription[] = [];
    const list = await this.env.SUBSCRIPTIONS_KV.list({
      prefix: SubscriptionService.SUBSCRIPTION_PREFIX,
    });

    const promises = list.keys.map(async (key) => {
      const value = await this.env.SUBSCRIPTIONS_KV.get(key.name);
      if (value) {
        try {
          return JSON.parse(value) as Subscription;
        } catch {
          return null;
        }
      }
      return null;
    });

    const results = await Promise.all(promises);
    return results.filter((s): s is Subscription => s !== null);
  }

  async getSubscription(id: string): Promise<Subscription | null> {
    const key = `${SubscriptionService.SUBSCRIPTION_PREFIX}${id}`;
    const value = await this.env.SUBSCRIPTIONS_KV.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as Subscription;
    } catch {
      return null;
    }
  }

  async createSubscription(subscription: Subscription): Promise<CreateResult> {
    try {
      const key = `${SubscriptionService.SUBSCRIPTION_PREFIX}${subscription.id}`;
      await this.env.SUBSCRIPTIONS_KV.put(key, JSON.stringify(subscription));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  async updateSubscription(
    id: string,
    data: Partial<Subscription>
  ): Promise<UpdateResult> {
    try {
      const existing = await this.getSubscription(id);
      if (!existing) {
        return { success: false, message: '订阅不存在' };
      }

      const updated: Subscription = {
        ...existing,
        ...data,
        id: existing.id,
        createdAt: existing.createdAt,
      };

      const key = `${SubscriptionService.SUBSCRIPTION_PREFIX}${id}`;
      await this.env.SUBSCRIPTIONS_KV.put(key, JSON.stringify(updated));

      return { success: true, subscription: updated };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  async deleteSubscription(id: string): Promise<CreateResult> {
    try {
      const key = `${SubscriptionService.SUBSCRIPTION_PREFIX}${id}`;
      await this.env.SUBSCRIPTIONS_KV.delete(key);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  async toggleSubscriptionStatus(
    id: string,
    isActive: boolean
  ): Promise<UpdateResult> {
    return this.updateSubscription(id, { isActive });
  }

  async checkExpiringSubscriptions(): Promise<{
    notifications: NotificationItem[];
  }> {
    const subscriptions = await this.getAllSubscriptions();
    const notifications: NotificationItem[] = [];
    const now = new Date();

    for (const sub of subscriptions) {
      if (!sub.isActive) continue;

      const expiryDate = new Date(sub.expiryDate);
      const daysUntil = daysBetween(now, expiryDate);

      if (daysUntil <= sub.reminderDays || daysUntil <= 0) {
        notifications.push({ subscription: sub, daysUntil });
      }

      if (sub.autoRenew && daysUntil <= 0 && sub.periodValue && sub.periodUnit) {
        await this.renewSubscription(sub);
      }
    }

    return { notifications };
  }

  private async renewSubscription(subscription: Subscription): Promise<void> {
    if (!subscription.periodValue || !subscription.periodUnit) return;

    const currentExpiry = new Date(subscription.expiryDate);
    let newExpiry: Date;

    if (subscription.useLunar) {
      newExpiry = lunarCalendar.getNextLunarCycle(
        currentExpiry,
        subscription.periodValue,
        subscription.periodUnit
      );
    } else {
      switch (subscription.periodUnit) {
        case 'day':
          newExpiry = addDays(currentExpiry, subscription.periodValue);
          break;
        case 'month':
          newExpiry = addMonths(currentExpiry, subscription.periodValue);
          break;
        case 'year':
          newExpiry = addYears(currentExpiry, subscription.periodValue);
          break;
        default:
          return;
      }
    }

    const newExpiryStr = newExpiry.toISOString().split('T')[0];
    await this.updateSubscription(subscription.id, {
      expiryDate: newExpiryStr,
    });
  }
}
