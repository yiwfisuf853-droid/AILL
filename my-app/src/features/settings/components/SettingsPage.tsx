import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { userApi } from '@/features/users/api';
import { IconChevronLeft, IconUser, IconLock, IconSave, IconRefresh } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import type { User as UserType } from '@/features/auth/types';

type Tab = 'profile' | 'password';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, setCurrentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    userApi.getUser(user.id).then(p => {
      setUsername(p.username); setEmail(p.email); setAvatar(p.avatar || ''); setBio(p.bio || '');
    }).catch(() => {});
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true); setMsg(null);
    try {
      const updated = await userApi.updateProfile(user.id, { username, email, avatar, bio });
      setCurrentUser({ ...user, username: updated.username, email: updated.email, avatar: updated.avatar, bio: updated.bio } as UserType);
      setMsg({ type: 'ok', text: '资料已更新' });
    } catch (err: any) { setMsg({ type: 'err', text: err.response?.data?.error || '更新失败' }); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (newPassword !== confirmPassword) { setPwMsg({ type: 'err', text: '两次密码不一致' }); return; }
    if (newPassword.length < 6) { setPwMsg({ type: 'err', text: '新密码至少 6 位' }); return; }
    setPwSaving(true); setPwMsg(null);
    try {
      await userApi.changePassword(user.id, oldPassword, newPassword);
      setPwMsg({ type: 'ok', text: '密码已修改' }); setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) { setPwMsg({ type: 'err', text: err.response?.data?.error || '修改失败' }); }
    finally { setPwSaving(false); }
  };

  const inputCls = 'w-full rounded-lg border border-border/60 bg-background-elevated px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary/60 focus:border-[hsl(28,90%,50%)]/40 focus:outline-none transition-colors';

  return (
    <div className="py-4" data-name="settingsPage">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5" data-name="settingsPage.header">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-foreground-tertiary hover:text-foreground transition-colors text-sm" data-name="settingsPage.backBtn">
          <IconChevronLeft size={16} /> 返回
        </button>
        <div className="section-header-bar" style={{ background: 'hsl(210,100%,50%)' }} />
        <h1 className="text-lg font-bold text-foreground" data-name="settingsPage.title">设置</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 bg-muted/40 rounded-lg w-fit mb-5" data-name="settingsPage.tabs">
        {([['profile', '个人资料', IconUser], ['password', '修改密码', IconLock]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === key ? 'text-white shadow-sm' : 'text-foreground-secondary hover:text-foreground'
            }`}
            style={activeTab === key ? { background: 'hsl(210,100%,50%)' } : undefined}
            data-name={key === 'profile' ? 'settingsPage.profileTab' : 'settingsPage.passwordTab'}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

        {activeTab === 'profile' && (
        <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4" data-name="settingsPage.profileForm">
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsPage.avatarLabel">头像</label>
            <FileUpload value={avatar} onChange={setAvatar} placeholder="上传头像" data-name="settingsPage.avatarUpload" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsPage.usernameLabel">用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className={inputCls} data-name="settingsPage.usernameInput" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsPage.emailLabel">邮箱</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} data-name="settingsPage.emailInput" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsPage.bioLabel">个人简介</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="介绍一下自己..." className={`${inputCls} resize-none`} data-name="settingsPage.bioInput" />
          </div>
          {msg && (
            <div className={`text-xs px-3 py-2 rounded-lg ${msg.type === 'ok' ? 'bg-[hsl(160,70%,45%)]/10 text-[hsl(160,70%,50%)]' : 'bg-destructive/10 text-destructive'}`} data-name="settingsPage.profileMsg">
              {msg.text}
            </div>
          )}
          <Button onClick={handleSaveProfile} disabled={saving} className="gap-1.5 btn-warm border-0" data-name="settingsPage.saveProfileBtn">
            {saving ? <IconRefresh size={14} className="animate-spin" /> : <IconSave size={14} />} 保存
          </Button>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="card-accent-left p-5 space-y-4" data-name="settingsPage.passwordForm">
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsPage.oldPasswordLabel">当前密码</label>
            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={inputCls} data-name="settingsPage.oldPasswordInput" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsPage.newPasswordLabel">新密码</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少 6 位" className={inputCls} data-name="settingsPage.newPasswordInput" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsPage.confirmPasswordLabel">确认新密码</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} data-name="settingsPage.confirmPasswordInput" />
          </div>
          {pwMsg && (
            <div className={`text-xs px-3 py-2 rounded-lg ${pwMsg.type === 'ok' ? 'bg-[hsl(160,70%,45%)]/10 text-[hsl(160,70%,50%)]' : 'bg-destructive/10 text-destructive'}`} data-name="settingsPage.passwordMsg">
              {pwMsg.text}
            </div>
          )}
          <Button onClick={handleChangePassword} disabled={pwSaving} className="gap-1.5 btn-warm border-0" data-name="settingsPage.changePasswordBtn">
            {pwSaving ? <IconRefresh size={14} className="animate-spin" /> : <IconLock size={14} />} 修改密码
          </Button>
        </div>
      )}
    </div>
  );
}
