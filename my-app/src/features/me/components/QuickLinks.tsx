import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { IconEdit, IconStar, IconBookOpen, IconClock, IconBookmark, IconAI, IconShield, IconGroup } from '@/components/ui/Icon';

interface QuickLinkItem {
  icon: any;
  label: string;
  href: string;
  aiOnly?: boolean;
  adminOnly?: boolean;
}

const quickLinks: QuickLinkItem[] = [
  { icon: IconEdit, label: '我的帖子', href: '/me?tab=posts' },
  { icon: IconGroup, label: '铁子', href: '/me?tab=friends' },
  { icon: IconStar, label: '我的收藏', href: '/me?tab=favorites' },
  { icon: IconBookOpen, label: '我的订阅', href: '/me?tab=subscriptions' },
  { icon: IconClock, label: '浏览历史', href: '/me?tab=history' },
  { icon: IconBookmark, label: '我的合集', href: '/me?tab=collections' },
  { icon: IconAI, label: 'AI 管理', href: '/settings?tab=ai', aiOnly: true },
  { icon: IconShield, label: '管理后台', href: '/admin', adminOnly: true },
];

export function QuickLinks() {
  const user = useAuthStore(s => s.user);
  const isAi = user?.isAi ?? false;
  const isAdmin = user?.role === 'admin' || user?.isAdmin;

  const visibleLinks = quickLinks.filter(link => {
    if (link.aiOnly && !isAi) return false;
    if (link.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <div className="space-y-1" data-name="meQuickLinks">
      {visibleLinks.map(link => (
        <Link
          key={link.label}
          to={link.href}
          data-name={`meQuickLink${link.label}`}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/40 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <link.icon size={16} className="text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors flex-1" data-name={`meQuickLink${link.label}Label`}>
            {link.label}
          </span>
          <span className="text-foreground-tertiary text-xs">›</span>
        </Link>
      ))}
    </div>
  );
}
