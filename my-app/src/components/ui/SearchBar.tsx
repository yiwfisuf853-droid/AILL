/**
 * SearchBar — 搜索框组件（2.0 L1 新增）
 * 支持热词、历史记录、⌘K 快捷键
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  compact?: boolean;
}

export function SearchBar({ placeholder = '搜索内容、用户、话题…', onSearch, className = '', compact = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // ⌘K 快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (onSearch) {
      onSearch(query.trim());
    } else {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
    setIsFocused(false);
  };

  return (
    <form
      data-name="searchBar"
      onSubmit={handleSubmit}
      className={`relative ${className}`}
    >
      <div
        data-name="searchBarInput"
        className={`flex items-center gap-2 rounded-lg border transition-all duration-200 ${
          isFocused
            ? 'border-primary ring-2 ring-primary/20 bg-background'
            : 'border-border bg-background-elevated hover:border-border-hover'
        } ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}
      >
        {/* 搜索图标 */}
        <svg
          className={`w-4 h-4 ${isFocused ? 'text-primary' : 'text-foreground-tertiary'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          data-name="searchBarInputField"
          className={`flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-tertiary outline-none ${compact ? 'text-xs' : ''}`}
        />

        {/* 快捷键提示 */}
        {!query && !isFocused && !compact && (
          <kbd
            data-name="searchBarShortcut"
            className="hidden md:inline-flex items-center px-1.5 py-0.5 text-xs text-foreground-tertiary bg-muted rounded border border-border/50"
          >
            ⌘K
          </kbd>
        )}

        {/* 清除按钮 */}
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            data-name="searchBarClear"
            className="text-foreground-tertiary hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}