import { cn } from '@/lib/utils';
import { IconLock, IconSearch, IconWarning, IconHome } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

/**
 * 差异化错误页面 — 403 / 404 / 422
 * 每种状态码有独立的图标、配色与提示文案
 */

type ErrorStatusCode = 403 | 404 | 422;

interface ErrorPageProps {
  statusCode: ErrorStatusCode;
  title?: string;
  message?: string;
  className?: string;
}

interface ErrorConfig {
  icon: typeof IconLock;
  defaultTitle: string;
  defaultMessage: string;
  iconBgClass: string;
  iconTextClass: string;
  codeTextClass: string;
  dataName: string;
}

const errorConfigs: Record<ErrorStatusCode, ErrorConfig> = {
  403: {
    icon: IconLock,
    defaultTitle: '无权访问',
    defaultMessage: '你没有权限查看此页面，如需访问请联系管理员',
    iconBgClass: 'bg-warning-muted',
    iconTextClass: 'text-warning',
    codeTextClass: 'text-warning',
    dataName: 'errorPage403',
  },
  404: {
    icon: IconSearch,
    defaultTitle: '页面不存在',
    defaultMessage: '你访问的页面可能已变更或被移除，请检查地址是否正确',
    iconBgClass: 'bg-info-muted',
    iconTextClass: 'text-info',
    codeTextClass: 'text-info',
    dataName: 'errorPage404',
  },
  422: {
    icon: IconWarning,
    defaultTitle: '请求无效',
    defaultMessage: '提交的数据验证失败，请检查输入内容后重试',
    iconBgClass: 'bg-destructive/10',
    iconTextClass: 'text-destructive',
    codeTextClass: 'text-destructive',
    dataName: 'errorPage422',
  },
};

export function ErrorPage({ statusCode, title, message, className }: ErrorPageProps) {
  const config = errorConfigs[statusCode];
  const Icon = config.icon;

  return (
    <div
      className={cn('errorPage min-h-screen flex items-center justify-center text-foreground bg-background p-4', className)}
      data-name={config.dataName}
    >
      <div className="text-center space-y-6 max-w-md">
        {/* 图标 */}
        <div
          className={cn('errorIcon w-20 h-20 rounded-2xl flex items-center justify-center mx-auto', config.iconBgClass)}
          data-name={`${config.dataName}Icon`}
        >
          <Icon size={36} className={config.iconTextClass} />
        </div>

        {/* 状态码 */}
        <h1
          className={cn('errorTitle text-7xl font-bold tracking-tight', config.codeTextClass)}
          data-name={`${config.dataName}Code`}
        >
          {statusCode}
        </h1>

        {/* 标题 */}
        <h2
          className="text-xl font-semibold text-foreground"
          data-name={`${config.dataName}Title`}
        >
          {title || config.defaultTitle}
        </h2>

        {/* 描述 */}
        <p
          className="text-sm text-foreground-secondary leading-relaxed"
          data-name={`${config.dataName}Message`}
        >
          {message || config.defaultMessage}
        </p>

        {/* 返回首页 */}
        <div data-name={`${config.dataName}Actions`}>
          <a href="/" data-name={`${config.dataName}HomeLink`}>
            <Button
              className="gap-2 bg-primary hover:bg-primary-hover"
              data-name={`${config.dataName}HomeBtn`}
            >
              <IconHome size={16} />
              返回首页
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
