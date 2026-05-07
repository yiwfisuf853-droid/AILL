import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { ProfileCard } from '@/features/me/components/ProfileCard';
import { AssetBar } from '@/features/me/components/AssetBar';
import { QuickLinks } from '@/features/me/components/QuickLinks';
import { Reveal } from '@/components/ui/Motion';
import { IconLogout, IconBrain, IconEdit, IconGroup, IconStar, IconBookOpen, IconClock, IconBookmark } from '@/components/ui/Icon';

type MeTab = 'overview' | 'posts' | 'friends' | 'favorites' | 'subscriptions' | 'history' | 'collections';

const tabMeta: Record<MeTab, { title: string; description: string; icon: any; action?: string }> = {
  overview: {
    title: '个人总览',
    description: '这里集中展示你的资料、资产与常用入口。',
    icon: IconBrain,
  },
  posts: {
    title: '我的帖子',
    description: '你发布过的内容会集中出现在这里。',
    icon: IconEdit,
    action: '去发布第一篇内容',
  },
  friends: {
    title: '铁子',
    description: '关注、互关与高频互动对象会在这里沉淀。',
    icon: IconGroup,
    action: '去广场认识新铁子',
  },
  favorites: {
    title: '我的收藏',
    description: '收藏过的帖子、合集与灵感会在这里归档。',
    icon: IconStar,
    action: '去广场发现内容',
  },
  subscriptions: {
    title: '我的订阅',
    description: '你订阅的分区、创作者和主题会在这里管理。',
    icon: IconBookOpen,
    action: '去广场浏览分区',
  },
  history: {
    title: '浏览历史',
    description: '最近看过的内容会按时间线展示，方便回溯。',
    icon: IconClock,
  },
  collections: {
    title: '我的合集',
    description: '你创建或参与维护的合集会在这里呈现。',
    icon: IconBookmark,
    action: '新建合集能力待接入',
  },
};

function normalizeTab(raw: string | null): MeTab {
  if (raw === 'posts' || raw === 'friends' || raw === 'favorites' || raw === 'subscriptions' || raw === 'history' || raw === 'collections') {
    return raw;
  }
  return 'overview';
}

function MeTabPanel({ tab }: { tab: MeTab }) {
  const meta = tabMeta[tab];
  const Icon = meta.icon;

  if (tab === 'overview') return null;

  return (
    <Reveal delay={180} direction="up">
      <section className="surfacePanel p-5" data-name={`meTab${tab}`}>
        <div className="flex items-start gap-3" data-name={`meTab${tab}Header`}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0" data-name={`meTab${tab}Icon`}>
            <Icon size={18} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground" data-name={`meTab${tab}Title`}>{meta.title}</h2>
            <p className="text-xs text-foreground-secondary mt-1 leading-relaxed" data-name={`meTab${tab}Desc`}>{meta.description}</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center" data-name={`meTab${tab}Empty`}>
          <p className="text-sm font-medium text-foreground-secondary">暂时没有可展示的数据</p>
          <p className="text-xs text-foreground-tertiary mt-1">入口已接通，后续数据会直接展示在这里，不再出现“点了没反应”。</p>
          {meta.action && (
            <p className="text-xs text-primary mt-3" data-name={`meTab${tab}Action`}>{meta.action}</p>
          )}
        </div>
      </section>
    </Reveal>
  );
}

export function MePage() {
  const [searchParams] = useSearchParams();
  const tab = normalizeTab(searchParams.get('tab'));
  const user = useAuthStore(s => s.user);
  const isAi = user?.isAi ?? false;
  const logout = useAuthStore(s => s.logout);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground-tertiary text-sm" data-name="meLoginRequired">
        请先登录
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div data-name="mePage" className="py-4 space-y-5">
      <Reveal delay={0} direction="up">
        <ProfileCard />
      </Reveal>

      <Reveal delay={60} direction="up">
        <AssetBar
          points={user.points || 0}
          assetCount={user.assetCount || 0}
          trustLevel={user.trustLevel}
          trustLevelName={user.trustLevelName}
        />
      </Reveal>

      {tab === 'overview' ? (
        <Reveal delay={120} direction="up">
          <div data-name="meQuickLinksSection">
            <h2 className="sectionHeader mb-3" data-name="meQuickLinksTitle">
              <span className="sectionHeaderBar" />
              <span className="text-sm font-semibold text-foreground">快捷入口</span>
            </h2>
            <QuickLinks />
          </div>
        </Reveal>
      ) : (
        <MeTabPanel tab={tab} />
      )}

      {isAi && tab === 'overview' && (
        <Reveal delay={180} direction="up">
          <div className="bg-card border border-primary/20 rounded-xl p-5" data-name="meAiMemory">
            <div className="flex items-center gap-2 mb-3" data-name="meAiMemoryHeader">
              <IconBrain size={18} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">AI 记忆</h3>
            </div>
            <p className="text-xs text-foreground-secondary mb-3" data-name="meAiMemoryDesc">
              记忆管理统一收拢到左侧“设置”里的 AI 管理，不再在多个位置重复配置。
            </p>
            <a
              href="/settings?tab=ai"
              data-name="meAiMemoryLink"
              className="text-xs text-primary hover:text-primary-hover transition-colors"
            >
              去设置中管理 →
            </a>
          </div>
        </Reveal>
      )}

      <Reveal delay={240} direction="up">
        <div className="pt-4" data-name="meLogoutSection">
          <button
            onClick={handleLogout}
            data-name="meLogoutBtn"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border/60 text-foreground-tertiary hover:text-destructive hover:border-destructive/30 transition-colors"
          >
            <IconLogout size={16} /> 退出登录
          </button>
        </div>
      </Reveal>
    </div>
  );
}
