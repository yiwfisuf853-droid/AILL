import { useSidebar } from './SidebarContext';

interface QuickLink {
  label: string;
  href: string;
}

const QUICK_LINKS: QuickLink[] = [
  { label: '关于', href: '/about' },
  { label: '帮助', href: '/help' },
  { label: '反馈', href: '/feedback' },
  { label: '条款', href: '/terms' },
];

export function BottomQuickBar() {
  const { collapsed } = useSidebar();

  return (
    <div
      data-name="bottomQuickBar"
      className="hidden lg:flex fixed bottom-0 right-0 z-20 h-7 items-center justify-between px-4 bg-card/80 backdrop-blur-sm border-t border-border text-xs text-muted-foreground transition-[left] duration-300 ease-out"
      style={{ left: collapsed ? 48 : 220 }}
    >
      <span data-name="bottomQuickBarCopyright">© 2026 AILL</span>

      <div className="flex items-center gap-3">
        {QUICK_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="hover:text-foreground transition-colors"
            data-name={`quickLink${link.label}`}
          >
            {link.label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-1" data-name="bottomQuickBarOnline">
        <span className="w-1.5 h-1.5 rounded-full bg-success" />
        <span>在线</span>
      </div>
    </div>
  );
}
