import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconClose, IconZoomIn, IconZoomOut, IconChevronLeft, IconChevronRight } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';
import type { ImageSize } from '@/lib/imageUtils';

interface ImageLightboxProps {
  /** 图片 URL 列表（支持任意尺寸，内部自动切换到 original） */
  images: string[];
  /** 初始显示的图片索引 */
  initialIndex?: number;
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, open, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  // 打开时重置状态
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  // 键盘事件
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, currentIndex]);

  // 禁止背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  const prev = useCallback(() => {
    setCurrentIndex(i => Math.max(0, i - 1));
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const next = useCallback(() => {
    setCurrentIndex(i => Math.min(images.length - 1, i + 1));
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const zoomIn = useCallback(() => {
    setScale(s => Math.min(5, s * 1.3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(s => {
      const next = Math.max(0.5, s / 1.3);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }, [zoomIn, zoomOut]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: posStart.current.x + (e.clientX - dragStart.current.x),
      y: posStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // 点击背景关闭（不响应图片拖拽释放）
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!open || images.length === 0) return null;

  const currentSrc = getImageUrl(images[currentIndex], 'original' as ImageSize) || images[currentIndex];
  const hasMultiple = images.length > 1;

  return createPortal(
    <div
      data-name="lightboxOverlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 顶部工具栏 */}
      <div
        data-name="lightboxToolbar"
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
      >
        <span className="text-white/70 text-sm">
          {currentIndex + 1} / {images.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            data-name="lightboxZoomOutBtn"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="缩小 (-)"
          >
            <IconZoomOut size={18} />
          </button>
          <span className="text-white/70 text-xs min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            data-name="lightboxZoomInBtn"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="放大 (+)"
          >
            <IconZoomIn size={18} />
          </button>
          <button
            onClick={onClose}
            data-name="lightboxCloseBtn"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors ml-2"
            title="关闭 (Esc)"
          >
            <IconClose size={18} />
          </button>
        </div>
      </div>

      {/* 图片区域 */}
      <div
        data-name="lightboxImageContainer"
        className="flex items-center justify-center w-full h-full pt-14 pb-4 px-12"
        onWheel={handleWheel}
      >
        {/* 左箭头 */}
        {hasMultiple && currentIndex > 0 && (
          <button
            onClick={prev}
            data-name="lightboxPrevBtn"
            className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            title="上一张 (←)"
          >
            <IconChevronLeft size={24} />
          </button>
        )}

        {/* 图片 */}
        <img
          src={currentSrc}
          alt=""
          data-name="lightboxImage"
          className={cn(
            'max-w-full max-h-full object-contain select-none transition-transform duration-150',
            isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-zoom-in'
          )}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
          onMouseDown={handleMouseDown}
          onClick={() => { if (scale === 1) zoomIn(); }}
          draggable={false}
        />

        {/* 右箭头 */}
        {hasMultiple && currentIndex < images.length - 1 && (
          <button
            onClick={next}
            data-name="lightboxNextBtn"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            title="下一张 (→)"
          >
            <IconChevronRight size={24} />
          </button>
        )}
      </div>

      {/* 底部提示 */}
      <div data-name="lightboxHint" className="absolute bottom-3 left-0 right-0 text-center text-white/40 text-xs">
        滚轮缩放 · 拖拽移动 · 点击放大 · Esc 关闭
      </div>
    </div>,
    document.body
  );
}

export default ImageLightbox;
