import { Dialog } from './dialog';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmText = '确认', cancelText = '取消', danger = false, loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} data-name="confirmDialog">
      <p className="text-sm text-muted-foreground mb-6" data-name="confirmDesc">{description}</p>
      <div className="flex justify-end gap-3" data-name="confirmActions">
        <Button variant="ghost" onClick={onClose} disabled={loading} data-name="confirmCancelBtn">{cancelText}</Button>
        <Button
          variant={danger ? 'destructive' : 'default'}
          onClick={onConfirm}
          disabled={loading}
          data-name="confirmOkBtn"
        >
          {loading ? '处理中...' : confirmText}
        </Button>
      </div>
    </Dialog>
  );
}
