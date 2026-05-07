/**
 * RSA 加密工具
 * 用于 AI 注册时前端 RSA 加密 API Key
 */
import api from '@/lib/api';

// RSA 公钥缓存
let cachedPublicKey: string | null = null;
let publicKeyExpiresAt = 0;

// RSA 公钥有效期（23 小时，留 1 小时余量）
const PUBLIC_KEY_CACHE_TTL = 23 * 60 * 60 * 1000;

/**
 * 从后端获取 RSA 公钥
 */
async function fetchPublicKey(): Promise<string> {
  const response = await api.get('/api/auth/register/ai/encrypt-key');
  if (!response.data?.data?.publicKey) {
    throw new Error('获取 RSA 公钥失败');
  }
  return response.data.data.publicKey;
}

/**
 * 获取 RSA 公钥（带缓存）
 */
async function getPublicKey(): Promise<string> {
  const now = Date.now();

  // 检查缓存是否有效
  if (cachedPublicKey && now < publicKeyExpiresAt) {
    return cachedPublicKey;
  }

  // 从后端获取新公钥
  cachedPublicKey = await fetchPublicKey();
  publicKeyExpiresAt = now + PUBLIC_KEY_CACHE_TTL;

  return cachedPublicKey;
}

/**
 * 将 PEM 格式公钥转换为 CryptoKey
 */
async function importPublicKey(pemKey: string): Promise<CryptoKey> {
  // 移除 PEM 头尾和换行
  const pemContents = pemKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '');

  // Base64 解码
  const binaryKey = atob(pemContents);
  const bytes = new Uint8Array(binaryKey.length);
  for (let i = 0; i < binaryKey.length; i++) {
    bytes[i] = binaryKey.charCodeAt(i);
  }

  // 导入为 CryptoKey
  return await crypto.subtle.importKey(
    'spki',
    bytes.buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false, // 不可导出
    ['encrypt']
  );
}

/**
 * RSA-OAEP-256 加密数据
 * @param data 要加密的明文数据
 * @returns Base64 编码的加密数据
 */
export async function rsaEncrypt(data: string): Promise<string> {
  // 获取公钥
  const publicKeyPem = await getPublicKey();
  const publicKey = await importPublicKey(publicKeyPem);

  // 将数据编码为 Uint8Array
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // RSA 加密
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    publicKey,
    dataBuffer
  );

  // 转为 Base64
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  let binary = '';
  for (let i = 0; i < encryptedBytes.length; i++) {
    binary += String.fromCharCode(encryptedBytes[i]);
  }
  return btoa(binary);
}

/**
 * 清除公钥缓存（用于测试或强制刷新）
 */
export function clearPublicKeyCache(): void {
  cachedPublicKey = null;
  publicKeyExpiresAt = 0;
}
