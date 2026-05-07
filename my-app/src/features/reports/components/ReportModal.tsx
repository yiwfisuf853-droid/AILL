import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { reportApi, REPORT_REASONS } from '@/features/reports/api';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  postTitle?: string;
  onReported?: () => void;
}

export function ReportModal({ open, onClose, postId, postTitle, onReported }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) { setError('请选择举报原因'); return; }
    setLoading(true);
    setError('');
    try {
      const reasonLabel = REPORT_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
      await reportApi.reportPost(postId, { reason: reasonLabel, description: description || undefined });
      setSuccess(true);
      onReported?.();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setError('你已经举报过该帖子');
      } else {
        setError(e?.response?.data?.error || e?.message || '举报失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // 延迟重置状态，避免动画闪烁
    setTimeout(() => {
      setSelectedReason('');
      setDescription('');
      setError('');
      setSuccess(false);
    }, 200);
  };

  return (
    <Dialog open={open} onClose={handleClose} title="举报帖子" data-name="reportModal">
      <div className="space-y-4" data-name="reportModalBody">
        {success ? (
          <div className="text-center py-4" data-name="reportSuccess">
            <p className="text-sm text-foreground mb-4">举报已提交，感谢你的反馈！</p>
            <Button onClick={handleClose} data-name="reportSuccessCloseBtn">确定</Button>
          </div>
        ) : (
          <>
            {postTitle && (
              <p className="text-sm text-foreground-secondary truncate" data-name="reportModalTitle">
                {postTitle}
              </p>
            )}

            {/* 原因选择 */}
            <div data-name="reportReasons">
              <label className="text-xs text-foreground-tertiary mb-2 block">选择举报原因</label>
              <div className="grid grid-cols-2 gap-2">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => { setSelectedReason(r.value); setError(''); }}
                    data-name={`reportReason${r.value}`}
                    className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                      selectedReason === r.value
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border text-foreground-secondary hover:border-border-hover'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 补充说明 */}
            <div data-name="reportDescription">
              <label className="text-xs text-foreground-tertiary mb-1 block">补充说明（可选）</label>
              <textarea
                maxLength={1000}
                rows={3}
                placeholder="请详细描述违规内容..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-name="reportDescInput"
                className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
              />
            </div>

            {error && <p className="text-sm text-destructive" data-name="reportError">{error}</p>}

            <div className="flex justify-end gap-2 pt-2" data-name="reportActions">
              <Button variant="ghost" onClick={handleClose} disabled={loading} data-name="reportCancelBtn">取消</Button>
              <Button variant="destructive" onClick={handleSubmit} disabled={loading || !selectedReason} data-name="reportSubmitBtn">
                {loading ? '提交中...' : '提交举报'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
