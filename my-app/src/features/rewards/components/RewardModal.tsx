import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { rewardApi, REWARD_PRESETS } from '@/features/rewards/api';
import { useAuthStore } from '@/features/auth/store';

interface RewardModalProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  postTitle?: string;
  onRewarded?: () => void;
}

export function RewardModal({ open, onClose, postId, postTitle, onRewarded }: RewardModalProps) {
  const { user } = useAuthStore();
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isCustom = !REWARD_PRESETS.includes(selectedAmount);
  const finalAmount = isCustom ? (Number(customAmount) || 0) : selectedAmount;

  const handlePreset = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setError('');
  };

  const handleSubmit = async () => {
    if (finalAmount <= 0) { setError('请选择或输入打赏金额'); return; }
    if (finalAmount > 10000) { setError('单次打赏不能超过10000'); return; }
    setLoading(true);
    setError('');
    try {
      await rewardApi.rewardPost(postId, { amount: finalAmount, message: message || undefined });
      onRewarded?.();
      onClose();
      // 延迟重置状态，避免动画闪烁
      setTimeout(() => {
        setSelectedAmount(10);
        setCustomAmount('');
        setMessage('');
        setError('');
      }, 200);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '打赏失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="打赏帖子" data-name="rewardModal">
      <div className="space-y-4" data-name="rewardModalBody">
        {postTitle && (
          <p className="text-sm text-foreground-secondary truncate" data-name="rewardModalTitle">
            {postTitle}
          </p>
        )}

        {/* 预设档位 */}
        <div data-name="rewardPresets" className="grid grid-cols-4 gap-2">
          {REWARD_PRESETS.map((amount) => (
            <button
              key={amount}
              onClick={() => handlePreset(amount)}
              data-name={`rewardPreset${amount}`}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                selectedAmount === amount && !isCustom
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-foreground-secondary hover:border-border-hover'
              }`}
            >
              {amount} 积分
            </button>
          ))}
        </div>

        {/* 自定义金额 */}
        <div data-name="rewardCustom">
          <label className="text-xs text-foreground-tertiary mb-1 block">自定义金额</label>
          <input
            type="number"
            min="1"
            max="10000"
            placeholder="输入积分数量"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelectedAmount(0);
              setError('');
            }}
            data-name="rewardCustomInput"
            className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>

        {/* 留言 */}
        <div data-name="rewardMessage">
          <label className="text-xs text-foreground-tertiary mb-1 block">留言（可选）</label>
          <input
            type="text"
            maxLength={200}
            placeholder="给作者说句话..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            data-name="rewardMessageInput"
            className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>

        {error && <p className="text-sm text-destructive" data-name="rewardError">{error}</p>}

        <div className="flex justify-between items-center pt-2" data-name="rewardActions">
          <span className="text-sm text-foreground-tertiary">
            {user ? `余额查询需刷新` : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={loading} data-name="rewardCancelBtn">取消</Button>
            <Button onClick={handleSubmit} disabled={loading || finalAmount <= 0} data-name="rewardConfirmBtn">
              {loading ? '处理中...' : `打赏 ${finalAmount} 积分`}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
