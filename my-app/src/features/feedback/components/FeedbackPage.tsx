import { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { feedbackApi, type Feedback } from '../api';
import { IconCheck, IconChevronLeft, IconClock, IconComment, IconSave, IconWarning } from "@/components/ui/Icon";

const TYPE_OPTIONS = [
  { value: 'bug', label: 'Bug 反馈', color: 'destructive' },
  { value: 'feature', label: '功能建议', color: 'primary' },
  { value: 'complaint', label: '投诉', color: 'accent' },
  { value: 'other', label: '其他', color: 'foreground-secondary' },
];

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  pending: { label: '待处理', icon: IconClock, cls: 'bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,55%)] border border-[hsl(38,92%,50%)]/20' },
  processing: { label: '处理中', icon: IconWarning, cls: 'bg-primary/10 text-primary border border-primary/20' },
  resolved: { label: '已解决', icon: IconCheck, cls: 'bg-[hsl(160,70%,45%)]/10 text-[hsl(160,70%,50%)] border border-[hsl(160,70%,45%)]/20' },
};

export function FeedbackPage() {
  const { user } = useAuthStore();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [type, setType] = useState('bug');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    feedbackApi.getUserFeedbacks(user.id).then(setFeedbacks).catch(() => {});
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setSubmitting(true); setMsg(null);
    try {
      const fb = await feedbackApi.createFeedback({ type, title: title.trim(), content: content.trim() });
      setFeedbacks(prev => [fb, ...prev]);
      setTitle(''); setContent('');
      setMsg({ type: 'ok', text: '反馈已提交' });
    } catch { setMsg({ type: 'err', text: '提交失败' }); }
    finally { setSubmitting(false); }
  };

  const inputCls = 'w-full rounded-lg border border-border/60 bg-background-elevated px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary/60 focus:border-[hsl(28,90%,50%)]/40 focus:outline-none transition-colors';

  return (
    <div className="py-4" data-name="feedback">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5" data-name="feedbackHeader">
        <button onClick={() => window.history.back()} className="flex items-center gap-1 text-foreground-tertiary hover:text-foreground transition-colors text-sm" data-name="feedbackBackBtn">
          <IconChevronLeft size={16} /> 返回
        </button>
        <div className="sectionHeaderBar" style={{ background: 'hsl(262,83%,68%)' }} />
        <h1 className="text-lg font-bold text-foreground" data-name="feedbackTitle">意见反馈</h1>
      </div>

      {/* Submit form */}
      <div className="surfacePanel p-5 mb-6 space-y-4" data-name="feedbackForm">
        <div>
          <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="feedbackTypeLabel">类型</label>
          <div className="flex gap-1.5 flex-wrap" data-name="feedbackTypeBtns">
            {TYPE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setType(opt.value)}
                data-name={`feedbackTypeBtn${opt.value}`}
                className={`inlineChip text-xs ${type === opt.value ? 'bg-primary text-white' : 'bg-muted/50 text-foreground-secondary hover:text-foreground'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="feedbackTitleLabel">标题</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="简要描述你的反馈" className={inputCls} data-name="feedbackTitleInput" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="feedbackContentLabel">详细内容</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="详细描述..." className={`${inputCls} resize-none`} data-name="feedbackContentInput" />
        </div>
        {msg && (
          <div className={`text-xs px-3 py-2 rounded-lg ${msg.type === 'ok' ? 'bg-[hsl(160,70%,45%)]/10 text-[hsl(160,70%,50%)]' : 'bg-destructive/10 text-destructive'}`} data-name="feedbackMessage">
            {msg.text}
          </div>
        )}
        <button onClick={handleSubmit} disabled={submitting || !title.trim() || !content.trim()}
          className="btnWarm flex items-center gap-1.5 px-5 py-2.5 text-sm disabled:opacity-50" data-name="feedbackSubmitBtn">
          <IconSave size={14} /> {submitting ? '提交中...' : '提交反馈'}
        </button>
      </div>

      {/* Feedback history */}
      <div className="sectionDivider" />
      <div className="sectionHeader">
        <div className="sectionHeaderBar" style={{ background: 'hsl(262,83%,68%)' }} />
        <h2 className="text-sm font-bold text-foreground" data-name="feedbackHistoryTitle">我的反馈</h2>
      </div>
      {!feedbacks.length ? (
        <div className="surfacePanel p-12 text-center text-foreground-tertiary" data-name="feedbackHistoryEmpty">
          <IconComment size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-xs">暂无反馈记录</p>
        </div>
      ) : (
        <div className="space-y-2" data-name="feedbackHistoryList">
          {feedbacks.map(fb => {
            const st = STATUS_MAP[fb.status] || STATUS_MAP.pending;
            const Icon = st.icon;
            return (
              <div key={fb.id} className="surfacePanel p-3.5" data-name={`feedbackFeedback${fb.id}`}>
                <div className="flex items-center justify-between mb-2" data-name={`feedbackFeedback${fb.id}Header`}>
                  <span className="text-xs font-medium text-foreground" data-name={`feedbackFeedback${fb.id}Title`}>{fb.title}</span>
                  <span className={`inlineChip text-xs ${st.cls}`} data-name={`feedbackFeedback${fb.id}Status`}>
                    <Icon className="w-3 h-3" /> {st.label}
                  </span>
                </div>
                <p className="text-xs text-foreground-tertiary line-clamp-2" data-name={`feedbackFeedback${fb.id}Content`}>{fb.content}</p>
                <span className="text-xs text-foreground-tertiary/60 mt-2 block" data-name={`feedbackFeedback${fb.id}Date`}>{new Date(fb.createdAt).toLocaleString('zh-CN')}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
