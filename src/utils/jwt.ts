// JWT 工具函数 - 使用 Web Crypto API

// JWT 头部
interface JWTHeader {
  alg: 'HS256';
  typ: 'JWT';
}

// JWT 载荷
interface JWTPayload {
  sub: string; // 用户标识
  iat: number; // 签发时间
  exp: number; // 过期时间
  jti?: string; // JWT ID
}

// 编码 Base64URL
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// 解码 Base64URL
function base64UrlDecode(str: string): string {
  // 补全填充
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
  return atob(base64);
}

// 将字符串转换为 ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// 将 ArrayBuffer 转换为 Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

// 导入密钥
async function importKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// 签名
async function sign(message: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    stringToArrayBuffer(message)
  );
  return arrayBufferToBase64(signature);
}

// 验证签名
async function verify(message: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await importKey(secret);
    const signatureBuffer = Uint8Array.from(atob(base64UrlDecode(signature)), (c) =>
      c.charCodeAt(0)
    );
    return await crypto.subtle.verify('HMAC', key, signatureBuffer, stringToArrayBuffer(message));
  } catch {
    return false;
  }
}

// 生成 JWT
export async function generateJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: number = 86400 // 默认24小时
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const header: JWTHeader = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const signature = await sign(message, secret);
  return `${message}.${signature}`;
}

// 验证 JWT
export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // 验证签名
    const message = `${encodedHeader}.${encodedPayload}`;
    const isValid = await verify(message, signature, secret);
    if (!isValid) {
      return null;
    }

    // 解析载荷
    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));

    // 检查过期时间
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// 刷新 JWT
export async function refreshJWT(
  token: string,
  secret: string,
  expiresIn: number = 86400
): Promise<string | null> {
  const payload = await verifyJWT(token, secret);
  if (!payload) {
    return null;
  }

  // 移除旧的签发时间和过期时间
  const { iat, exp, ...rest } = payload;
  return generateJWT(rest, secret, expiresIn);
}

// 解码 JWT（不验证）
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const encodedPayload = parts[1];
    return JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }
}

// 生成随机 JWT ID
export function generateJWTId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// 导出类型
export type { JWTHeader, JWTPayload };
