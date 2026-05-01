import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generateId } from '../lib/id.js';
import { asyncHandler, ValidationError } from '../lib/errors.js';
import { created } from '../lib/response.js';
import * as repo from '../models/repository.js';

const router = express.Router();

// 允许的扩展名 → 允许的 MIME 类型映射
const ALLOWED_TYPES = {
  '.jpg':  ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png':  ['image/png'],
  '.gif':  ['image/gif'],
  '.webp': ['image/webp'],
  '.bmp':  ['image/bmp'],
  '.tiff': ['image/tiff'],
  '.heic': ['image/heic', 'application/octet-stream'],
};
const ALLOWED_EXTENSIONS = new Set(Object.keys(ALLOWED_TYPES));

// 多尺寸配置
const SIZE_VARIANTS = {
  original: { maxLongEdge: 4096, quality: 85 },
  large:    { maxLongEdge: 1920, quality: 80 },
  medium:   { maxLongEdge: 800,  quality: 75 },
  thumb:    { maxLongEdge: 400,  quality: 70 },  // square crop
};

// 确保上传子目录存在
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
for (const size of Object.keys(SIZE_VARIANTS)) {
  fs.mkdirSync(path.join(uploadRoot, size), { recursive: true });
}

// 临时存储（先保存原图，处理后删除）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadRoot, { recursive: true });
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `tmp-${Date.now()}-${generateId()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB（压缩前）
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new ValidationError(`不支持的文件类型: ${ext}。支持的格式: JPG、PNG、GIF、WebP、BMP、TIFF、HEIC`), false);
    }
    const allowedMimes = ALLOWED_TYPES[ext];
    if (file.mimetype && !allowedMimes.includes(file.mimetype) && file.mimetype !== 'application/octet-stream') {
      return cb(new ValidationError(`文件 MIME 类型不匹配: ${file.mimetype}`), false);
    }
    cb(null, true);
  },
});

/**
 * 生成 4 种尺寸的 WebP 图片
 */
async function generateVariants(tmpPath, fileId) {
  const variants = {};
  const dimensions = {};

  for (const [sizeName, config] of Object.entries(SIZE_VARIANTS)) {
    const outName = `${fileId}-${sizeName}.webp`;
    const outPath = path.join(uploadRoot, sizeName, outName);

    try {
      let pipeline = sharp(tmpPath).rotate();

      if (sizeName === 'thumb') {
        pipeline = pipeline.resize(config.maxLongEdge, config.maxLongEdge, {
          fit: 'cover',
          position: 'centre',
        });
      } else {
        pipeline = pipeline.resize(config.maxLongEdge, config.maxLongEdge, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      await pipeline.webp({ quality: config.quality }).toFile(outPath);

      const meta = await sharp(outPath).metadata();
      variants[sizeName] = `/uploads/${sizeName}/${outName}`;

      // 记录 original 的尺寸
      if (sizeName === 'original') {
        dimensions.width = meta.width;
        dimensions.height = meta.height;
      }
    } catch (err) {
      console.error(`[upload] 生成 ${sizeName} 失败:`, err.message);
      variants[sizeName] = null;
    }
  }

  return { variants, dimensions };
}

// 单文件上传（多尺寸生成）
router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('请选择文件');
  }

  const tmpPath = req.file.path;

  try {
    // 验证是有效图片
    const metadata = await sharp(tmpPath).metadata();
    if (!metadata.width || !metadata.height) {
      fs.unlinkSync(tmpPath);
      throw new ValidationError('无法识别图片尺寸，文件可能已损坏');
    }

    const fileId = generateId();
    const { variants, dimensions } = await generateVariants(tmpPath, fileId);

    // 删除临时文件
    try { fs.unlinkSync(tmpPath); } catch {}

    // 写入 file_metadata 表
    try {
      await repo.insert('file_metadata', {
        id: fileId,
        fileKey: `${fileId}-original`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: 'image/webp',
        width: dimensions.width || null,
        height: dimensions.height || null,
        duration: null,
        variants: variants,
        uploadedBy: req.user?.id || 'anonymous',
        uploadedAt: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.error('[upload] file_metadata 写入失败:', dbErr.message);
      // 不阻塞返回，文件已生成
    }

    // 兼容旧接口：返回 url 字段指向 medium 尺寸
    created(res, {
      url: variants.medium,
      original: variants.original,
      large: variants.large,
      medium: variants.medium,
      thumb: variants.thumb,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: 'image/webp',
      width: dimensions.width,
      height: dimensions.height,
    });
  } catch (err) {
    // 确保临时文件被清理
    try { fs.unlinkSync(tmpPath); } catch {}
    throw err;
  }
}));

export default router;
