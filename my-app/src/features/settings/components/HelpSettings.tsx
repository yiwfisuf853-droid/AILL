import { useState } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { feedbackApi } from '@/features/feedback/api';
import { IconHelp, IconMessageSquare, IconClock, IconSend, IconRefresh } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

export function HelpSettings() {
  const user = useAuthStore(s => s.user);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState('bug');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);

  const handleSubmitFeedback = async () => {
    if (!user || !feedbackText.trim()) return;
    setSubmitting(true);
    try {
      await feedbackApi.createFeedback({
        type: feedbackType,
        title: feedbackType === 'bug' ? 'Bug 反馈' : feedbackType === 'feature' ? '功能建议' : '其他反馈',
        content: feedbackText.trim(),
      });
      toast.success('反馈已提交');
      setFeedbackText('');
    } catch {
      toast.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const helpLinks = [
    { label: '使用指南', desc: '快速了解 AILL 功能', href: '#' },
    { label: '社区规范', desc: '了解社区行为准则', href: '#' },
    { label: '常见问题', desc: '解答你的疑惑', href: '#' },
    { label: '联系我们', desc: '获取人工帮助', href: '#' },
  ];

  return (
    <div className="space-y-5" data-name="helpSettings">
      <div className="bg-card border border-border/60 rounded-xl p-5" data-name="helpLinks">
        <div className="flex items-center gap-2 mb-4">
          <IconHelp size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">帮助文档</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-name="helpLinksGrid">
          {helpLinks.map((link, i) => (
            <a
              key={i}
              href={link.href}
              data-name={`helpLink${i}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <IconHelp size={14} className="text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{link.label}</p>
                <p className="text-[10px] text-foreground-tertiary">{link.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-5" data-name="helpFeedback">
        <div className="flex items-center gap-2 mb-4">
          <IconMessageSquare size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">提交反馈</h3>
        </div>
        <div className="flex gap-2 mb-3" data-name="helpFeedbackType">
          {[
            { key: 'bug', label: 'Bug' },
            { key: 'feature', label: '功能建议' },
            { key: 'other', label: '其他' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setFeedbackType(t.key)}
              data-name={`helpFeedbackType${t.key}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                feedbackType === t.key ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-foreground-secondary hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <textarea
          value={feedbackText}
          onChange={e => setFeedbackText(e.target.value)}
          placeholder="描述你遇到的问题或建议..."
          className="w-full rounded-lg border border-border/60 bg-background-elevated px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary/60 focus:border-primary/40 focus:outline-none min-h-[100px] resize-y transition-colors mb-3"
          data-name="helpFeedbackInput"
        />
        <Button
          onClick={handleSubmitFeedback}
          disabled={submitting || !feedbackText.trim()}
          size="sm"
          data-name="helpFeedbackSubmitBtn"
        >
          {submitting ? <IconRefresh size={12} className="animate-spin" /> : <IconSend size={12} />}
          提交反馈
        </Button>
      </div>
    </div>
  );
}
