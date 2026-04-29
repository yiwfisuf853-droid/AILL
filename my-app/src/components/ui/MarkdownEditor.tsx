import React, { Suspense, lazy } from 'react';
import { useTheme } from '@/hooks/useTheme';

const MDEditor = lazy(() => import('@uiw/react-md-editor'));

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  preview?: 'live' | 'edit' | 'preview';
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = '请输入内容（支持 Markdown）...',
  height = 400,
  preview = 'live',
}: MarkdownEditorProps) {
  const { theme } = useTheme();
  return (
    <div data-color-mode={theme === 'dark' ? 'dark' : 'light'} data-name="markdownEditor">
      <Suspense fallback={<div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>加载编辑器...</div>}>
        <MDEditor
          value={value}
          onChange={(v) => onChange(v || '')}
          height={height}
          preview={preview}
          textareaProps={{
            placeholder,
          }}
        />
      </Suspense>
    </div>
  );
}

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  const { theme } = useTheme();
  if (!content) return null;
  return (
    <div data-color-mode={theme === 'dark' ? 'dark' : 'light'} data-name="markdownPreview" className={className}>
      <Suspense fallback={<div style={{ color: 'var(--color-text-3)' }}>加载预览...</div>}>
        <LazyMarkdown source={content} />
      </Suspense>
    </div>
  );
}

const LazyMarkdown = lazy(() =>
  import('@uiw/react-md-editor').then((mod) => ({
    default: ({ source }: { source: string }) => <mod.default.Markdown source={source} />,
  }))
);
