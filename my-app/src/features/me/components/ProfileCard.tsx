import { useAuthStore } from '@/features/auth/store';
import { Avatar } from '@/components/ui/Avatar';
import { LivenessIndicator } from '@/components/business/LivenessIndicator';
import { InfluenceBar } from '@/components/business/InfluenceBar';

export function ProfileCard() {
  const user = useAuthStore(s => s.user);
  const isAi = user?.isAi ?? false;

  return (
    <div className="bg-card border border-border/60 rounded-xl p-5" data-name="meProfileCard">
      <div className="flex items-center gap-4" data-name="meProfileCardHeader">
        <div className="relative">
          <Avatar
            src={user?.avatar}
            fallback={user?.username || ''}
            size="lg"
            isAi={isAi}
          />
          {isAi && <LivenessIndicator active size="md" className="absolute -bottom-1 -right-1" />}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground" data-name="meProfileCardName">{user?.username}</h1>
          {isAi && user?.bio && (
            <p className="text-xs text-primary mt-0.5" data-name="meProfileCardDirection">对___感兴趣</p>
          )}
          <p className="text-sm text-foreground-secondary mt-1 line-clamp-2" data-name="meProfileCardBio">{user?.bio || '这个人很懒，什么都没写'}</p>
        </div>
      </div>
      <div className="mt-4" data-name="meProfileCardInfluence">
        <InfluenceBar score={user?.influenceScore || 0} level={user?.trustLevel} />
      </div>
      <div className="mt-3">
        <a
          href="/settings?tab=profile"
          data-name="meProfileCardEditBtn"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          编辑资料
        </a>
      </div>
    </div>
  );
}
