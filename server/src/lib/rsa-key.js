/**
 * RSA 密钥管理
 * 用于 AI 注册时前端 RSA 加密 API Key
 *
 * 特性：
 * - 生产环境：密钥持久化到文件（RSA_PRIVATE_KEY_PATH 或默认 keys/ 目录）
 * - 开发环境：内存生成，重启后重新生成（可接受）
 * - 密钥轮换：保留旧公钥 24 小时过渡期，解密时先尝试当前密钥再尝试旧密钥
 */
import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYS_DIR = path.join(__dirname, '..', '..', 'keys');

// RSA 密钥配置
const RSA_KEY_SIZE = 2048;
const KEY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 小时

// 内存缓存
let cachedKeyPair = null;
let cachedKeyPairGeneratedAt = null;

// 旧密钥对（密钥轮换过渡期）
let previousKeyPair = null;
let previousKeyPairExpiresAt = 0;

/**
 * 获取私钥持久化路径
 * 生产环境可通过 RSA_PRIVATE_KEY_PATH 指定
 */
function getPrivateKeyPath() {
  if (process.env.RSA_PRIVATE_KEY_PATH) {
    return process.env.RSA_PRIVATE_KEY_PATH;
  }
  return path.join(KEYS_DIR, 'rsa-private.pem');
}

function getPublicKeyPath() {
  const privPath = getPrivateKeyPath();
  const dir = path.dirname(privPath);
  return path.join(dir, 'rsa-public.pem');
}

/**
 * 确保 keys 目录存在
 */
function ensureKeysDir() {
  const dir = path.dirname(getPrivateKeyPath());
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 生成 RSA 密钥对
 */
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: RSA_KEY_SIZE,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const keyPair = {
    publicKey,
    privateKey,
    generatedAt: Date.now(),
  };

  // 持久化到磁盘
  ensureKeysDir();
  const pubPath = getPublicKeyPath();
  const privPath = getPrivateKeyPath();
  fs.writeFileSync(pubPath, publicKey);
  fs.writeFileSync(privPath, privateKey);

  return keyPair;
}

/**
 * 加载持久化的密钥对
 */
function loadKeyPair() {
  const pubPath = getPublicKeyPath();
  const privPath = getPrivateKeyPath();

  if (fs.existsSync(pubPath) && fs.existsSync(privPath)) {
    const stats = fs.statSync(pubPath);
    const generatedAt = stats.mtimeMs;

    // 检查是否过期
    if (Date.now() - generatedAt < KEY_EXPIRY_MS) {
      return {
        publicKey: fs.readFileSync(pubPath, 'utf8'),
        privateKey: fs.readFileSync(privPath, 'utf8'),
        generatedAt,
      };
    }

    // 过期了，删除旧密钥
    console.log('[RSA] Keys expired, regenerating...');
    try {
      fs.unlinkSync(pubPath);
      fs.unlinkSync(privPath);
    } catch (e) { console.warn('[RSA] Failed to delete expired keys:', e.message); }
  }

  return null;
}

/**
 * 保存旧密钥到过渡文件
 */
function savePreviousKeyPair(keyPair) {
  if (!keyPair) return;
  const dir = path.dirname(getPrivateKeyPath());
  const pubPath = path.join(dir, 'rsa-public-prev.pem');
  const privPath = path.join(dir, 'rsa-private-prev.pem');
  try {
    ensureKeysDir();
    fs.writeFileSync(pubPath, keyPair.publicKey);
    fs.writeFileSync(privPath, keyPair.privateKey);
  } catch (e) { console.warn('[RSA] Failed to save previous key pair:', e.message); }
}

/**
 * 加载旧密钥对（过渡期内）
 */
function loadPreviousKeyPair() {
  const dir = path.dirname(getPrivateKeyPath());
  const pubPath = path.join(dir, 'rsa-public-prev.pem');
  const privPath = path.join(dir, 'rsa-private-prev.pem');

  if (fs.existsSync(pubPath) && fs.existsSync(privPath)) {
    const stats = fs.statSync(pubPath);
    const generatedAt = stats.mtimeMs;

    // 旧密钥 24 小时过渡期
    if (Date.now() - generatedAt < KEY_EXPIRY_MS) {
      return {
        publicKey: fs.readFileSync(pubPath, 'utf8'),
        privateKey: fs.readFileSync(privPath, 'utf8'),
        generatedAt,
      };
    }
  }

  return null;
}

/**
 * 确保密钥已加载到内存
 */
function ensureKeyPairLoaded() {
  if (cachedKeyPair && cachedKeyPairGeneratedAt) {
    if (Date.now() - cachedKeyPairGeneratedAt < KEY_EXPIRY_MS) {
      return;
    }

    // 当前密钥过期，保存为旧密钥
    previousKeyPair = cachedKeyPair;
    previousKeyPairExpiresAt = Date.now() + KEY_EXPIRY_MS;
    savePreviousKeyPair(cachedKeyPair);
    cachedKeyPair = null;
    cachedKeyPairGeneratedAt = null;
  }

  // 尝试加载持久化密钥
  const savedKeyPair = loadKeyPair();
  if (savedKeyPair) {
    cachedKeyPair = savedKeyPair;
    cachedKeyPairGeneratedAt = savedKeyPair.generatedAt;
    return;
  }

  // 生成新密钥对
  console.log('[RSA] Generating new key pair...');
  cachedKeyPair = generateKeyPair();
  cachedKeyPairGeneratedAt = cachedKeyPair.generatedAt;
}

/**
 * 获取当前可用的 RSA 公钥
 * 首次调用时生成密钥对，后续复用缓存
 */
export function getPublicKey() {
  // 检查缓存
  if (cachedKeyPair && cachedKeyPairGeneratedAt) {
    if (Date.now() - cachedKeyPairGeneratedAt < KEY_EXPIRY_MS) {
      return cachedKeyPair.publicKey;
    }
  }

  // 尝试加载持久化密钥
  const savedKeyPair = loadKeyPair();
  if (savedKeyPair) {
    cachedKeyPair = savedKeyPair;
    cachedKeyPairGeneratedAt = savedKeyPair.generatedAt;
    return savedKeyPair.publicKey;
  }

  // 生成新密钥对
  console.log('[RSA] Generating new key pair...');
  cachedKeyPair = generateKeyPair();
  cachedKeyPairGeneratedAt = cachedKeyPair.generatedAt;
  return cachedKeyPair.publicKey;
}

/**
 * 使用私钥解密 RSA 加密的数据
 * 支持密钥轮换过渡期：先尝试当前密钥，失败后尝试旧密钥
 */
export function decryptWithPrivateKey(encryptedData) {
  // 确保当前密钥已加载
  if (!cachedKeyPair) {
    const savedKeyPair = loadKeyPair();
    if (savedKeyPair) {
      cachedKeyPair = savedKeyPair;
      cachedKeyPairGeneratedAt = savedKeyPair.generatedAt;
    } else {
      cachedKeyPair = generateKeyPair();
      cachedKeyPairGeneratedAt = cachedKeyPair.generatedAt;
    }
  }

  // 尝试当前密钥解密
  try {
    const decrypted = crypto.privateDecrypt(
      {
        key: cachedKeyPair.privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(encryptedData, 'base64')
    );
    return decrypted.toString('utf8');
  } catch (currentKeyError) {
    // 当前密钥解密失败，尝试旧密钥（密钥轮换过渡期）
  }

  // 尝试旧密钥（内存缓存）
  if (previousKeyPair && Date.now() < previousKeyPairExpiresAt) {
    try {
      const decrypted = crypto.privateDecrypt(
        {
          key: previousKeyPair.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(encryptedData, 'base64')
      );
      console.warn('[RSA] Decrypted with previous key (rotation transition)');
      return decrypted.toString('utf8');
    } catch (e) { console.warn('[RSA] Previous key decryption failed:', e.message); }
  }

  // 尝试旧密钥（从磁盘加载）
  const prevKeyPair = loadPreviousKeyPair();
  if (prevKeyPair) {
    previousKeyPair = prevKeyPair;
    previousKeyPairExpiresAt = prevKeyPair.generatedAt + KEY_EXPIRY_MS;
    try {
      const decrypted = crypto.privateDecrypt(
        {
          key: prevKeyPair.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(encryptedData, 'base64')
      );
      console.warn('[RSA] Decrypted with previous key (rotation transition, loaded from disk)');
      return decrypted.toString('utf8');
    } catch (e) { console.warn('[RSA] Previous key (disk) decryption failed:', e.message); }
  }

  console.error('[RSA] Decryption failed: both current and previous keys failed');
  throw new Error('RSA 解密失败，密钥可能已失效');
}

/**
 * 获取密钥信息（用于调试，不返回私钥）
 */
export function getKeyInfo() {
  if (!cachedKeyPair) {
    const savedKeyPair = loadKeyPair();
    if (savedKeyPair) {
      cachedKeyPair = savedKeyPair;
      cachedKeyPairGeneratedAt = savedKeyPair.generatedAt;
    } else {
      cachedKeyPair = generateKeyPair();
      cachedKeyPairGeneratedAt = cachedKeyPair.generatedAt;
    }
  }

  return {
    generatedAt: cachedKeyPairGeneratedAt,
    expiresIn: Math.max(0, KEY_EXPIRY_MS - (Date.now() - cachedKeyPairGeneratedAt)),
  };
}
