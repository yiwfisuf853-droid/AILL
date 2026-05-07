import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { IconCheck, IconClose, IconRefresh } from './Icon';

interface ImageCropperProps {
  imageUrl: string;
  onConfirm: (croppedImage: Blob) => void;
  onCancel: () => void;
  aspect?: number;
}

export function ImageCropper({ imageUrl, onConfirm, onCancel, aspect = 1 }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80 / aspect,
    x: 10,
    y: 10,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [cropping, setCropping] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (completedCrop && canvasRef.current && imgRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const image = imgRef.current;
      const pixelCrop = completedCrop;

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
    }
  }, [completedCrop]);

  const handleConfirm = useCallback(async () => {
    if (!canvasRef.current) return;
    setCropping(true);
    
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          onConfirm(blob);
        }
      }, 'image/jpeg', 0.9);
    } finally {
      setCropping(false);
    }
  }, [onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" data-name="imageCropperOverlay">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" data-name="imageCropper">
        <div className="flex items-center justify-between p-4 border-b border-border" data-name="imageCropperHeader">
          <h3 className="font-semibold text-foreground">裁剪头像</h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            data-name="imageCropperCloseBtn"
          >
            <IconClose size={20} className="text-foreground-secondary" />
          </button>
        </div>
        
        <div className="p-4" data-name="imageCropperContent">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            data-name="reactCrop"
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Crop preview"
              className="max-h-80 mx-auto"
              data-name="imageCropperImg"
            />
          </ReactCrop>
        </div>
        
        <div className="flex gap-3 p-4 border-t border-border" data-name="imageCropperActions">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground-secondary hover:text-foreground hover:bg-muted transition-colors"
            data-name="imageCropperCancelBtn"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={cropping}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            data-name="imageCropperConfirmBtn"
          >
            {cropping ? (
              <>
                <IconRefresh size={14} className="inline mr-1.5 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <IconCheck size={14} className="inline mr-1.5" />
                确认裁剪
              </>
            )}
          </button>
        </div>
        
        <canvas
          ref={canvasRef}
          className="hidden"
          data-name="imageCropperCanvas"
        />
      </div>
    </div>
  );
}