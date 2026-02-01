import { Hono } from 'hono';
import type { Env, Subscription } from '../types';
import { SubscriptionService } from '../services/subscription.service';
import { ConfigService } from '../services/config.service';
import { notificationManager } from '../notifiers';
import { generateUUID } from '../utils/crypto';

const app = new Hono<{ Bindings: Env }>();

/**
 * 获取所有订阅
 * GET /api/subscriptions
 */
app.get('/', async (c) => {
  try {
    const service = new SubscriptionService(c.env);
    const subscriptions = await service.getAllSubscriptions();
    
    return c.json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : '获取订阅失败',
        },
      },
      500
    );
  }
});

/**
 * 创建订阅
 * POST /api/subscriptions
 */
app.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const service = new SubscriptionService(c.env);
    
    // 生成ID和时间戳
    const subscription: Subscription = {
      ...data,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const result = await service.createSubscription(subscription);
    
    if (result.success) {
      return c.json(
        {
          success: true,
          data: subscription,
        },
        201
      );
    } else {
      return c.json(
        {
          success: false,
          error: {
            code: 'CREATE_ERROR',
            message: result.message || '创建订阅失败',
          },
        },
        400
      );
    }
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error instanceof Error ? error.message : '创建订阅失败',
        },
      },
      500
    );
  }
});

/**
 * 获取单个订阅
 * GET /api/subscriptions/:id
 */
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const service = new SubscriptionService(c.env);
    const subscription = await service.getSubscription(id);
    
    if (!subscription) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '订阅不存在',
          },
        },
        404
      );
    }
    
    return c.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : '获取订阅失败',
        },
      },
      500
    );
  }
});

/**
 * 更新订阅
 * PUT /api/subscriptions/:id
 */
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const service = new SubscriptionService(c.env);
    
    const result = await service.updateSubscription(id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    
    if (result.success) {
      return c.json({
        success: true,
        data: result.subscription,
      });
    } else {
      return c.json(
        {
          success: false,
          error: {
            code: 'UPDATE_ERROR',
            message: result.message || '更新订阅失败',
          },
        },
        400
      );
    }
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : '更新订阅失败',
        },
      },
      500
    );
  }
});

/**
 * 删除订阅
 * DELETE /api/subscriptions/:id
 */
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const service = new SubscriptionService(c.env);
    const result = await service.deleteSubscription(id);
    
    if (result.success) {
      return c.json({
        success: true,
      });
    } else {
      return c.json(
        {
          success: false,
          error: {
            code: 'DELETE_ERROR',
            message: result.message || '删除订阅失败',
          },
        },
        400
      );
    }
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error instanceof Error ? error.message : '删除订阅失败',
        },
      },
      500
    );
  }
});

/**
 * 切换订阅状态
 * POST /api/subscriptions/:id/toggle-status
 */
app.post('/:id/toggle-status', async (c) => {
  try {
    const id = c.req.param('id');
    const { isActive } = await c.req.json();
    const service = new SubscriptionService(c.env);
    
    const result = await service.toggleSubscriptionStatus(id, isActive);
    
    if (result.success) {
      return c.json({
        success: true,
        data: result.subscription,
      });
    } else {
      return c.json(
        {
          success: false,
          error: {
            code: 'UPDATE_ERROR',
            message: result.message || '切换状态失败',
          },
        },
        400
      );
    }
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : '切换状态失败',
        },
      },
      500
    );
  }
});

/**
 * 测试订阅通知
 * POST /api/subscriptions/:id/test-notify
 */
app.post('/:id/test-notify', async (c) => {
  try {
    const id = c.req.param('id');
    const service = new SubscriptionService(c.env);
    const configService = new ConfigService(c.env);
    
    const subscription = await service.getSubscription(id);
    if (!subscription) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '订阅不存在',
          },
        },
        404
      );
    }
    
    const config = await configService.getConfig();
    notificationManager.setEnv(c.env);
    
    // 计算剩余天数
    const now = new Date();
    const expiry = new Date(subscription.expiryDate);
    const daysRemaining = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const subWithDays = {
      ...subscription,
      daysRemaining,
    };
    
    // 发送测试通知
    const results = await notificationManager.sendToAllChannels(
      {
        title: '订阅提醒测试',
        content: '',
        subscriptions: [subWithDays],
      },
      config,
      '[手动测试]'
    );
    
    const success = results.some((r) => r.success);
    
    return c.json({
      success,
      data: results,
      message: success ? '测试通知已发送' : '所有渠道发送失败',
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOTIFY_ERROR',
          message: error instanceof Error ? error.message : '发送测试通知失败',
        },
      },
      500
    );
  }
});

export const subscriptionRoutes = app;
