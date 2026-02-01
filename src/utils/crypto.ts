/**
 * 加密和认证工具函数
 */

import type { Config } from '../types';

/**
 * 生成JWT Token
 */
export async function generateJWT(
  username: string,
  secret: string,
  expiresIn: number = 86400
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: username,
    iat: now,
    exp: now + expiresIn,
  };
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${data}.${encodedSignature}`;
}

/**
 * 验证JWT Token
 */
export async function verifyJWT(token: string, secret: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    
    // 验证签名
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureBytes = Uint8Array.from(atob(encodedSignature), (c) => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(data)
    );
    
    if (!isValid) return null;
    
    // 解析payload
    const payload = JSON.parse(atob(encodedPayload));
    
    // 检查过期时间
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    
    return payload.sub;
  } catch {
    return null;
  }
}

/**
 * 生成随机密钥
 */
export function generateRandomSecret(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * 生成UUID
 */
export function generateUUID(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  
  // 设置UUID版本和变体
  array[6] = (array[6] & 0x0f) | 0x40; // 版本4
  array[8] = (array[8] & 0x3f) | 0x80; // 变体
  
  const hex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * 哈希密码（使用SHA-256）
 */
export async function hashPassword(password: string, salt?: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + (salt || ''));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string,
  salt?: string
): Promise<boolean> {
  const hash = await hashPassword(password, salt);
  return hash === hashedPassword;
}

/**
 * 从请求Cookie中获取Token
 */
export function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue;
    }
  }
  return null;
}

/**
 * 设置Cookie
 */
export function setCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    path?: string;
  } = {}
): string {
  const { maxAge = 86400, httpOnly = true, secure = false, sameSite = 'Lax', path = '/' } = options;
  
  let cookie = `${name}=${value}; Path=${path}; Max-Age=${maxAge}; SameSite=${sameSite}`;
  
  if (httpOnly) cookie += '; HttpOnly';
  if (secure) cookie += '; Secure';
  
  return cookie;
}

/**
 * 清除Cookie
 */
export function clearCookie(name: string, path: string = '/'): string {
  return `${name}=; Path=${path}; Max-Age=0; SameSite=Lax`;
}
