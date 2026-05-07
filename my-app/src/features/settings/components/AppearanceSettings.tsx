import { useState } from 'react';
import { useSettingsStore } from '../store';
import { IconSun, IconType, IconLayout } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/lib/userPreferences';

type FontSize = 'small' | 'medium' | 'large';
type ContentDensity = 'compact' | 'comfortable' | 'spacious';

export function AppearanceSettings() {
  const { settings, updateSetting } = useSettingsStore();
  const layoutPrefs: UserPreferences = (() => {
    try {
      const raw = settings.layoutPreferences;
      if (raw && typeof raw === 'object') return { ...DEFAULT_PREFERENCES, ...(raw as UserPreferences) };
    } catch {}
    return DEFAULT_PREFERENCES;
  })();

  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [density, setDensity] = useState<ContentDensity>('comfortable');
  const [rightSidebarAlwaysVisible, setRightSidebarAlwaysVisible] = useState(layoutPrefs.rightSidebarAlwaysVisible);

  const handleToggleRightSidebar = () => {
    const newValue = !rightSidebarAlwaysVisible;
    setRightSidebarAlwaysVisible(newValue);
    const newPrefs = { ...layoutPrefs, rightSidebarAlwaysVisible: newValue };
    updateSetting('layoutPreferences', newPrefs);
    window.dispatchEvent(new Event('preferencesChanged'));
  };

  const fontSizes: { key: FontSize; label: string; sample: string }[] = [
    { key: 'small', label: '小', sample: 'text-xs' },
    { key: 'medium', label: '中', sample: 'text-sm' },
    { key: 'large', label: '大', sample: 'text-base' },
  ];

  const densities: { key: ContentDensity; label: string; desc: string }[] = [
    { key: 'compact', label: '紧凑', desc: '更多内容' },
    { key: 'comfortable', label: '舒适', desc: '默认间距' },
    { key: 'spacious', label: '宽松', desc: '更易阅读' },
  ];

  return (
    <div className="space-y-5" data-name="appearanceSettings">
      <div className="bg-card border border-border/60 rounded-xl p-5 space-y-5" data-name="appearanceTheme">
        <div className="flex items-center gap-2 mb-2">
          <IconSun size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">外观主题</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">主题模式</p>
            <p className="text-xs text-foreground-tertiary mt-0.5">当前使用 Hollow Doll 亮色主题</p>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white" data-name="appearanceThemeLight">
            <IconSun size={16} /> 亮色
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-5 space-y-5" data-name="appearanceFont">
        <div className="flex items-center gap-2 mb-2">
          <IconType size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">字体与密度</h3>
        </div>
        <div>
          <p className="text-xs font-medium text-foreground-secondary mb-2">字体大小</p>
          <div className="flex gap-2" data-name="appearanceFontSizeOptions">
            {fontSizes.map(f => (
              <button
                key={f.key}
                onClick={() => setFontSize(f.key)}
                data-name={`appearanceFontSize${f.key}`}
                className={cn(
                  'flex-1 py-2 rounded-lg text-center transition-colors border',
                  fontSize === f.key ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/40 text-foreground-secondary border-transparent hover:text-foreground'
                )}
              >
                <span className={f.sample}>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-foreground-secondary mb-2">内容密度</p>
          <div className="flex gap-2" data-name="appearanceDensityOptions">
            {densities.map(d => (
              <button
                key={d.key}
                onClick={() => setDensity(d.key)}
                data-name={`appearanceDensity${d.key}`}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-center transition-colors border',
                  density === d.key ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/40 text-foreground-secondary border-transparent hover:text-foreground'
                )}
              >
                <div className="text-xs font-medium">{d.label}</div>
                <div className="text-[10px] text-foreground-tertiary">{d.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4" data-name="appearanceLayout">
        <div className="flex items-center gap-2 mb-2">
          <IconLayout size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">布局设置</h3>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
          <div>
            <p className="text-sm font-medium text-foreground">右侧边栏常驻</p>
            <p className="text-xs text-foreground-tertiary mt-0.5">开启后右侧边栏始终可见</p>
          </div>
          <button
            onClick={handleToggleRightSidebar}
            className={`relative w-11 h-6 rounded-full transition-colors ${rightSidebarAlwaysVisible ? 'bg-primary' : 'bg-foreground-tertiary/30'}`}
            data-name="appearanceRightSidebarToggle"
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${rightSidebarAlwaysVisible ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
