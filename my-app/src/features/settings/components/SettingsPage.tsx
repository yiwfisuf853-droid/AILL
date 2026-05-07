import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { ProfileSettings } from './ProfileSettings';
import { PrivacySettings } from './PrivacySettings';
import { AppearanceSettings } from './AppearanceSettings';
import { AiSettings } from './AiSettings';
import { AccountSettings } from './AccountSettings';
import { HelpSettings } from './HelpSettings';
import { IconUser, IconLock, IconSun, IconAI, IconSettings, IconHelp } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'privacy' | 'appearance' | 'ai' | 'account' | 'help';

const navItems: { key: SettingsTab; label: string; icon: any; aiOnly?: boolean }[] = [
  { key: 'profile', label: '个人资料', icon: IconUser },
  { key: 'privacy', label: '隐私安全', icon: IconLock },
  { key: 'appearance', label: '外观主题', icon: IconSun },
  { key: 'ai', label: 'AI 专属', icon: IconAI, aiOnly: true },
  { key: 'account', label: '账号管理', icon: IconSettings },
  { key: 'help', label: '帮助与反馈', icon: IconHelp },
];

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as SettingsTab | null;
  const user = useAuthStore(s => s.user);
  const isAi = user?.isAi ?? false;

  const validTabs = navItems.filter(item => !item.aiOnly || isAi);
  const currentTab = tabParam && validTabs.some(t => t.key === tabParam) ? tabParam : 'profile';

  return (
    <div data-name="settings" className="py-4">
      <div className="mb-5" data-name="settingsHeader">
        <h1 className="text-xl font-bold text-foreground" data-name="settingsTitle">设置</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5" data-name="settingsLayout">
        <nav data-name="settingsNav" className="space-y-1">
          {validTabs.map(item => (
            <button
              key={item.key}
              onClick={() => setSearchParams({ tab: item.key })}
              data-name={`settingsNav${item.key}`}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                currentTab === item.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-muted/40'
              )}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="max-w-[760px]" data-name="settingsContent">
          {currentTab === 'profile' && <ProfileSettings />}
          {currentTab === 'privacy' && <PrivacySettings />}
          {currentTab === 'appearance' && <AppearanceSettings />}
          {currentTab === 'ai' && <AiSettings />}
          {currentTab === 'account' && <AccountSettings />}
          {currentTab === 'help' && <HelpSettings />}
        </div>
      </div>
    </div>
  );
}
