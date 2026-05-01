import { useCallback, useRef, useState } from 'react';
import { IconClose, IconUpload } from "@/components/ui/Icon";
import { toast } from './Toast';
import { ImageCropper } from './ImageCropper';
import { api } from '@/lib/api';

interface FileUploadProps {
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
  placeholder?: string;
  enableCrop?: boolean;
}

const compressImage = async (file: File, maxSizeMB: number = 2): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const maxDimension = 1200;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建画布'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      let quality = 0.9;
      
      const tryCompress = () => {
        canvas.toBlob((b) => {
          if (!b) {
            reject(new Error('压缩失败'));
            return;
          }
          
          if (b.size > maxSizeMB * 1024 * 1024 && quality > 0.1) {
            quality -= 0.1;
            tryCompress();
          } else {
            const compressedFile = new File([b], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }
        }, 'image/jpeg', quality);
      };
      
      tryCompress();
    };
    
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });
};

export function FileUpload({
  value,
  onChange,
  accept = 'image/*',
  maxSize = 10,
  className = '',
  placeholder = '点击或拖拽上传图片',
  enableCrop = true,
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`文件大小不能超过 ${maxSize}MB`);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff', 'image/heic'];
    const fileType = file.type.toLowerCase();
    
    if (!fileType.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    if (!validTypes.includes(fileType)) {
      toast.warning('该图片格式可能不支持，正在尝试转换...');
    }

    setUploading(true);
    try {
      const compressedFile = await compressImage(file, Math.min(maxSize, 2));
      
      if (enableCrop) {
        const url = URL.createObjectURL(compressedFile);
        setCropImageUrl(url);
        setCropFile(compressedFile);
        setShowCropper(true);
      } else {
        await uploadToServer(compressedFile, onChange);
      }
    } catch (err) {
      toast.error('图片处理失败，请尝试其他图片');
    } finally {
      setUploading(false);
    }
  }, [maxSize, onChange, enableCrop]);

  const uploadToServer = async (file: File, onSuccess: (url: string) => void) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/api/upload', formData);
      if (data.success && data.data?.url) {
        onSuccess(data.data.url);
        toast.success('上传成功');
      } else {
        toast.error(data.error || '上传失败');
      }
    } catch {
      toast.error('上传失败');
    }
  };

  const handleCropConfirm = useCallback(async (croppedImage: Blob) => {
    const file = new File([croppedImage], 'cropped-avatar.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    await uploadToServer(file, onChange);
    setShowCropper(false);
    setCropImageUrl('');
    setCropFile(null);
  }, [onChange]);

  const handleCropCancel = useCallback(() => {
    setShowCropper(false);
    setCropImageUrl('');
    setCropFile(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) uploadFile(file);
        break;
      }
    }
  }, [uploadFile]);

  return (
    <>
      <div
        data-name="fileUpload"
        className={`relative ${className}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
      >
        {value ? (
          <div className="relative group rounded-lg border border-border overflow-hidden" data-name="fileUploadPreview">
            <img src={value} alt="preview" data-name="fileUploadImg" className="w-full h-40 object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => inputRef.current?.click()}
                className="p-2 rounded-full bg-white/90 text-foreground hover:bg-white transition-colors"
                data-name="fileUploadChangeBtn"
                title="更换图片"
              >
                <IconUpload size={16} />
              </button>
              <button
                onClick={() => onChange('')}
                className="p-2 rounded-full bg-white/90 text-destructive hover:bg-white transition-colors"
                data-name="fileUploadRemoveBtn"
                title="移除图片"
              >
                <IconClose size={16} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            data-name="fileUploadBtn"
            className={`flex flex-col items-center justify-center w-full h-40 rounded-lg border-2 border-dashed transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/50'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {uploading ? (
              <div data-name="fileUploadSpinner" className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <IconUpload size={32} className="text-muted-foreground mb-2" data-name="fileUploadIcon" />
                <span className="text-sm text-muted-foreground" data-name="fileUploadText">{placeholder}</span>
                <span className="text-xs text-foreground-tertiary mt-1" data-name="fileUploadHint">
                  支持 JPG、PNG、GIF、WebP、BMP 等格式，最大 {maxSize}MB
                </span>
              </>
            )}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {showCropper && cropImageUrl && (
        <ImageCropper
          imageUrl={cropImageUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          aspect={1}
        />
      )}
    </>
  );
}