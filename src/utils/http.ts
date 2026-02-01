/**
 * HTTP请求工具函数
 */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

/**
 * 带重试机制的HTTP请求
 */
export async function requestWithRetry(
  url: string,
  options: RequestOptions = {},
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // 指数退避
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

/**
 * 发送JSON POST请求
 */
export async function postJSON<T = any>(
  url: string,
  data: any,
  headers: Record<string, string> = {}
): Promise<T> {
  const response = await requestWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * 发送GET请求
 */
export async function getJSON<T = any>(
  url: string,
  headers: Record<string, string> = {}
): Promise<T> {
  const response = await requestWithRetry(url, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * 构建URL查询参数
 */
export function buildQueryString(params: Record<string, string | number | boolean>): string {
  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/**
 * 安全地解析JSON
 */
export function safeJSONParse<T = any>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 检查URL是否有效
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取客户端IP地址
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * 创建标准API响应
 */
export function createAPIResponse<T>(
  success: boolean,
  data?: T,
  error?: { code: string; message: string; details?: any }
): { success: boolean; data?: T; error?: typeof error } {
  const response: { success: boolean; data?: T; error?: typeof error } = { success };
  
  if (data !== undefined) {
    response.data = data;
  }
  
  if (error) {
    response.error = error;
  }
  
  return response;
}
