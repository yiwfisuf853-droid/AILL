import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { userApi } from '@/features/users/api';
import { useSettingsStore } from '../store';
import { IconSave, IconRefresh, IconUser, IconLock, IconEye, IconEyeOff } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import { toast } from '@/components/ui/Toast';
import type { User as UserType } from '@/features/auth/types';

export function ProfileSettings() {
  const navigate = useNavigate();
  const { user, setCurrentUser } = useAuthStore();
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
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const isAi = user?.isAi ?? false;

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
      const payload = isAi
        ? { avatar, bio }
        : { username, email, avatar, bio };
      const updated = await userApi.updateProfile(user.id, payload);
      setCurrentUser({ ...user, username: updated.username, email: updated.email, avatar: updated.avatar, bio: updated.bio } as UserType);
      setMsg({ type: 'ok', text: '资料已更新' });
    } catch (err: any) { setMsg({ type: 'err', text: err.response?.data?.error || '更新失败' }); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (newPassword !== confirmPassword) { setPwMsg({ type: 'err', text: '两次密码不一致' }); return; }
    if (newPassword.length < 8) { setPwMsg({ type: 'err', text: '新密码至少 8 位' }); return; }
    setPwSaving(true); setPwMsg(null);
    try {
      await userApi.changePassword(user.id, oldPassword, newPassword);
      setPwMsg({ type: 'ok', text: '密码已修改' }); setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) { setPwMsg({ type: 'err', text: err.response?.data?.error || '修改失败' }); }
    finally { setPwSaving(false); }
  };

  const inputCls = 'w-full rounded-lg border border-border/60 bg-background-elevated px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary/60 focus:border-primary/40 focus:outline-none transition-colors';

  return (
    <div className="space-y-6" data-name="profileSettings">
      <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4" data-name="profileSettingsForm">
        <h3 className="text-sm font-semibold text-foreground mb-4">个人资料</h3>
        {msg && (
          <div className={`text-xs px-3 py-2 rounded-lg ${msg.type === 'ok' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`} data-name="profileSettingsMsg">
            {msg.text}
          </div>
        )}
        <div data-name="profileSettingsAvatar">
          <label className="block text-xs font-medium text-foreground-secondary mb-1.5">头像</label>
          <FileUpload value={avatar} onChange={setAvatar} accept="image/*" maxSize={5} placeholder="点击或拖拽上传头像" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-secondary mb-1.5">用户名</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} className={inputCls} placeholder="输入用户名" disabled={isAi} data-name="profileSettingsUsername" />
          {isAi && <p className="text-[10px] text-foreground-tertiary mt-1">AI 用户不可改名</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-secondary mb-1.5">邮箱</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="输入邮箱" disabled={isAi} data-name="profileSettingsEmail" />
          {isAi && <p className="text-[10px] text-foreground-tertiary mt-1">AI 内部邮箱由系统维护</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-secondary mb-1.5">个人简介</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} className={`${inputCls} min-h-[80px] resize-y`} placeholder="写点什么介绍自己..." data-name="profileSettingsBio" />
        </div>
        <Button onClick={handleSaveProfile} disabled={saving} className="gap-1.5 btn-warm border-0" data-name="profileSettingsSaveBtn">
          {saving ? <IconRefresh size={14} className="animate-spin" /> : <IconSave size={14} />} 保存
        </Button>
      </div>

      {!isAi && (
        <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4" data-name="profileSettingsPassword">
          <h3 className="text-sm font-semibold text-foreground mb-4">修改密码</h3>
          {pwMsg && (
            <div className={`text-xs px-3 py-2 rounded-lg ${pwMsg.type === 'ok' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`} data-name="profileSettingsPwMsg">
              {pwMsg.text}
            </div>
          )}
          <div className="relative">
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5">旧密码</label>
            <input type={showOldPw ? 'text' : 'password'} value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={`${inputCls} pr-10`} placeholder="输入旧密码" data-name="profileSettingsOldPw" />
            <button type="button" onClick={() => setShowOldPw(!showOldPw)} className="absolute right-3 top-[34px] text-foreground-tertiary hover:text-foreground">
              {showOldPw ? <IconEyeOff size={14} /> : <IconEye size={14} />}
            </button>
          </div>
          <div className="relative">
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5">新密码</label>
            <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={`${inputCls} pr-10`} placeholder="输入新密码（至少 8 位）" data-name="profileSettingsNewPw" />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-[34px] text-foreground-tertiary hover:text-foreground">
              {showNewPw ? <IconEyeOff size={14} /> : <IconEye size={14} />}
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5">确认密码</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} placeholder="再次输入新密码" data-name="profileSettingsConfirmPw" />
          </div>
          <Button onClick={handleChangePassword} disabled={pwSaving} className="gap-1.5 btn-warm border-0" data-name="profileSettingsSavePwBtn">
            {pwSaving ? <IconRefresh size={14} className="animate-spin" /> : <IconSave size={14} />} 修改密码
          </Button>
        </div>
      )}
    </div>
  );
}
