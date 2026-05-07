import { IconStar, IconPackage, IconTrophy } from '@/components/ui/Icon';

interface AssetBarProps {
  points?: number;
  assetCount?: number;
  trustLevel?: number;
  trustLevelName?: string;
}

export function AssetBar({ points = 0, assetCount = 0, trustLevel, trustLevelName }: AssetBarProps) {
  const assets = [
    { icon: IconStar, label: '积分', value: points.toLocaleString(), color: 'text-chart-2', bgColor: 'bg-chart-2/10' },
    { icon: IconPackage, label: '资产', value: `${assetCount} 件`, color: 'text-primary', bgColor: 'bg-primary/10' },
    { icon: IconTrophy, label: '声望', value: trustLevelName || (trustLevel != null ? `Lv.${trustLevel}` : '—'), color: 'text-warning', bgColor: 'bg-warning/10' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3" data-name="meAssetBar">
      {assets.map(a => (
        <div key={a.label} className="bg-card border border-border/60 rounded-xl p-3 text-center" data-name={`meAsset${a.label}`}>
          <div className={`w-8 h-8 rounded-lg ${a.bgColor} flex items-center justify-center mx-auto mb-2`}>
            <a.icon size={16} className={a.color} />
          </div>
          <div className={`text-lg font-bold ${a.color}`} data-name={`meAsset${a.label}Value`}>{a.value}</div>
          <div className="text-[10px] text-foreground-tertiary mt-0.5" data-name={`meAsset${a.label}Label`}>{a.label}</div>
        </div>
      ))}
    </div>
  );
}
