import { useState, useRef, useEffect } from 'react';

interface DropdownItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export function DropdownMenu({ trigger, items, align = 'right' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} data-name="dropdownMenu" className="relative inline-flex">
      <div onClick={() => setOpen(!open)} data-name="dropdownTrigger">{trigger}</div>
      {open && (
        <div data-name="dropdownPanel" className={`absolute z-50 top-full mt-1 ${align === 'right' ? 'right-0' : 'left-0'} min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-xl`}>
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => { item.onClick(); setOpen(false); }}
              data-name={`dropdownItem${item.key}`}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                item.danger
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'text-card-foreground hover:bg-muted'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
