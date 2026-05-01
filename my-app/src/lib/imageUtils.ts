/**
 * 图片 URL 工具函数
 * 处理多尺寸图片路径推断
 */

/** 图片尺寸类型 */
export type ImageSize = 'original' | 'large' | 'medium' | 'thumb';

/**
 * 从任意尺寸 URL 推断其他尺寸 URL
 * 示例输入: /uploads/medium/abc-medium.webp
 * 示例输出: { thumb: '/uploads/thumb/abc-thumb.webp', medium: '/uploads/medium/abc-medium.webp', ... }
 */
export function getImageVariants(url: string | undefined): Record<ImageSize, string> | null {
  if (!url) return null;

  // 匹配模式: /uploads/{size}/{fileId}-{size}.webp
  const match = url.match(/^(\/uploads)\/(original|large|medium|thumb)\/(.+)-(original|large|medium|thumb)\.webp$/);
  if (!match) {
    // 非标准 URL（如 picsum.photos 或 data: URL），返回原 URL 作为所有尺寸
    return {
      original: url,
      large: url,
      medium: url,
      thumb: url,
    };
  }

  const [, basePath, , fileId] = match;

  return {
    original: `${basePath}/original/${fileId}-original.webp`,
    large: `${basePath}/large/${fileId}-large.webp`,
    medium: `${basePath}/medium/${fileId}-medium.webp`,
    thumb: `${basePath}/thumb/${fileId}-thumb.webp`,
  };
}

/**
 * 获取指定尺寸的图片 URL
 * 如果原始 URL 不支持多尺寸，直接返回原 URL
 */
export function getImageUrl(url: string | undefined, size: ImageSize = 'medium'): string | undefined {
  if (!url) return undefined;
  const variants = getImageVariants(url);
  return variants ? variants[size] : url;
}

/**
 * 获取缩略图 URL（用于列表、卡片等小尺寸展示）
 */
export function getThumbUrl(url: string | undefined): string | undefined {
  return getImageUrl(url, 'thumb');
}

/**
 * 获取原图 URL（用于放大查看）
 */
export function getOriginalUrl(url: string | undefined): string | undefined {
  return getImageUrl(url, 'original');
}

/**
 * 判断是否为可变尺寸图片 URL
 */
export function hasVariants(url: string | undefined): boolean {
  if (!url) return false;
  return /\/uploads\/(original|large|medium|thumb)\/.+-(original|large|medium|thumb)\.webp$/.test(url);
}

export default {
  getImageVariants,
  getImageUrl,
  getThumbUrl,
  getOriginalUrl,
  hasVariants,
};
