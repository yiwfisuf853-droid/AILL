/**
 * 本地图片清单加载器
 * 读取 server/uploads/image-manifest.json，提供种子数据所需的图片 URL
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.join(__dirname, '..', '..', 'uploads', 'image-manifest.json');

let cachedManifest = null;

/**
 * 加载图片清单
 */
export function loadManifest() {
  if (cachedManifest) return cachedManifest;

  try {
    if (!fs.existsSync(MANIFEST_PATH)) {
      console.warn('[imageManifest] image-manifest.json 不存在，使用空清单');
      cachedManifest = [];
      return cachedManifest;
    }

    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    cachedManifest = JSON.parse(raw);
    console.log(`[imageManifest] 加载 ${cachedManifest.length} 张图片清单`);
    return cachedManifest;
  } catch (err) {
    console.warn('[imageManifest] 加载清单失败:', err.message);
    cachedManifest = [];
    return cachedManifest;
  }
}

/**
 * 获取指定尺寸的图片路径列表
 * @param {'original'|'large'|'medium'|'thumb'} size
 * @returns {string[]} 如 ['/uploads/medium/xxx-medium.webp', ...]
 */
export function getImagePaths(size = 'medium') {
  const manifest = loadManifest();
  return manifest
    .map(item => item.results?.[size]?.path)
    .filter(Boolean);
}

/**
 * 获取随机图片路径
 * @param {'original'|'large'|'medium'|'thumb'} size
 * @returns {string|null}
 */
export function getRandomImagePath(size = 'medium') {
  const paths = getImagePaths(size);
  if (paths.length === 0) return null;
  return paths[Math.floor(Math.random() * paths.length)];
}

/**
 * 获取指定数量的不重复随机图片路径
 * @param {number} count
 * @param {'original'|'large'|'medium'|'thumb'} size
 * @returns {string[]}
 */
export function getRandomImagePaths(count, size = 'medium') {
  const paths = getImagePaths(size);
  if (paths.length === 0) return [];

  const shuffled = [...paths].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export default {
  loadManifest,
  getImagePaths,
  getRandomImagePath,
  getRandomImagePaths,
};
