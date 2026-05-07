/**
 * 图片压缩脚本 (R14-T8)
 * 读取 测试图片参考/ 目录，用 sharp 生成 4 种尺寸输出到 uploads/ 对应子目录
 * 输出：uploads/original/ uploads/large/ uploads/medium/ uploads/thumb/
 * 
 * 用法：node scripts/compress-images.js [--limit N]
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateId } from '../src/lib/id.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_DIR = path.join(ROOT, '测试图片参考');
const OUTPUT_BASE = path.join(__dirname, '..', 'uploads');

const SIZES = {
  original: { maxLongEdge: 4096, quality: 85 },
  large:    { maxLongEdge: 1920, quality: 80 },
  medium:   { maxLongEdge: 800,  quality: 75 },
  thumb:    { maxLongEdge: 400,  quality: 70 },  // square cover crop
};

const BATCH_LIMIT = parseInt(process.argv.find((a, i, arr) => arr[i-1] === '--limit') || '0');

// Ensure output directories
for (const size of Object.keys(SIZES)) {
  fs.mkdirSync(path.join(OUTPUT_BASE, size), { recursive: true });
}

async function processImage(filePath, index) {
  const fileId = generateId();
  const results = {};

  for (const [sizeName, config] of Object.entries(SIZES)) {
    const outName = `${fileId}-${sizeName}.webp`;
    const outPath = path.join(OUTPUT_BASE, sizeName, outName);

    try {
      let pipeline = sharp(filePath).rotate(); // auto-rotate based on EXIF

      if (sizeName === 'thumb') {
        // Square crop cover
        pipeline = pipeline.resize(config.maxLongEdge, config.maxLongEdge, {
          fit: 'cover',
          position: 'centre',
        });
      } else {
        // Scale down, preserve aspect ratio
        pipeline = pipeline.resize(config.maxLongEdge, config.maxLongEdge, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      await pipeline.webp({ quality: config.quality }).toFile(outPath);

      const meta = await sharp(outPath).metadata();
      results[sizeName] = {
        path: `/uploads/${sizeName}/${outName}`,
        width: meta.width,
        height: meta.height,
        size: fs.statSync(outPath).size,
      };
    } catch (err) {
      console.error(`  [${sizeName}] 处理失败: ${err.message}`);
      results[sizeName] = null;
    }
  }

  return { fileId, original: filePath, results };
}

async function main() {
  console.log('=== 图片压缩脚本 (R14-T8) ===');
  console.log(`源目录: ${SOURCE_DIR}`);
  console.log(`输出目录: ${OUTPUT_BASE}`);

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('源目录不存在');
    process.exit(1);
  }

  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => /\.(jpg|jpeg|png|gif|bmp|tiff|heic|webp)$/i.test(f))
    .sort();

  console.log(`发现 ${files.length} 张图片`);
  
  const limit = BATCH_LIMIT > 0 ? BATCH_LIMIT : files.length;
  const toProcess = files.slice(0, limit);
  console.log(`处理前 ${toProcess.length} 张\n`);

  const manifest = [];
  let processed = 0;
  let failed = 0;

  for (const file of toProcess) {
    const filePath = path.join(SOURCE_DIR, file);
    processed++;
    console.log(`[${processed}/${toProcess.length}] ${file} (${(fs.statSync(filePath).size / 1024 / 1024).toFixed(1)}MB)`);

    try {
      const result = await processImage(filePath, processed);
      manifest.push({ source: file, ...result });
      
      const origSize = result.results.original?.size || 0;
      console.log(`  → ${result.fileId} (original: ${(origSize/1024).toFixed(0)}KB)`);
    } catch (err) {
      console.error(`  ✗ 失败: ${err.message}`);
      failed++;
    }
  }

  // Write manifest
  const manifestPath = path.join(OUTPUT_BASE, 'image-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`\n=== 完成 ===`);
  console.log(`处理: ${processed - failed}/${processed}, 失败: ${failed}`);
  console.log(`映射清单: ${manifestPath}`);
}

main().catch(console.error);
