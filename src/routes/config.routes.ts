import { Hono } from 'hono';
import type { Env } from '../types';
import { ConfigService } from '../services/config.service';
import { generateRandomSecret } from '../utils/crypto';

const app = new Hono<{ Bindings: Env }>();

/**
 * 获取配置
 * GET /api/config
 */
app.get('/', async (c) => {
  try {
    const configService = new ConfigService(c.env);
    const rawConfig = await configService.getRawConfig();
    
    // 移除敏感信息
    const safeConfig = { ...rawConfig };
    delete safeConfig.jwtSecret;
    delete safeConfig.adminPassword;
    
    return c.json({
      success: true,
      data: safeConfig,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : '获取配置失败',
        },
      },
      500
    );
  }
});

/**
 * 更新配置
 * POST /api/config
 */
app.post('/', async (c) => {
  try {
    const newConfig = await c.req.json();
    const configService = new ConfigService(c.env);
    
    // 获取当前配置
    const currentConfig = await configService.getRawConfig();
    
    // 合并配置
    const updatedConfig = {
      ...currentConfig,
      ...newConfig,
    };
    
    // 如果没有JWT密钥，生成一个
    if (!updatedConfig.jwtSecret) {
      updatedConfig.jwtSecret = generateRandomSecret();
    }
    
    await configService.updateConfig(updatedConfig);
    
    return c.json({
      success: true,
      message: '配置已更新',
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : '更新配置失败',
        },
      },
      500
    );
  }
});

/**
 * 获取失败日志
 * GET /api/config/failure-logs
 */
app.get('/failure-logs', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const configService = new ConfigService(c.env);
    const logs = await configService.getFailureLogs(limit);
    
    return c.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : '获取失败日志失败',
        },
      },
      500
    );
  }
});

export const configRoutes = app;
