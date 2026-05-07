import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { IconClose, IconImage, IconRefresh, IconUpload } from '@/components/ui/Icon';
import { toast } from './Toast';
import { api } from '@/lib/api';

/* ═══════════════════════════════════════════════════════════════
   MediaUploader — 统一媒体上传组件
   支持拖拽/点击上传、多文件、进度条、缩略图预览、删除、重试
   ═══════════════════════════════════════════════════════════════ */

// ─── 类型 ───

interface MediaUploaderProps {
  /** 已上传的 URL 列表（受控） */
  value?: string[];
  /** 变更回调 */
  onChange?: (urls: string[]) => void;
  /** 最大文件数 */
  maxCount?: number;
  /** 最大单文件大小 MB */
  maxSize?: number;
  /** 接受的文件类型 */
  accept?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

type FileStatus = 'uploading' | 'success' | 'error';

interface UploadingFile {
  /** 本地唯一标识 */
  uid: string;
  /** 原始 File 对象 */
  file: File;
  /** 缩略图 blob URL */
  thumbnailUrl: string;
  /** 上传状态 */
  status: FileStatus;
  /** 上传进度 0-100 */
  progress: number;
  /** 上传成功后的远端 URL */
  remoteUrl?: string;
  /** 失败原因 */
  errorMessage?: string;
}

// ─── 默认值 ───

const DEFAULT_ACCEPT = 'image/jpg,image/jpeg,image/png,image/gif,image/webp';
const DEFAULT_MAX_COUNT = 9;
const DEFAULT_MAX_SIZE = 10; // MB

// ─── 上传函数 ───

/**
 * 上传单个文件到服务器
 * TODO: 如果 /api/upload 接口不可用，替换为真实 API 调用
 * 当前使用真实 /api/upload (POST multipart/form-data)，返回 { success: true, data: { url: string } }
 * 备用模拟上传函数见 uploadFileMock
 */
async function uploadFile(
  file: File,
  onProgress: (progress: number) => void,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post('/api/upload', formData, {
    onUploadProgress: (event) => {
      if (event.total) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    },
  });

  if (data?.success && data?.data?.url) {
    return data.data.url;
  }

  throw new Error(data?.error || '上传失败');
}

/**
 * 模拟上传函数（仅用于开发调试，接口不可用时替代）
 * TODO: 替换为真实 API 调用
 */
async function uploadFileMock(
  _file: File,
  onProgress: (progress: number) => void,
): Promise<string> {
  // TODO: 替换为真实 API 调用
  const total = 5;
  for (let i = 1; i <= total; i++) {
    await new Promise<void>((r) => setTimeout(r, 300));
    onProgress(Math.round((i / total) * 100));
  }
  // 模拟返回 URL
  return `https://placehold.co/400x300?text=Uploaded`;
}

// ─── 工具函数 ───

let uidCounter = 0;
function generateUid(): string {
  return `mu-${Date.now()}-${++uidCounter}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── 组件 ───

export function MediaUploader({
  value = [],
  onChange,
  maxCount = DEFAULT_MAX_COUNT,
  maxSize = DEFAULT_MAX_SIZE,
  accept = DEFAULT_ACCEPT,
  disabled = false,
}: MediaUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 已上传数量 = 受控 URL 数 + 正在上传数
  const totalCount = value.length + uploadingFiles.filter((f) => f.status === 'uploading').length;
  const canAddMore = totalCount < maxCount && !disabled;

  // 同步上传成功的文件到 value
  useEffect(() => {
    const succeeded = uploadingFiles.filter((f) => f.status === 'success' && f.remoteUrl);
    if (succeeded.length > 0) {
      const newUrls = [...value];
      for (const f of succeeded) {
        if (f.remoteUrl && !newUrls.includes(f.remoteUrl)) {
          newUrls.push(f.remoteUrl);
        }
      }
      // 清除已同步的上传记录
      setUploadingFiles((prev) => prev.filter((f) => f.status !== 'success'));
      onChange?.(newUrls);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadingFiles]);

  // 清理缩略图 blob URL
  useEffect(() => {
    return () => {
      uploadingFiles.forEach((f) => URL.revokeObjectURL(f.thumbnailUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 处理文件校验与上传 ───

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // 检查总数量限制
      const remaining = maxCount - value.length - uploadingFiles.filter((f) => f.status === 'uploading').length;
      if (remaining <= 0) {
        toast.error(`最多上传 ${maxCount} 个文件`);
        return;
      }

      const toProcess = fileArray.slice(0, remaining);
      if (toProcess.length < fileArray.length) {
        toast.warning(`仅选取前 ${remaining} 个文件，已达上限`);
      }

      // 校验每个文件
      const validFiles: File[] = [];
      for (const file of toProcess) {
        // 类型校验
        const acceptTypes = accept.split(',').map((t) => t.trim().toLowerCase());
        const fileType = file.type.toLowerCase();
        const isTypeAccepted = acceptTypes.some((t) => {
          if (t.endsWith('/*')) return fileType.startsWith(t.replace('/*', '/'));
          return t === fileType;
        });
        if (!isTypeAccepted) {
          toast.error(`不支持的文件类型: ${file.name}`);
          continue;
        }

        // 大小校验
        if (file.size > maxSize * 1024 * 1024) {
          toast.error(`${file.name} 超过 ${maxSize}MB 限制`);
          continue;
        }

        validFiles.push(file);
      }

      // 创建上传记录并开始上传
      for (const file of validFiles) {
        const uid = generateUid();
        const thumbnailUrl = URL.createObjectURL(file);

        const entry: UploadingFile = {
          uid,
          file,
          thumbnailUrl,
          status: 'uploading',
          progress: 0,
        };

        setUploadingFiles((prev) => [...prev, entry]);

        // 异步上传
        uploadFile(file, (progress) => {
          setUploadingFiles((prev) =>
            prev.map((f) => (f.uid === uid ? { ...f, progress } : f)),
          );
        })
          .then((url) => {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.uid === uid ? { ...f, status: 'success', progress: 100, remoteUrl: url } : f,
              ),
            );
          })
          .catch((err) => {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.uid === uid
                  ? { ...f, status: 'error', errorMessage: err?.message || '上传失败' }
                  : f,
              ),
            );
          });
      }
    },
    [value, maxCount, maxSize, accept, uploadingFiles],
  );

  // ─── 重试上传 ───

  const handleRetry = useCallback(
    (uid: string) => {
      const entry = uploadingFiles.find((f) => f.uid === uid);
      if (!entry) return;

      // 重置状态
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.uid === uid ? { ...f, status: 'uploading', progress: 0, errorMessage: undefined } : f,
        ),
      );

      uploadFile(entry.file, (progress) => {
        setUploadingFiles((prev) =>
          prev.map((f) => (f.uid === uid ? { ...f, progress } : f)),
        );
      })
        .then((url) => {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.uid === uid ? { ...f, status: 'success', progress: 100, remoteUrl: url } : f,
            ),
          );
        })
        .catch((err) => {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.uid === uid
                ? { ...f, status: 'error', errorMessage: err?.message || '上传失败' }
                : f,
            ),
          );
        });
    },
    [uploadingFiles],
  );

  // ─── 删除已上传文件 ───

  const handleRemoveUploaded = useCallback(
    (index: number) => {
      const newUrls = [...value];
      newUrls.splice(index, 1);
      onChange?.(newUrls);
    },
    [value, onChange],
  );

  // ─── 删除上传中的文件 ───

  const handleRemoveUploading = useCallback((uid: string) => {
    setUploadingFiles((prev) => {
      const target = prev.find((f) => f.uid === uid);
      if (target) URL.revokeObjectURL(target.thumbnailUrl);
      return prev.filter((f) => f.uid !== uid);
    });
  }, []);

  // ─── 拖拽事件 ───

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [disabled, processFiles],
  );

  // ─── 点击选择文件 ───

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      // 重置 input 以便同一文件可以再次选择
      e.target.value = '';
    },
    [processFiles],
  );

  // ─── 渲染 ───

  return (
    <div
      data-name="mediaUploader"
      className="w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 预览网格：已上传 + 上传中 */}
      {(value.length > 0 || uploadingFiles.length > 0) && (
        <div
          data-name="previewGrid"
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-2"
        >
          {/* 已上传的文件（受控 value） */}
          {value.map((url, index) => (
            <div
              key={`uploaded-${index}`}
              data-name="previewItem"
              className="relative aspect-square rounded-lg border border-border overflow-hidden group"
            >
              <img
                src={url}
                alt={`已上传 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveUploaded(index)}
                  data-name="removeBtn"
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  title="删除"
                >
                  <IconClose size={12} />
                </button>
              )}
            </div>
          ))}

          {/* 上传中的文件 */}
          {uploadingFiles.map((item) => (
            <div
              key={item.uid}
              data-name="previewItem"
              className={cn(
                'relative aspect-square rounded-lg border overflow-hidden',
                item.status === 'error' ? 'border-destructive' : 'border-border',
              )}
            >
              {/* 缩略图 */}
              <img
                src={item.thumbnailUrl}
                alt="上传中"
                className="w-full h-full object-cover"
              />

              {/* 进度遮罩（上传中） */}
              {item.status === 'uploading' && (
                <div
                  data-name="progressOverlay"
                  className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1"
                >
                  {/* 进度条 */}
                  <div
                    data-name="progressBar"
                    className="w-3/4 h-1.5 rounded-full bg-white/20 overflow-hidden"
                  >
                    <div
                      data-name="progressFill"
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span
                    data-name="progressText"
                    className="text-xs text-white/90 font-medium"
                  >
                    {item.progress}%
                  </span>
                </div>
              )}

              {/* 失败遮罩 */}
              {item.status === 'error' && (
                <div
                  data-name="errorOverlay"
                  className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1"
                >
                  <IconImage size={20} className="text-white/70" />
                  <span
                    data-name="errorText"
                    className="text-xs text-white/90 text-center px-1 leading-tight"
                  >
                    {item.errorMessage || '上传失败'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRetry(item.uid)}
                    data-name="retryBtn"
                    className="mt-0.5 flex items-center gap-0.5 text-xs text-primary-foreground bg-primary rounded px-1.5 py-0.5 hover:bg-primary-hover transition-colors"
                    title="重试"
                  >
                    <IconRefresh size={10} />
                    重试
                  </button>
                </div>
              )}

              {/* 删除按钮（右上角） */}
              <button
                type="button"
                onClick={() => handleRemoveUploading(item.uid)}
                data-name="removeBtn"
                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity"
                title="移除"
              >
                <IconClose size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 上传区域 */}
      {canAddMore && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          data-name="uploadZone"
          className={cn(
            'flex flex-col items-center justify-center w-full h-28 rounded-lg border-2 border-dashed transition-colors cursor-pointer',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/50 hover:bg-surface/50',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <IconUpload
            size={28}
            className={cn('mb-1.5', dragOver ? 'text-primary' : 'text-muted-foreground')}
          />
          <span
            data-name="uploadZoneText"
            className={cn(
              'text-sm',
              dragOver ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            点击或拖拽上传
          </span>
          <span
            data-name="uploadZoneHint"
            className="text-xs text-foreground-tertiary mt-0.5"
          >
            支持 JPG、PNG、GIF、WebP，最多 {maxCount} 个，单个最大 {maxSize}MB
          </span>
        </button>
      )}

      {/* 已达上限提示 */}
      {!canAddMore && value.length > 0 && (
        <div
          data-name="uploadFullTip"
          className="text-xs text-foreground-tertiary text-center py-2"
        >
          已达上传上限 ({maxCount} 个)
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
