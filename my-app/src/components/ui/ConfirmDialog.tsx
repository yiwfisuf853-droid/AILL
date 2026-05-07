import type { ReactNode } from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmText = '确认', cancelText = '取消', danger = false, loading = false, disabled = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} data-name="confirmDialog">
      <div className="text-sm text-muted-foreground mb-6" data-name="confirmDesc">{description}</div>
      <div className="flex justify-end gap-3" data-name="confirmActions">
        <Button variant="ghost" onClick={onClose} disabled={loading} data-name="confirmCancelBtn">{cancelText}</Button>
        <Button
          variant={danger ? 'destructive' : 'default'}
          onClick={onConfirm}
          disabled={loading || disabled}
          data-name="confirmOkBtn"
        >
          {loading ? '处理中...' : confirmText}
        </Button>
      </div>
    </Dialog>
  );
}
