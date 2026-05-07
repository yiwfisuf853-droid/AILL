/**
 * Select — 下拉选择器组件（2.0 L1 新增）
 */
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dataName?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = '请选择',
  disabled = false,
  className,
  dataName,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} data-name={dataName || 'select'} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full h-10 px-3 rounded-lg border text-sm transition-colors',
          isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-border-hover',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          'bg-background text-foreground'
        )}
      >
        <span className={selectedOption ? '' : 'text-foreground-tertiary'}>
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={cn('w-4 h-4 text-foreground-tertiary transition-transform', isOpen && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-elevated overflow-hidden">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                onChange?.(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-2 text-sm text-left transition-colors',
                option.value === value ? 'bg-primary-muted text-primary font-medium' : 'text-foreground hover:bg-muted',
                option.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}