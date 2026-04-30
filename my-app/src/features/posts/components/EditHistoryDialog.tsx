import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { IconClock } from '@/components/ui/Icon';
import { postApi } from '@/features/posts/api';
import type { EditHistoryItem } from '@/features/posts/types';

interface EditHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  postId: string;
}

export function EditHistoryDialog({ open, onClose, postId }: EditHistoryDialogProps) {
  const [history, setHistory] = useState<EditHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (open && postId) {
      setLoading(true);
      postApi.getEditHistory(postId, 1, 20)
        .then(res => {
          setHistory(res.list || []);
          setTotal(res.total || 0);
        })
        .catch(() => { setHistory([]); setTotal(0); })
        .finally(() => setLoading(false));
    }
  }, [open, postId]);

  return (
    <Dialog open={open} onClose={onClose} title="编辑历史" className="max-w-2xl">
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && history.length === 0 && (
        <div className="py-8 text-center text-sm text-foreground-secondary" data-name="editHistoryEmpty">
          暂无编辑记录
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto" data-name="editHistoryList">
          {history.map(item => (
            <div key={item.id} className="surfacePanel p-3" data-name={`editHistoryItem${item.id}`}>
              <div className="flex items-center gap-2 mb-2 text-xs text-foreground-tertiary" data-name={`editHistoryMeta${item.id}`}>
                <IconClock size={12} />
                <span>{new Date(item.createdAt).toLocaleString('zh-CN')}</span>
                {item.editorName && <span className="text-foreground-secondary">by {item.editorName}</span>}
                {item.reason && (
                  <span className="inlineChip text-[10px]" data-name={`editHistoryReason${item.id}`}>{item.reason}</span>
                )}
              </div>
              {(item.titleBefore || item.titleAfter) && (
                <div className="text-xs mb-1" data-name={`editHistoryTitleDiff${item.id}`}>
                  <span className="text-foreground-tertiary">标题：</span>
                  {item.titleBefore && <span className="line-through text-destructive/70 mr-2">{item.titleBefore}</span>}
                  {item.titleAfter && <span className="text-primary">{item.titleAfter}</span>}
                </div>
              )}
              {(item.contentBefore || item.contentAfter) && (
                <div className="grid grid-cols-2 gap-2" data-name={`editHistoryContentDiff${item.id}`}>
                  {item.contentBefore && (
                    <div className="rounded bg-destructive/5 border border-destructive/20 p-2 text-xs text-foreground-secondary max-h-24 overflow-hidden" data-name={`editHistoryContentBefore${item.id}`}>
                      <div className="text-[10px] text-destructive/60 mb-1">修改前</div>
                      <div className="line-clamp-4">{item.contentBefore}</div>
                    </div>
                  )}
                  {item.contentAfter && (
                    <div className="rounded bg-primary/5 border border-primary/20 p-2 text-xs text-foreground-secondary max-h-24 overflow-hidden" data-name={`editHistoryContentAfter${item.id}`}>
                      <div className="text-[10px] text-primary/60 mb-1">修改后</div>
                      <div className="line-clamp-4">{item.contentAfter}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {total > 20 && (
            <div className="text-xs text-foreground-tertiary text-center py-2" data-name="editHistoryMore">
              显示前 20 条，共 {total} 条记录
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
