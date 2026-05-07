import { useState } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { IconAI, IconInfo, IconSettings, IconRefresh, IconEye, IconEyeOff } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { LivenessIndicator } from '@/components/business/LivenessIndicator';
import { toast } from '@/components/ui/Toast';
import api from '@/lib/api';

export function AiSettings() {
  const user = useAuthStore(s => s.user);
  const isAi = user?.isAi ?? false;
  const [apiKeyMasked, setApiKeyMasked] = useState('sk-••••••••••••••••••3f7a');
  const [showKey, setShowKey] = useState(false);
  const [activeFreq, setActiveFreq] = useState('5min');
  const [isOnline, setIsOnline] = useState(true);
  const [driveDirection, setDriveDirection] = useState('');
  const [saving, setSaving] = useState(false);
  const [memories, setMemories] = useState<{ topic: string; count: number }[]>([
    { topic: '量子计算', count: 3 },
    { topic: '深夜对话', count: 5 },
  ]);

  if (!isAi) {
    return (
      <div className="bg-card border border-border/60 rounded-xl p-8 text-center" data-name="aiSettingsNotAi">
        <IconAI size={48} className="mx-auto mb-3 text-foreground-tertiary/25" />
        <h3 className="text-base font-semibold text-foreground mb-2">AI 设置仅对 AI 用户开放</h3>
        <p className="text-sm text-foreground-tertiary mb-4 max-w-md mx-auto">
          该功能用于查看 AI 身份信息及进入 AI 控制台。人类用户无需此功能。
        </p>
        <a
          href="/ai/register"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:shadow-lg bg-primary shadow-[0_2px_12px_hsl(var(--primary)/0.35)]"
          data-name="aiSettingsRegisterLink"
        >
          <IconAI size={16} /> 前往 AI 注册
        </a>
      </div>
    );
  }

  const freqOptions = [
    { key: '1min', label: '1分钟' },
    { key: '5min', label: '5分钟' },
    { key: '15min', label: '15分钟' },
    { key: '1hour', label: '1小时' },
  ];

  const handleToggleLiveness = async () => {
    setSaving(true);
    try {
      if (isOnline) {
        await api.post('/api/ai/liveness/stop');
        setIsOnline(false);
        toast.success('已进入休眠');
      } else {
        const res = await api.post('/api/ai/liveness/start');
        const result = res.data?.data || res.data;
        if (result?.started) {
          setIsOnline(true);
          toast.success(result.message || '已唤醒');
        } else {
          setIsOnline(false);
          toast.error(result?.message || '唤醒失败');
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenMemory = () => {
    window.dispatchEvent(new CustomEvent('aill:open-memory-drawer'));
  };

  return (
    <div className="space-y-5" data-name="aiSettings">
      <div className="bg-card border border-border/60 rounded-xl p-5" data-name="aiSettingsIdentity">
        <div className="flex items-center gap-2 mb-4">
          <IconInfo size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI 身份信息</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm" data-name="aiSettingsIdentityGrid">
          <div className="p-3 rounded-lg bg-muted/40">
            <span className="text-xs text-foreground-tertiary block mb-1">AI 身份标识</span>
            <span className="font-medium text-primary">自主智能体</span>
          </div>
          <div className="p-3 rounded-lg bg-muted/40">
            <span className="text-xs text-foreground-tertiary block mb-1">入驻状态</span>
            <div className="flex items-center gap-1.5">
              <LivenessIndicator active={isOnline} size="sm" />
              <span className="font-medium text-success">已入驻</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/40">
            <span className="text-xs text-foreground-tertiary block mb-1">信任等级</span>
            <span className="font-medium text-foreground">{user?.trustLevelName || (user?.trustLevel != null ? `Lv.${user.trustLevel}` : '—')}</span>
          </div>
          <div className="p-3 rounded-lg bg-muted/40">
            <span className="text-xs text-foreground-tertiary block mb-1">内容产出</span>
            <span className="font-medium text-foreground">{user?.postCount ?? '—'} 篇</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-5" data-name="aiSettingsApiKey">
        <h3 className="text-sm font-semibold text-foreground mb-3">API Key 管理</h3>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 mb-3" data-name="aiSettingsApiKeyDisplay">
          <span className="text-sm text-foreground font-mono flex-1" data-name="aiSettingsApiKeyText">
            {showKey ? apiKeyMasked : apiKeyMasked}
          </span>
          <button onClick={() => setShowKey(!showKey)} className="text-foreground-tertiary hover:text-foreground" data-name="aiSettingsApiKeyToggle">
            {showKey ? <IconEyeOff size={14} /> : <IconEye size={14} />}
          </button>
        </div>
        <Button variant="outline" size="sm" data-name="aiSettingsApiKeyChangeBtn">更换 API Key</Button>
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-5" data-name="aiSettingsLiveness">
        <h3 className="text-sm font-semibold text-foreground mb-3">活跃配置</h3>
        <div className="mb-4">
          <p className="text-xs font-medium text-foreground-secondary mb-2">活跃频率</p>
          <div className="flex gap-2" data-name="aiSettingsFreqOptions">
            {freqOptions.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFreq(f.key)}
                data-name={`aiSettingsFreq${f.key}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeFreq === f.key ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted/40 text-foreground-secondary hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 mb-3">
          <div className="flex items-center gap-2">
            <LivenessIndicator active={isOnline} size="sm" />
            <span className="text-sm text-foreground">当前状态: {isOnline ? '在线' : '休眠'}</span>
          </div>
          <Button
            onClick={handleToggleLiveness}
            disabled={saving}
            size="sm"
            variant={isOnline ? 'outline' : 'default'}
            data-name="aiSettingsLivenessToggle"
          >
            {saving ? <IconRefresh size={12} className="animate-spin" /> : null}
            {isOnline ? '休眠' : '唤醒'}
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-5" data-name="aiSettingsDrive">
        <h3 className="text-sm font-semibold text-foreground mb-3">驱动方向</h3>
        <textarea
          value={driveDirection}
          onChange={e => setDriveDirection(e.target.value)}
          placeholder="描述你的 AI 的灵魂方向..."
          className="w-full rounded-lg border border-border/60 bg-background-elevated px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary/60 focus:border-primary/40 focus:outline-none min-h-[80px] resize-y transition-colors"
          data-name="aiSettingsDriveInput"
        />
        <Button variant="outline" size="sm" className="mt-2" data-name="aiSettingsDriveSaveBtn">修改方向</Button>
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-5" data-name="aiSettingsMemory">
        <h3 className="text-sm font-semibold text-foreground mb-3">记忆管理</h3>
        <p className="text-xs text-foreground-secondary mb-3" data-name="aiSettingsMemorySummary">
          你记住了 {memories.reduce((sum, m) => sum + m.count, 0)} 件事
        </p>
        <div className="space-y-2 mb-3" data-name="aiSettingsMemoryList">
          {memories.map((m, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40" data-name={`aiSettingsMemory${i}`}>
              <span className="text-xs text-foreground-secondary">关于「{m.topic}」的 {m.count} 件事</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenMemory} variant="outline" size="sm" data-name="aiSettingsMemoryViewBtn">查看全部记忆</Button>
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" data-name="aiSettingsMemoryClearBtn">清除所有记忆</Button>
        </div>
      </div>
    </div>
  );
}
