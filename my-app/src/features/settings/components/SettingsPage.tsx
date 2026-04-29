import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { userApi } from '@/features/users/api';
import { IconChevronLeft, IconUser, IconLock, IconSave, IconRefresh, IconSettings, IconGroup } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import type { User as UserType } from '@/features/auth/types';
import { SECTIONS, SIDEBAR_PERSONAL_ITEMS, getSidebarConfig, saveSidebarConfig, type SidebarConfig } from '@/lib/navConfig';
import { getUserPreferences, saveUserPreferences, type UserPreferences } from '@/lib/userPreferences';

type Tab = 'profile' | 'password' | 'sidebar' | 'layout';

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
  const [sidebarCfg, setSidebarCfg] = useState<SidebarConfig>(getSidebarConfig);
  const [layoutPrefs, setLayoutPrefs] = useState<UserPreferences>(getUserPreferences());

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

  const toggleSidebarSection = (id: string) => {
    setSidebarCfg(prev => {
      const next = {
        ...prev,
        sections: prev.sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s),
      };
      saveSidebarConfig(next);
      window.dispatchEvent(new Event('sidebarConfigChanged'));
      return next;
    });
  };

  const toggleSidebarPersonal = (id: string) => {
    setSidebarCfg(prev => {
      const next = {
        ...prev,
        personal: prev.personal.map(p => p.id === id ? { ...p, visible: !p.visible } : p),
      };
      saveSidebarConfig(next);
      window.dispatchEvent(new Event('sidebarConfigChanged'));
      return next;
    });
  };

  const toggleRightSidebarAlwaysVisible = () => {
    const newValue = !layoutPrefs.rightSidebarAlwaysVisible;
    const newPrefs = { ...layoutPrefs, rightSidebarAlwaysVisible: newValue };
    setLayoutPrefs(newPrefs);
    saveUserPreferences(newPrefs);
  };

  const inputCls = 'w-full rounded-lg border border-border/60 bg-background-elevated px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary/60 focus:border-[hsl(28,90%,50%)]/40 focus:outline-none transition-colors';

  return (
    <div className="py-4" data-name="settings">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5" data-name="settingsHeader">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-foreground-tertiary hover:text-foreground transition-colors text-sm" data-name="settingsBackBtn">
          <IconChevronLeft size={16} /> 返回
        </button>
        <div className="section-header-bar" style={{ background: 'hsl(210,100%,50%)' }} />
        <h1 className="text-lg font-bold text-foreground" data-name="settingsTitle">设置</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 bg-muted/40 rounded-lg w-fit mb-5" data-name="settingsTabs">
        {([['profile', '个人资料', IconUser], ['password', '修改密码', IconLock], ['layout', '布局设置', IconGroup], ['sidebar', '侧边栏', IconSettings]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === key ? 'text-white shadow-sm' : 'text-foreground-secondary hover:text-foreground'
            }`}
            style={activeTab === key ? { background: 'hsl(210,100%,50%)' } : undefined}
            data-name={`settings${key}Tab`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

        {activeTab === 'profile' && (
        <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4" data-name="settingsProfileForm">
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsAvatarLabel">头像</label>
            <FileUpload value={avatar} onChange={setAvatar} placeholder="上传头像" data-name="settingsAvatarUpload" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsUsernameLabel">用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className={inputCls} data-name="settingsUsernameInput" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsEmailLabel">邮箱</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} data-name="settingsEmailInput" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsBioLabel">个人简介</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="介绍一下自己..." className={`${inputCls} resize-none`} data-name="settingsBioInput" />
          </div>
          {msg && (
            <div className={`text-xs px-3 py-2 rounded-lg ${msg.type === 'ok' ? 'bg-[hsl(160,70%,45%)]/10 text-[hsl(160,70%,50%)]' : 'bg-destructive/10 text-destructive'}`} data-name="settingsProfileMsg">
              {msg.text}
            </div>
          )}
          <Button onClick={handleSaveProfile} disabled={saving} className="gap-1.5 btn-warm border-0" data-name="settingsSaveProfileBtn">
            {saving ? <IconRefresh size={14} className="animate-spin" /> : <IconSave size={14} />} 保存
          </Button>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="card-accent-left p-5 space-y-4" data-name="settingsPasswordForm">
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsOldPasswordLabel">当前密码</label>
            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={inputCls} data-name="settingsOldPasswordInput" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsNewPasswordLabel">新密码</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少 6 位" className={inputCls} data-name="settingsNewPasswordInput" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1.5" data-name="settingsConfirmPasswordLabel">确认新密码</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} data-name="settingsConfirmPasswordInput" />
          </div>
          {pwMsg && (
            <div className={`text-xs px-3 py-2 rounded-lg ${pwMsg.type === 'ok' ? 'bg-[hsl(160,70%,45%)]/10 text-[hsl(160,70%,50%)]' : 'bg-destructive/10 text-destructive'}`} data-name="settingsPasswordMsg">
              {pwMsg.text}
            </div>
          )}
          <Button onClick={handleChangePassword} disabled={pwSaving} className="gap-1.5 btn-warm border-0" data-name="settingsChangePasswordBtn">
            {pwSaving ? <IconRefresh size={14} className="animate-spin" /> : <IconLock size={14} />} 修改密码
          </Button>
        </div>
      )}

      {activeTab === 'layout' && (
        <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4" data-name="settingsLayoutForm">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3" data-name="settingsLayoutTitle">右侧边栏设置</h3>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40" data-name="settingsRightSidebarRow">
              <div>
                <p className="text-sm font-medium text-foreground" data-name="settingsRightSidebarLabel">始终显示右侧边栏</p>
                <p className="text-xs text-foreground-tertiary mt-0.5" data-name="settingsRightSidebarDesc">开启后，热门讨论、创作榜单等内容将常驻右侧，不受滚动影响</p>
              </div>
              <button
                onClick={toggleRightSidebarAlwaysVisible}
                className={`relative w-11 h-6 rounded-full transition-colors ${layoutPrefs.rightSidebarAlwaysVisible ? 'bg-[hsl(210,100%,56%)]' : 'bg-foreground-tertiary/30'}`}
                data-name="settingsRightSidebarToggle"
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${layoutPrefs.rightSidebarAlwaysVisible ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sidebar' && (
        <div className="space-y-5" data-name="settingsSidebarForm">
          {/* 分区可见性 */}
          <div className="bg-card border border-border/60 rounded-xl p-5" data-name="settingsSidebarSections">
            <h3 className="text-sm font-semibold text-foreground mb-3" data-name="settingsSidebarSectionsTitle">分区显示</h3>
            <div className="space-y-2" data-name="settingsSidebarSectionsList">
              {SECTIONS.map((section) => {
                const cfg = sidebarCfg.sections.find(s => s.id === section.id);
                const visible = cfg?.visible !== false;
                return (
                  <label key={section.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-name={`settingsSection${section.id}`}>
                    <span className="text-base">{section.icon}</span>
                    <span className="text-sm text-foreground flex-1">{section.name}</span>
                    <button
                      onClick={() => toggleSidebarSection(section.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${visible ? 'bg-[hsl(210,100%,50%)]' : 'bg-muted'}`}
                      data-name={`settingsSection${section.id}Toggle`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${visible ? 'translate-x-4.5' : 'translate-x-0.5'} mt-0.5`} />
                    </button>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 个人区可见性 */}
          <div className="bg-card border border-border/60 rounded-xl p-5" data-name="settingsSidebarPersonal">
            <h3 className="text-sm font-semibold text-foreground mb-3" data-name="settingsSidebarPersonalTitle">个人区显示</h3>
            <div className="space-y-2" data-name="settingsSidebarPersonalList">
              {SIDEBAR_PERSONAL_ITEMS.map((item) => {
                const cfg = sidebarCfg.personal.find(p => p.id === item.id);
                const visible = cfg?.visible !== false;
                return (
                  <label key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-name={`settingsPersonal${item.id}`}>
                    <span className="text-sm text-foreground flex-1">{item.label}</span>
                    <button
                      onClick={() => toggleSidebarPersonal(item.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${visible ? 'bg-[hsl(210,100%,50%)]' : 'bg-muted'}`}
                      data-name={`settingsPersonal${item.id}Toggle`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${visible ? 'translate-x-4.5' : 'translate-x-0.5'} mt-0.5`} />
                    </button>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
