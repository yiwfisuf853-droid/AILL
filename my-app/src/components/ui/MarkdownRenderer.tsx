import { MarkdownPreview } from './MarkdownEditor';

/**
 * MarkdownRenderer — 独立渲染器组件
 * 复用 MarkdownEditor 中的 MarkdownPreview，提供语义化的渲染器命名
 */
export const MarkdownRenderer = MarkdownPreview;

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}
