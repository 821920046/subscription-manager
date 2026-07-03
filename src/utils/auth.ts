/**
 * 认证工具
 */

import bcrypt from 'bcryptjs';
import { CONFIG } from '../config/constants';
import { Logger } from './logger';

/**
 * JWT Payload 类型
 */
export interface JWTPayload {
  username: string;
  iat: number;
  exp: number;
}

/**
 * 默认 JWT 过期时间（秒）- 24 小时
 */
const DEFAULT_JWT_EXPIRY = 86400;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * base64url 编码（支持任意字节，UTF-8 安全）
 */
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * base64url 解码为字节数组
 */
function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeJsonSegment(value: unknown): string {
  return base64UrlEncode(textEncoder.encode(JSON.stringify(value)));
}

function decodeJsonSegment<T>(segment: string): T {
  return JSON.parse(textDecoder.decode(base64UrlDecode(segment))) as T;
}

/**
 * 常数时间字符串比较，防止时序攻击（用于签名/令牌比对）。
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * 密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    Logger.error('Password hashing failed', error);
    throw new Error('密码加密失败');
  }
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    Logger.error('Password verification failed', error);
    return false;
  }
}

/**
 * 验证 JWT Secret 是否符合要求
 */
export function validateJWTSecret(secret: string): boolean {
  return secret.length >= CONFIG.JWT.MIN_SECRET_LENGTH;
}

export const CryptoJS = {
  HmacSHA256: async function (message: string, key: string): Promise<string> {
    const keyData = textEncoder.encode(key);
    const messageData = textEncoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    );

    const buffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  },
};

/**
 * 生成随机密钥（使用 Web Crypto 安全随机数）
 */
export function generateRandomSecret(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < array.length; i++) {
    result += chars.charAt(array[i] % chars.length);
  }
  return result;
}

// 标准 base64 编解码（用于 PBKDF2 盐/哈希存储）
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** PBKDF2 迭代次数（WebCrypto 原生实现，在 Workers 上很快） */
const PBKDF2_ITERATIONS = 100000;

/**
 * 使用 WebCrypto PBKDF2 对密码加盐哈希（Cloudflare Workers 原生支持，无需 bcrypt 的高 CPU 开销）。
 * 返回形如 `PBKDF2:<iterations>:<saltBase64>:<hashBase64>` 的字符串。
 */
export async function hashPasswordPBKDF2(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `PBKDF2:${PBKDF2_ITERATIONS}:${bytesToBase64(salt)}:${bytesToBase64(new Uint8Array(bits))}`;
}

/**
 * 验证 PBKDF2 哈希密码（常数时间比较）。
 */
export async function verifyPasswordPBKDF2(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split(':');
    if (parts.length !== 4 || parts[0] !== 'PBKDF2') return false;
    const iterations = parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations <= 0) return false;
    const salt = base64ToBytes(parts[2]);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    return timingSafeEqual(bytesToBase64(new Uint8Array(bits)), parts[3]);
  } catch (error) {
    Logger.error('[PBKDF2] 验证失败', error);
    return false;
  }
}

/**
 * 生成 JWT Token（base64url + UTF-8 安全，支持中文等非 ASCII 用户名）
 */
export async function generateJWT(
  username: string,
  secret: string,
  expiresIn: number = DEFAULT_JWT_EXPIRY
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    username,
    iat: now,
    exp: now + expiresIn,
  };

  const headerBase64 = encodeJsonSegment(header);
  const payloadBase64 = encodeJsonSegment(payload);

  const signatureInput = headerBase64 + '.' + payloadBase64;
  const signature = await CryptoJS.HmacSHA256(signatureInput, secret);

  return headerBase64 + '.' + payloadBase64 + '.' + signature;
}

/**
 * 验证 JWT Token
 *
 * @returns JWT Payload 或 null（验证失败）
 */
export async function verifyJWT(
  token: string | null,
  secret: string
): Promise<JWTPayload | null> {
  try {
    if (!token || !secret) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerBase64, payloadBase64, signature] = parts;
    const signatureInput = headerBase64 + '.' + payloadBase64;
    const expectedSignature = await CryptoJS.HmacSHA256(signatureInput, secret);

    // 常数时间比较，防止时序攻击
    if (!timingSafeEqual(signature, expectedSignature)) {
      return null;
    }

    const payload = decodeJsonSegment<JWTPayload>(payloadBase64);

    // 验证过期时间
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (error) {
    Logger.error('[JWT] 验证过程出错', error);
    return null;
  }
}
