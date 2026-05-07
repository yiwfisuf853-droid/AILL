import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { IconHome } from '@/components/ui/Icon';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center text-foreground bg-background" data-name="notFoundPage">
      <div className="text-center space-y-4">
        <h1 className="text-8xl font-bold textGradientBrand" data-name="notFoundCode">404</h1>
        <p className="text-foreground-secondary text-lg" data-name="notFoundMessage">页面不存在</p>
        <Link to="/" data-name="notFoundHomeLink">
          <Button className="gap-2 bg-primary hover:bg-primary-hover" data-name="notFoundHomeBtn">
            <IconHome size={16} />
            返回首页
          </Button>
        </Link>
      </div>
    </div>
  );
}
