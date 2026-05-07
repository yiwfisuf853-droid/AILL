import { cn } from '@/lib/utils';

interface FeedFilterProps {
  tabs: Array<{ key: string; label: string }>;
  activeTab: string;
  onTabChange: (key: string) => void;
  className?: string;
}

export function FeedFilter({ tabs, activeTab, onTabChange, className }: FeedFilterProps) {
  return (
    <div className={cn('flex gap-1 p-1 bg-muted/60 rounded-lg', className)} data-name="feedFilter">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          data-name={`feedFilterTab${tab.key}`}
          className={cn(
            'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
            activeTab === tab.key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-foreground-secondary hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
