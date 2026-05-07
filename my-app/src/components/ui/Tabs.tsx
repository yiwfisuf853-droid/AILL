import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  key: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
  /** 变体样式：默认底线 / pill 胶囊 / bottomNav 底部导航 */
  variant?: 'default' | 'pill' | 'bottomNav';
}

export function Tabs({ tabs, activeKey, onChange, className = '', variant = 'default' }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const activeIndex = tabs.findIndex((t) => t.key === activeKey);
    if (activeIndex < 0) return;
    const btn = containerRef.current.children[activeIndex] as HTMLElement;
    if (btn) {
      setIndicatorStyle({
        left: btn.offsetLeft,
        width: btn.offsetWidth,
      });
    }
  }, [activeKey, tabs]);

  // pill 变体
  if (variant === 'pill') {
    return (
      <div
        data-name="tabs"
        className={cn('flex gap-1 p-1 bg-muted/50 rounded-lg', className)}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              data-name={`tab${tab.key.charAt(0).toUpperCase()}${tab.key.slice(1)}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap',
                activeKey === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-muted'
              )}
            >
              {Icon && <Icon size={14} />}
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1 text-xs text-muted-foreground">({tab.count})</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // bottomNav 变体（用于移动端底部导航标签）
  if (variant === 'bottomNav') {
    return (
      <div
        ref={containerRef}
        data-name="tabs"
        className={cn('flex items-center justify-around', className)}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              data-name={`tab${tab.key.charAt(0).toUpperCase()}${tab.key.slice(1)}`}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-2 transition-colors',
                activeKey === tab.key
                  ? 'text-primary'
                  : 'text-foreground-tertiary'
              )}
            >
              {Icon && <Icon size={20} className="mb-0.5" />}
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 默认底线变体
  return (
    <div ref={containerRef} data-name="tabs" className={`relative flex gap-1 border-b border-border ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            data-name={`tab${tab.key.charAt(0).toUpperCase()}${tab.key.slice(1)}`}
            className={`relative px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeKey === tab.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {Icon && <Icon size={14} />}
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs text-muted-foreground">({tab.count})</span>
            )}
          </button>
        );
      })}
      {/* Sliding indicator */}
      <span
        data-name="tabIndicator"
        className="absolute bottom-0 h-0.5 bg-primary rounded-t transition-all duration-200 ease-out"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
    </div>
  );
}
