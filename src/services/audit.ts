// 审计日志服务

import type { Context } from 'hono';

// 审计日志条目
interface AuditLogEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  userId?: string;
  statusCode: number;
  duration: number;
  requestBody?: string;
  responseSize?: number;
  error?: string;
}

// 审计日志查询选项
interface AuditLogQueryOptions {
  startTime?: string;
  endTime?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  limit?: number;
  offset?: number;
}

// 审计日志查询结果
interface AuditLogQueryResult {
  logs: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

// 敏感字段列表
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'authorization', 'cookie'];

// 脱敏函数
function sanitizeData(data: string): string {
  try {
    const obj = JSON.parse(data);
    return JSON.stringify(sanitizeObject(obj));
  } catch {
    // 不是 JSON，尝试替换敏感信息
    let sanitized = data;
    SENSITIVE_FIELDS.forEach((field) => {
      const regex = new RegExp(`"${field}"\s*:\s*"[^"]*"`, 'gi');
      sanitized = sanitized.replace(regex, `"${field}":"***"`);
    });
    return sanitized;
  }
}

// 递归脱敏对象
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = '***';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// 生成唯一 ID
function generateLogId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

// 审计日志服务类
export class AuditService {
  private kv: KVNamespace;
  private buffer: AuditLogEntry[] = [];
  private readonly BUFFER_SIZE = 10;
  private readonly BUFFER_TIMEOUT = 30000; // 30秒
  private flushTimer: number | null = null;
  private readonly KEY_PREFIX = 'audit:';
  private readonly INDEX_KEY = 'audit:index';

  constructor(kv: KVNamespace) {
    this.kv = kv;
    this.startFlushTimer();
  }

  // 记录请求
  async logRequest(
    c: Context,
    startTime: number,
    statusCode: number,
    error?: string
  ): Promise<void> {
    const url = new URL(c.req.url);
    const userId = c.get('userId') as string | undefined;

    // 获取请求体（如果是 JSON）
    let requestBody: string | undefined;
    const contentType = c.req.header('content-type');
    if (contentType?.includes('application/json')) {
      try {
        const clonedReq = c.req.raw.clone();
        const bodyText = await clonedReq.text();
        requestBody = sanitizeData(bodyText);
      } catch {
        // 无法读取请求体
      }
    }

    const entry: AuditLogEntry = {
      id: generateLogId(),
      timestamp: new Date().toISOString(),
      method: c.req.method,
      path: url.pathname,
      ip: c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown',
      userAgent: c.req.header('user-agent') || 'unknown',
      userId,
      statusCode,
      duration: Date.now() - startTime,
      requestBody,
      error,
    };

    // 添加到缓冲区
    this.buffer.push(entry);

    // 如果缓冲区满了，立即刷新
    if (this.buffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    }
  }

  // 刷新缓冲区到 KV
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      // 批量写入 KV
      await Promise.all(
        entries.map(async (entry) => {
          const key = `${this.KEY_PREFIX}${entry.timestamp.split('T')[0]}:${entry.id}`;
          await this.kv.put(key, JSON.stringify(entry), {
            expirationTtl: 2592000, // 30天过期
          });
        })
      );

      // 更新索引
      await this.updateIndex(entries);
    } catch (error) {
      console.error('Audit log flush error:', error);
      // 如果写入失败，将条目放回缓冲区
      this.buffer.unshift(...entries);
    }
  }

  // 更新索引
  private async updateIndex(entries: AuditLogEntry[]): Promise<void> {
    try {
      const existingIndex = await this.kv.get<string[]>(this.INDEX_KEY, 'json') || [];
      const newKeys = entries.map((e) => `${this.KEY_PREFIX}${e.timestamp.split('T')[0]}:${e.id}`);
      const updatedIndex = [...existingIndex, ...newKeys];

      // 只保留最近 30 天的索引
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

      const filteredIndex = updatedIndex.filter((key) => {
        const date = key.split(':')[1];
        return date >= cutoff;
      });

      await this.kv.put(this.INDEX_KEY, JSON.stringify(filteredIndex));
    } catch (error) {
      console.error('Audit index update error:', error);
    }
  }

  // 查询审计日志
  async queryLogs(options: AuditLogQueryOptions = {}): Promise<AuditLogQueryResult> {
    const {
      startTime,
      endTime,
      userId,
      path,
      method,
      statusCode,
      limit = 50,
      offset = 0,
    } = options;

    try {
      // 获取索引
      const index = await this.kv.get<string[]>(this.INDEX_KEY, 'json') || [];

      // 根据时间范围过滤键
      let keys = index;
      if (startTime || endTime) {
        keys = keys.filter((key) => {
          const date = key.split(':')[1];
          if (startTime && date < startTime.split('T')[0]) return false;
          if (endTime && date > endTime.split('T')[0]) return false;
          return true;
        });
      }

      // 按时间倒序排序
      keys.sort().reverse();

      // 分页
      const total = keys.length;
      const paginatedKeys = keys.slice(offset, offset + limit);

      // 获取日志内容
      const logs: AuditLogEntry[] = [];
      for (const key of paginatedKeys) {
        const entry = await this.kv.get<AuditLogEntry>(key, 'json');
        if (entry) {
          // 应用其他过滤条件
          if (userId && entry.userId !== userId) continue;
          if (path && !entry.path.includes(path)) continue;
          if (method && entry.method !== method.toUpperCase()) continue;
          if (statusCode && entry.statusCode !== statusCode) continue;

          logs.push(entry);
        }
      }

      return {
        logs,
        total,
        limit,
        offset,
      };
    } catch (error) {
      console.error('Audit log query error:', error);
      return { logs: [], total: 0, limit, offset };
    }
  }

  // 启动定时刷新
  private startFlushTimer(): void {
    if (typeof globalThis !== 'undefined' && 'setInterval' in globalThis) {
      this.flushTimer = globalThis.setInterval(() => {
        this.flush().catch((error) => {
          console.error('Audit timer flush error:', error);
        });
      }, this.BUFFER_TIMEOUT) as unknown as number;
    }
  }

  // 停止定时刷新
  stop(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

// 创建审计服务实例的工厂函数
export function createAuditService(kv: KVNamespace): AuditService {
  return new AuditService(kv);
}

// 导出类型
export type { AuditLogEntry, AuditLogQueryOptions, AuditLogQueryResult };
