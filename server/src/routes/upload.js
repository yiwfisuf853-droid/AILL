import express from 'express';
import multer from 'multer';
import path from 'path';
import { generateId } from '../lib/id.js';
import { asyncHandler, ValidationError } from '../lib/errors.js';
import { created } from '../lib/response.js';

const router = express.Router();

// 文件存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${generateId()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.heic'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${ext}。支持的格式: JPG、PNG、GIF、WebP、SVG、BMP、TIFF、HEIC`));
    }
  },
});

// 单文件上传
router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('请选择文件');
  }
  const url = `/uploads/${req.file.filename}`;
  created(res, {
    url,
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
}));

export default router;
