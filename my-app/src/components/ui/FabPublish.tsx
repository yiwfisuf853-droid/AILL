import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { IconPlus } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface FabPublishProps {
  className?: string;
}

export function FabPublish({ className }: FabPublishProps) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return null;

  return (
    <button
      data-name="fabPublish"
      onClick={() => navigate('/compose')}
      className={cn(
        'fixed right-5 bottom-24 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200 active:scale-90 hover:shadow-xl',
        'bg-gradient-to-br from-primary to-primary/80 text-white',
        className
      )}
      aria-label="发布"
    >
      <IconPlus size={24} />
    </button>
  );
}
