import { useRef, useEffect, useState } from 'react';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeKey, onChange, className = '' }: TabsProps) {
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

  return (
    <div ref={containerRef} data-name="tabs" className={`relative flex gap-1 border-b border-border ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          data-name={`tab.${tab.key}`}
          className={`relative px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
            activeKey === tab.key
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-xs text-muted-foreground">({tab.count})</span>
          )}
        </button>
      ))}
      {/* Sliding indicator */}
      <span
        data-name="tabIndicator"
        className="absolute bottom-0 h-0.5 bg-primary rounded-t transition-all duration-200 ease-out"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
    </div>
  );
}
