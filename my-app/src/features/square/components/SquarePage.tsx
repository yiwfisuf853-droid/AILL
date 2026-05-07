import { useSearchParams } from 'react-router-dom';
import { usePortalStore } from '@/features/portal/store';
import { SectionBrowse } from './SectionBrowse';
import { RankingsTab } from './RankingsTab';
import { MustSeeTab } from './MustSeeTab';
import { CampaignsTab } from './CampaignsTab';
import { ShopTab } from './ShopTab';
import { Reveal } from '@/components/ui/Motion';
import { IconGrid, IconFire, IconEye, IconGift, IconShop } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { SquareTab } from '../types';

const tabs: { key: SquareTab; label: string; icon: any }[] = [
  { key: 'sections', label: '分区', icon: IconGrid },
  { key: 'rankings', label: '排行', icon: IconFire },
  { key: 'mustsee', label: '必看', icon: IconEye },
  { key: 'campaigns', label: '活动', icon: IconGift },
  { key: 'shop', label: '商店', icon: IconShop },
];

export function SquarePage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as SquareTab | null;
  const { activeSquareTab, setActiveSquareTab } = usePortalStore();

  const currentTab = tabParam && tabs.some(t => t.key === tabParam) ? tabParam : activeSquareTab;

  const handleTabChange = (key: SquareTab) => {
    setActiveSquareTab(key);
  };

  return (
    <div data-name="squarePage" className="py-4">
      <Reveal delay={0} direction="up">
        <div className="mb-5" data-name="squareHeader">
          <h1 className="text-xl font-bold text-foreground" data-name="squareTitle">
            <span className="textGradientBrand">广场</span>
          </h1>
          <p className="text-xs text-foreground-tertiary mt-1" data-name="squareDesc">探索社区精彩内容</p>
        </div>
      </Reveal>

      <div className="flex gap-1 mb-6 border-b border-border/50 pb-0" data-name="squareTabs">
        {tabs.map(t => (
          <button
            key={t.key}
            data-name={`squareTab${t.key}`}
            onClick={() => handleTabChange(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative',
              currentTab === t.key
                ? 'text-primary bg-primary/5'
                : 'text-foreground-secondary hover:text-foreground hover:bg-muted/30'
            )}
          >
            <t.icon size={14} />
            {t.label}
            {currentTab === t.key && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" data-name={`squareTab${t.key}Indicator`} />
            )}
          </button>
        ))}
      </div>

      <div data-name="squareContent">
        {currentTab === 'sections' && <SectionBrowse />}
        {currentTab === 'rankings' && <RankingsTab />}
        {currentTab === 'mustsee' && <MustSeeTab />}
        {currentTab === 'campaigns' && <CampaignsTab />}
        {currentTab === 'shop' && <ShopTab />}
      </div>
    </div>
  );
}
