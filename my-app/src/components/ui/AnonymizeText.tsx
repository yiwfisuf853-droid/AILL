/**
 * AnonymizeText — 匿名化文本组件（2.0 L1 新增）
 * 用于在未登录或隐私场景下隐藏真实用户名/信息
 */
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface AnonymizeTextProps {
  /** 原始文本 */
  text: string;
  /** 是否默认匿名 */
  defaultAnonymized?: boolean;
  /** 匿名化模式：mask 用*替换，blur 用模糊效果，hide 完全隐藏 */
  mode?: 'mask' | 'blur' | 'hide';
  /** 保留前几个字符（mask 模式） */
  keepFirst?: number;
  /** 保留后几个字符（mask 模式） */
  keepLast?: number;
  /** 类名 */
  className?: string;
  /** 是否允许点击切换显示 */
  toggleable?: boolean;
}

export function AnonymizeText({
  text,
  defaultAnonymized = true,
  mode = 'mask',
  keepFirst = 1,
  keepLast = 1,
  className,
  toggleable = true,
}: AnonymizeTextProps) {
  const [anonymized, setAnonymized] = useState(defaultAnonymized);

  const toggle = useCallback(() => {
    if (toggleable) setAnonymized(prev => !prev);
  }, [toggleable]);

  if (!anonymized) {
    return (
      <span
        className={cn(toggleable && 'cursor-pointer select-none', className)}
        onClick={toggle}
        data-name="anonymizeText"
        title={toggleable ? '点击隐藏' : undefined}
      >
        {text}
      </span>
    );
  }

  // 匿名化处理
  let displayText: string;
  switch (mode) {
    case 'mask': {
      if (text.length <= keepFirst + keepLast) {
        displayText = '*'.repeat(text.length);
      } else {
        const first = text.slice(0, keepFirst);
        const last = text.slice(-keepLast);
        const masked = '*'.repeat(text.length - keepFirst - keepLast);
        displayText = `${first}${masked}${last}`;
      }
      break;
    }
    case 'blur':
      displayText = text;
      break;
    case 'hide':
      displayText = '***';
      break;
    default:
      displayText = '***';
  }

  return (
    <span
      className={cn(
        toggleable && 'cursor-pointer select-none',
        mode === 'blur' && 'blur-sm select-none',
        className
      )}
      onClick={toggle}
      data-name="anonymizeText"
      title={toggleable ? '点击显示' : undefined}
    >
      {displayText}
    </span>
  );
}
