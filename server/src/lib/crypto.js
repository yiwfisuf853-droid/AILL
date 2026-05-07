/**
 * AES-256-GCM 加解密工具
 * 用于第三方 API Key 的加密存储与安全传输
 * 密钥由环境变量 LLM_KEY_ENCRYPT_SECRET 提供，32 字节
 */
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // GCM 推荐 12 字节
const TAG_LENGTH = 16;  // GCM auth tag 16 字节

/**
 * 获取加密密钥（32 字节），优先从环境变量读取
 * 生产环境必须设置 LLM_KEY_ENCRYPT_SECRET，否则拒绝启动
 */
function getEncryptionKey() {
  const secret = process.env.LLM_KEY_ENCRYPT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (secret && secret.length >= 32) {
    return Buffer.from(secret.slice(0, 32), 'utf8');
  }

  if (isProduction) {
    console.error('FATAL: 生产环境必须设置 LLM_KEY_ENCRYPT_SECRET 环境变量（至少 32 字符）');
    process.exit(1);
  }

  const fallback = process.env.JWT_SECRET || 'aill-default-encrypt-key-2026';
  console.warn('[加密] 开发环境使用 JWT_SECRET 派生加密密钥，生产环境请设置独立的 LLM_KEY_ENCRYPT_SECRET');
  return crypto.createHash('sha256').update(fallback).digest();
}

/**
 * 加密明文，返回 "iv:tag:ciphertext" 格式的 base64 字符串
 */
export function encrypt(plaintext) {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * 解密 "iv:tag:ciphertext" 格式的字符串，返回明文
 */
export function decrypt(encryptedStr) {
  if (!encryptedStr) return '';
  const key = getEncryptionKey();
  const parts = encryptedStr.split(':');
  if (parts.length !== 3) {
    throw new Error('无效的加密格式');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const encrypted = Buffer.from(parts[2], 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
