// JWT 认证中间件

import type { Context, Next } from 'hono';
import { verifyJWT, generateJWT, refreshJWT, generateJWTId } from '../utils/jwt';
import type { Config } from '../types';

// 扩展 Hono 上下文类型
declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    jwtPayload: {
      sub: string;
      iat: number;
      exp: number;
    };
  }
}

// 登录请求体
interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应
interface LoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}

// 验证密码 (使用 SHA-256)
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex === hashedPassword;
}

// 认证中间件
export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid authorization header',
          },
        },
        401
      );
    }

    const token = authHeader.substring(7);
    const config = c.get('config') as Config | undefined;

    if (!config?.jwtSecret) {
      return c.json(
        {
          success: false,
          error: {
            code: 'CONFIG_ERROR',
            message: 'JWT secret not configured',
          },
        },
        500
      );
    }

    const payload = await verifyJWT(token, config.jwtSecret);

    if (!payload) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          },
        },
        401
      );
    }

    // 将用户信息存入上下文
    c.set('userId', payload.sub);
    c.set('jwtPayload', payload);

    await next();
  };
}

// 可选认证中间件 (不强制要求认证，但会解析 token)
export function optionalAuthMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    const config = c.get('config') as Config | undefined;

    if (authHeader?.startsWith('Bearer ') && config?.jwtSecret) {
      const token = authHeader.substring(7);
      const payload = await verifyJWT(token, config.jwtSecret);

      if (payload) {
        c.set('userId', payload.sub);
        c.set('jwtPayload', payload);
      }
    }

    await next();
  };
}

// 登录处理函数
export async function handleLogin(c: Context): Promise<Response> {
  try {
    const body = await c.req.json<LoginRequest>();
    const { username, password } = body;

    if (!username || !password) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Username and password are required',
          },
        },
        400
      );
    }

    const config = c.get('config') as Config | undefined;

    if (!config) {
      return c.json(
        {
          success: false,
          error: {
            code: 'CONFIG_ERROR',
            message: 'Configuration not loaded',
          },
        },
        500
      );
    }

    // 验证用户名
    if (username !== config.adminUsername) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
          },
        },
        401
      );
    }

    // 验证密码 (假设配置中的密码已经是 SHA-256 哈希)
    const isPasswordValid = await verifyPassword(password, config.adminPassword);

    if (!isPasswordValid) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
          },
        },
        401
      );
    }

    // 生成 JWT
    const token = await generateJWT(
      {
        sub: username,
        jti: generateJWTId(),
      },
      config.jwtSecret,
      86400 // 24小时
    );

    // 生成刷新令牌 (7天有效期)
    const refreshToken = await generateJWT(
      {
        sub: username,
        jti: generateJWTId(),
      },
      config.jwtSecret,
      604800 // 7天
    );

    const response: LoginResponse = {
      success: true,
      token,
      refreshToken,
      expiresIn: 86400,
    };

    return c.json(response);
  } catch (error) {
    console.error('Login error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during login',
        },
      },
      500
    );
  }
}

// 刷新令牌处理函数
export async function handleRefreshToken(c: Context): Promise<Response> {
  try {
    const body = await c.req.json<{ refreshToken: string }>();
    const { refreshToken } = body;

    if (!refreshToken) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Refresh token is required',
          },
        },
        400
      );
    }

    const config = c.get('config') as Config | undefined;

    if (!config?.jwtSecret) {
      return c.json(
        {
          success: false,
          error: {
            code: 'CONFIG_ERROR',
            message: 'JWT secret not configured',
          },
        },
        500
      );
    }

    // 验证刷新令牌并生成新令牌
    const newToken = await refreshJWT(refreshToken, config.jwtSecret, 86400);

    if (!newToken) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired refresh token',
          },
        },
        401
      );
    }

    // 生成新的刷新令牌
    const newRefreshToken = await generateJWT(
      {
        sub: c.get('userId') || 'unknown',
        jti: generateJWTId(),
      },
      config.jwtSecret,
      604800 // 7天
    );

    return c.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
      expiresIn: 86400,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while refreshing token',
        },
      },
      500
    );
  }
}

// 登出处理函数 (客户端删除令牌即可，服务器端可以记录令牌黑名单)
export async function handleLogout(c: Context): Promise<Response> {
  // 在实际应用中，这里可以将令牌加入黑名单
  // 由于 JWT 是无状态的，真正的"登出"需要客户端删除令牌
  // 服务器端可以维护一个令牌黑名单来实现"强制登出"

  return c.json({
    success: true,
    message: 'Logged out successfully',
  });
}

// 导出类型
export type { LoginRequest, LoginResponse };
