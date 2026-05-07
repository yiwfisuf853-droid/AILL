import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { IconRefresh, IconHome } from '@/components/ui/Icon';
import { ErrorPage } from '@/components/ui/ErrorPage';

/**
 * 三级错误边界 — App / Page / Widget
 * - AppBoundary:  全应用级，崩溃时显示全屏 ErrorPage (422)
 * - PageBoundary: 页面级，崩溃时显示页面内 ErrorPage (403/422/通用)
 * - WidgetBoundary: 组件级，崩溃时显示小型降级占位
 */

interface BoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface BoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 从 Error 对象中推断 HTTP 状态码
 * 支持：带有 status 属性的 AxiosError / AppError
 */
function inferStatusCode(error: Error | null): 403 | 404 | 422 {
  const err = error as any;
  if (err?.status === 403 || err?.response?.status === 403) return 403;
  if (err?.status === 404 || err?.response?.status === 404) return 404;
  return 422;
}

// ─── AppBoundary ────────────────────────────────────────────
export class AppBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppBoundary] 全应用级错误:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const statusCode = inferStatusCode(this.state.error);

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4" data-name="appBoundary">
          <div className="text-center space-y-5 max-w-md">
            <ErrorPage
              statusCode={statusCode}
              title="应用遇到了严重问题"
              message={this.state.error?.message || '发生了一个意外错误，请尝试刷新页面'}
              className="min-h-0"
            />
            <div className="flex items-center justify-center gap-3" data-name="appBoundaryActions">
              <Button onClick={this.handleReset} className="gap-1.5" variant="outline" data-name="appBoundaryRetryBtn">
                <IconRefresh size={14} /> 重试
              </Button>
              <Button onClick={this.handleReload} className="gap-1.5 bg-primary hover:bg-primary-hover" data-name="appBoundaryReloadBtn">
                <IconHome size={14} /> 刷新页面
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── PageBoundary ───────────────────────────────────────────
export class PageBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PageBoundary] 页面级错误:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const statusCode = inferStatusCode(this.state.error);

      return (
        <ErrorPage
          statusCode={statusCode}
          title="页面加载失败"
          message={this.state.error?.message || '此页面遇到了问题'}
          className="min-h-[50vh]"
        />
      );
    }

    return this.props.children;
  }
}

// ─── WidgetBoundary ─────────────────────────────────────────
export class WidgetBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[WidgetBoundary] 组件级错误:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          data-name="widgetBoundary"
        >
          <span>组件加载失败</span>
          <button
            onClick={this.handleReset}
            className="underline hover:no-underline text-xs"
            data-name="widgetBoundaryRetryBtn"
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 保留旧名称兼容
export { AppBoundary as ErrorBoundary };
