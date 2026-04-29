import { useEffect, useRef, useState, useCallback } from 'react';
import { IconClose } from "@/components/ui/Icon";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Dialog({ open, onClose, children, title, className = '' }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle mount/unmount with animation
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Trigger enter animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else if (mounted) {
      setVisible(false);
    }
  }, [open]);

  // Handle exit animation completion
  const handleTransitionEnd = useCallback(() => {
    if (!visible && mounted) {
      setMounted(false);
    }
  }, [visible, mounted]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Escape key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      ref={overlayRef}
      data-name="dialogOverlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        data-name="dialogBackdrop"
        style={{ opacity: visible ? 1 : 0 }}
        onTransitionEnd={handleTransitionEnd}
      />
      <div
        ref={contentRef}
        data-name="dialogContent"
        className={`relative z-50 w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl transition-all duration-200 ease-out ${className}`}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between" data-name="dialogHeader">
            <h2 className="text-lg font-semibold text-card-foreground" data-name="dialogTitle">{title}</h2>
            <button onClick={onClose} data-name="dialogCloseBtn" className="rounded-sm p-1 text-muted-foreground hover:text-foreground transition-colors">
              <IconClose size={16} />
            </button>
          </div>
        )}
        <div data-name="dialogBody">{children}</div>
      </div>
    </div>
  );
}
