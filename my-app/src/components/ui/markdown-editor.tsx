import MDEditor from '@uiw/react-md-editor';

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
  return (
    <div data-color-mode="dark" data-name="markdownEditor">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v || '')}
        height={height}
        preview={preview}
        textareaProps={{
          placeholder,
        }}
      />
    </div>
  );
}

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  if (!content) return null;
  return (
    <div data-color-mode="dark" data-name="markdownPreview" className={className}>
      <MDEditor.Markdown source={content} style={{ background: 'transparent' }} />
    </div>
  );
}
