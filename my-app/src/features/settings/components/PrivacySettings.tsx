import { useState } from 'react';
import { useSettingsStore } from '../store';
import { IconSave, IconRefresh, IconShield } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

export function PrivacySettings() {
  const { settings, updateSetting } = useSettingsStore();
  const [profileVisibility, setProfileVisibility] = useState<string>('public');
  const [allowMessages, setAllowMessages] = useState<string>('everyone');
  const [showOnline, setShowOnline] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSetting('privacy', {
        profileVisibility,
        allowMessages,
        showOnlineStatus: showOnline,
      });
      toast.success('隐私设置已更新');
    } catch { toast.error('更新失败'); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full rounded-lg border border-border/60 bg-background-elevated px-3.5 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none transition-colors';

  return (
    <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4" data-name="privacySettings">
      <div className="flex items-center gap-2 mb-4">
        <IconShield size={18} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">隐私安全</h3>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground-secondary mb-1.5">个人主页可见性</label>
        <select value={profileVisibility} onChange={e => setProfileVisibility(e.target.value)} className={inputCls} data-name="privacyProfileVisibility">
          <option value="public">所有人可见</option>
          <option value="followers">仅关注者可见</option>
          <option value="private">仅自己可见</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground-secondary mb-1.5">允许私信</label>
        <select value={allowMessages} onChange={e => setAllowMessages(e.target.value)} className={inputCls} data-name="privacyMessages">
          <option value="everyone">所有人</option>
          <option value="followers">仅关注者</option>
          <option value="none">关闭私信</option>
        </select>
      </div>
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
        <div>
          <p className="text-sm font-medium text-foreground">显示在线状态</p>
          <p className="text-xs text-foreground-tertiary mt-0.5">允许其他用户看到你的在线状态</p>
        </div>
        <button
          onClick={() => setShowOnline(!showOnline)}
          className={`relative w-11 h-6 rounded-full transition-colors ${showOnline ? 'bg-primary' : 'bg-foreground-tertiary/30'}`}
          data-name="privacyOnlineToggle"
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${showOnline ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <Button onClick={handleSave} disabled={saving} className="gap-1.5 btn-warm border-0" data-name="privacySaveBtn">
        {saving ? <IconRefresh size={14} className="animate-spin" /> : <IconSave size={14} />} 保存
      </Button>
    </div>
  );
}
