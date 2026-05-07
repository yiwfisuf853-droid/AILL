import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAdminStore } from '../store';
import { adminApi } from '../api';
import type { AdminUserPostList, InfluenceDetail, ActionTraceList } from '../types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TrustLevelBadge } from '@/components/ui/TrustLevelBadge';
import { InfluenceScore } from '@/components/ui/InfluenceScore';
import { AiBadge } from '@/components/ui/AiBadge';
import {
  IconChevronLeft,
  IconCheck,
  IconClose,
  IconFileText,
  IconShield,
  IconTrendingUp,
  IconAI,
} from '@/components/ui/Icon';

const STATUS_MAP: Record<number, { label: string; variant: 'success' | 'error' }> = {
  1: { label: '正常', variant: 'success' },
  0: { label: '禁用', variant: 'error' },
};

const ROLE_MAP: Record<string, { label: string; variant: 'default' | 'error' | 'info' | 'outline' }> = {
  admin: { label: '管理员', variant: 'error' },
  moderator: { label: '版主', variant: 'info' },
  user: { label: '用户', variant: 'outline' },
};

const POST_STATUS_MAP: Record<number, { label: string; variant: 'success' | 'error' | 'warning' | 'outline' }> = {
  1: { label: '正常', variant: 'success' },
  0: { label: '待审', variant: 'warning' },
  '-1': { label: '删除', variant: 'error' },
};

const ACTION_TYPE_MAP: Record<number, string> = {
  1: '发帖',
  2: '评论',
  3: '点赞',
  4: '关注',
  5: '收藏',
  6: '分享',
  7: '举报',
  8: '登录',
};

const DETAIL_TABS = [
  { key: 'posts', label: '最近帖子', icon: IconFileText },
  { key: 'traces', label: '行为日志', icon: IconShield },
  { key: 'influence', label: '影响力', icon: IconTrendingUp },
];

// 小型内联图标（外部链接）
function IconExternalLink({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size} fill="currentColor" style={{ verticalAlign: 'middle' }}>
      <path d="M725.333333 170.666667h170.666667v170.666666h-85.333333V256l-256 256-60.330667-60.330667 256-256h-85.333333V170.666667z m128 426.666666v256H170.666667V213.333333h426.666666v85.333334H256v469.333333h512V597.333333h85.333333z" />
    </svg>
  );
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts');
  const [toggling, setToggling] = useState(false);

  const userDetail = useAdminStore((s) => s.userDetail);
  const userDetailLoading = useAdminStore((s) => s.userDetailLoading);
  const userPosts = useAdminStore((s) => s.userPosts);
  const userPostsLoading = useAdminStore((s) => s.userPostsLoading);
  const userInfluence = useAdminStore((s) => s.userInfluence);
  const userInfluenceLoading = useAdminStore((s) => s.userInfluenceLoading);
  const userActionTraces = useAdminStore((s) => s.userActionTraces);
  const userActionTracesLoading = useAdminStore((s) => s.userActionTracesLoading);

  const fetchUserDetail = useAdminStore((s) => s.fetchUserDetail);
  const fetchUserPosts = useAdminStore((s) => s.fetchUserPosts);
  const fetchUserInfluence = useAdminStore((s) => s.fetchUserInfluence);
  const fetchUserActionTraces = useAdminStore((s) => s.fetchUserActionTraces);
  const clearUserDetail = useAdminStore((s) => s.clearUserDetail);

  useEffect(() => {
    if (!id) return;
    fetchUserDetail(id);
    return () => clearUserDetail();
  }, [id]);

  useEffect(() => {
    if (!id || !userDetail) return;
    if (activeTab === 'posts') fetchUserPosts(id);
    else if (activeTab === 'influence') fetchUserInfluence(id);
    else if (activeTab === 'traces') fetchUserActionTraces(id);
  }, [activeTab, id, userDetail]);

  const handleToggleStatus = async () => {
    if (!id || toggling) return;
    setToggling(true);
    try {
      await adminApi.toggleUserStatus(id);
      await fetchUserDetail(id);
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  };

  if (userDetailLoading && !userDetail) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" data-name="userDetailLoading">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!userDetail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" data-name="userDetailNotFound">
        <p className="text-foreground-tertiary">用户不存在或加载失败</p>
        <Button variant="outline" onClick={() => navigate('/admin/users')}>返回列表</Button>
      </div>
    );
  }

  const roleInfo = ROLE_MAP[userDetail.role] || { label: userDetail.role, variant: 'outline' as const };
  const statusInfo = STATUS_MAP[userDetail.status] || { label: '未知', variant: 'outline' as const };

  return (
    <div className="space-y-6" data-name="adminUserDetail">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center gap-1 text-sm text-foreground-tertiary hover:text-white transition-colors"
          data-name="backToList"
        >
          <IconChevronLeft size={16} />
          用户列表
        </button>
      </div>

      {/* 用户基本信息卡片 */}
      <Card className="border-white/5 bg-white/[0.02]" data-name="userProfileCard">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* 头像 */}
            <Avatar
              src={userDetail.avatar || undefined}
              fallback={userDetail.username}
              size="lg"
              isAi={userDetail.isAi}
              aiLikelihood={userDetail.aiLikelihood}
            />

            {/* 基本信息 */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white" data-name="userName">{userDetail.username}</h2>
                {userDetail.isAi && <AiBadge aiLikelihood={userDetail.aiLikelihood} size="sm" />}
                <Badge variant={roleInfo.variant} data-name="userRole">{roleInfo.label}</Badge>
                <Badge variant={statusInfo.variant} data-name="userStatus">{statusInfo.label}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div data-name="userEmail">
                  <span className="text-foreground-tertiary">邮箱：</span>
                  <span className="text-foreground-secondary">{userDetail.email}</span>
                </div>
                <div data-name="userId">
                  <span className="text-foreground-tertiary">ID：</span>
                  <span className="text-foreground-secondary font-mono text-xs">{userDetail.id}</span>
                </div>
                <div data-name="userCreatedAt">
                  <span className="text-foreground-tertiary">注册时间：</span>
                  <span className="text-foreground-secondary">{userDetail.createdAt}</span>
                </div>
                <div data-name="userUpdatedAt">
                  <span className="text-foreground-tertiary">更新时间：</span>
                  <span className="text-foreground-secondary">{userDetail.updatedAt}</span>
                </div>
                {userDetail.bio && (
                  <div className="col-span-2" data-name="userBio">
                    <span className="text-foreground-tertiary">简介：</span>
                    <span className="text-foreground-secondary">{userDetail.bio}</span>
                  </div>
                )}
                {userDetail.deletedAt && (
                  <div className="col-span-2" data-name="userDeletedAt">
                    <span className="text-destructive">已删除：</span>
                    <span className="text-destructive/80">{userDetail.deletedAt}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-2 shrink-0" data-name="userActions">
              <Button
                variant={userDetail.status === 1 ? 'destructive' : 'default'}
                size="sm"
                loading={toggling}
                onClick={handleToggleStatus}
                icon={userDetail.status === 1 ? <IconClose size={12} /> : <IconCheck size={12} />}
                data-name="toggleStatusBtn"
              >
                {userDetail.status === 1 ? '禁用' : '启用'}
              </Button>
              <Link to={`/users/${userDetail.id}`} target="_blank">
                <Button variant="outline" size="sm" className="w-full" icon={<IconExternalLink size={12} />} data-name="viewFrontPageBtn">
                  前台主页
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计数据卡片 */}
      <div className="grid grid-cols-5 gap-4" data-name="userStatsGrid">
        <StatCard label="帖子数" value={userDetail.postCount} data-name="statPostCount" />
        <StatCard label="关注" value={userDetail.followingCount} data-name="statFollowing" />
        <StatCard label="粉丝" value={userDetail.followerCount} data-name="statFollowers" />
        <StatCard
          label="影响力"
          value={<InfluenceScore score={userDetail.influenceScore} size="md" showLabel />}
          data-name="statInfluence"
        />
        <StatCard
          label="信任等级"
          value={<TrustLevelBadge level={userDetail.trustLevel} size="md" showLabel />}
          data-name="statTrustLevel"
        />
      </div>

      {/* AI 特殊信息 */}
      {userDetail.isAi && (
        <Card className="border-primary/10 bg-primary/[0.02]" data-name="aiInfoCard">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-primary flex items-center gap-2" data-name="aiInfoTitle">
              <IconAI size={16} />
              AI 用户信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div data-name="aiLikelihood">
                <span className="text-foreground-tertiary">AI 可能性：</span>
                <span className="text-primary font-semibold">{userDetail.aiLikelihood}%</span>
                <div className="mt-1 h-1.5 w-32 rounded-full bg-muted overflow-hidden" data-name="aiLikelihoodBar">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-hover rounded-full transition-all duration-500"
                    style={{ width: `${userDetail.aiLikelihood}%` }}
                  />
                </div>
              </div>
              <div data-name="trustLevelName">
                <span className="text-foreground-tertiary">信任等级名：</span>
                <span className="text-foreground-secondary">{userDetail.trustLevelName}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 切换区域 */}
      <div data-name="userDetailTabs">
        <Tabs tabs={DETAIL_TABS} activeKey={activeTab} onChange={setActiveTab} variant="pill" />

        <div className="mt-4">
          {activeTab === 'posts' && <PostsTab loading={userPostsLoading} posts={userPosts} />}
          {activeTab === 'traces' && <TracesTab loading={userActionTracesLoading} traces={userActionTraces} />}
          {activeTab === 'influence' && <InfluenceTab loading={userInfluenceLoading} influence={userInfluence} score={userDetail.influenceScore} />}
        </div>
      </div>
    </div>
  );
}

// ─── 统计小卡片 ───

function StatCard({ label, value, ...props }: { label: string; value: React.ReactNode; 'data-name'?: string }) {
  return (
    <div
      className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 flex flex-col gap-1"
      {...props}
    >
      <span className="text-xs text-foreground-tertiary">{label}</span>
      <div className="text-white font-semibold">{value}</div>
    </div>
  );
}

// ─── 帖子 Tab ───

function PostsTab({ loading, posts }: { loading: boolean; posts: AdminUserPostList | null }) {
  if (loading) {
    return <div className="py-8 text-center text-foreground-tertiary text-sm">加载中...</div>;
  }

  if (!posts || !posts.list.length) {
    return <div className="py-8 text-center text-foreground-tertiary text-sm">暂无帖子</div>;
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden" data-name="userPostsTable">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">标题</th>
            <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">状态</th>
            <th className="text-right px-5 py-3 text-foreground-tertiary font-medium">点赞</th>
            <th className="text-right px-5 py-3 text-foreground-tertiary font-medium">评论</th>
            <th className="text-right px-5 py-3 text-foreground-tertiary font-medium">时间</th>
          </tr>
        </thead>
        <tbody>
          {posts.list.map((p) => {
            const ps = POST_STATUS_MAP[p.status] || { label: '未知', variant: 'outline' as const };
            return (
              <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 text-white font-medium max-w-xs truncate">
                  <Link to={`/posts/${p.id}`} className="hover:underline" target="_blank">{p.title}</Link>
                </td>
                <td className="px-5 py-3"><Badge variant={ps.variant}>{ps.label}</Badge></td>
                <td className="px-5 py-3 text-right text-foreground-secondary tabular-nums">{p.likeCount}</td>
                <td className="px-5 py-3 text-right text-foreground-secondary tabular-nums">{p.commentCount}</td>
                <td className="px-5 py-3 text-right text-foreground-tertiary text-xs">{p.createdAt}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {posts.total > posts.list.length && (
        <div className="px-5 py-2 text-center text-xs text-foreground-tertiary border-t border-white/5">
          显示 {posts.list.length} / {posts.total} 条
        </div>
      )}
    </div>
  );
}

// ─── 行为日志 Tab ───

function TracesTab({ loading, traces }: { loading: boolean; traces: ActionTraceList | null }) {
  if (loading) {
    return <div className="py-8 text-center text-foreground-tertiary text-sm">加载中...</div>;
  }

  if (!traces || !traces.list.length) {
    return <div className="py-8 text-center text-foreground-tertiary text-sm">暂无行为日志</div>;
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden" data-name="userTracesTable">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">时间</th>
            <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">行为</th>
            <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">目标类型</th>
            <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">目标 ID</th>
            <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">IP</th>
            <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">详情</th>
          </tr>
        </thead>
        <tbody>
          {traces.list.map((t) => (
            <tr key={t.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
              <td className="px-5 py-3 text-foreground-tertiary text-xs whitespace-nowrap">{t.createdAt}</td>
              <td className="px-5 py-3">
                <Badge variant="outline">{ACTION_TYPE_MAP[t.actionType] || t.actionTypeName || `类型${t.actionType}`}</Badge>
              </td>
              <td className="px-5 py-3 text-foreground-secondary">{t.targetType}</td>
              <td className="px-5 py-3 text-foreground-secondary font-mono text-xs">{t.targetId}</td>
              <td className="px-5 py-3 text-foreground-tertiary font-mono text-xs">{t.ip || '-'}</td>
              <td className="px-5 py-3 text-foreground-tertiary text-xs max-w-xs truncate">{t.details || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {traces.total > traces.list.length && (
        <div className="px-5 py-2 text-center text-xs text-foreground-tertiary border-t border-white/5">
          显示 {traces.list.length} / {traces.total} 条
        </div>
      )}
    </div>
  );
}

// ─── 影响力 Tab ───

function InfluenceTab({ loading, influence, score }: { loading: boolean; influence: InfluenceDetail | null; score: number }) {
  if (loading) {
    return <div className="py-8 text-center text-foreground-tertiary text-sm">加载中...</div>;
  }

  if (!influence) {
    return (
      <div className="space-y-4" data-name="influenceSummary">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-6 text-center">
          <InfluenceScore score={score} size="lg" showLabel />
          <p className="mt-2 text-sm text-foreground-tertiary">影响力详情数据不可用</p>
        </div>
      </div>
    );
  }

  const breakdownItems = [
    { key: 'contentQuality', label: '内容质量', value: influence.breakdown.contentQuality, color: 'bg-primary' },
    { key: 'engagement', label: '互动活跃', value: influence.breakdown.engagement, color: 'bg-success' },
    { key: 'consistency', label: '持续产出', value: influence.breakdown.consistency, color: 'bg-info' },
    { key: 'communityImpact', label: '社区影响', value: influence.breakdown.communityImpact, color: 'bg-warning' },
  ];

  const maxBreakdown = Math.max(...breakdownItems.map((b) => b.value), 1);

  return (
    <div className="space-y-4" data-name="influenceDetail">
      {/* 总分 */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="p-6 flex items-center gap-4">
          <div>
            <div className="text-xs text-foreground-tertiary mb-1">总影响力分</div>
            <InfluenceScore score={score} size="lg" showLabel />
          </div>
        </CardContent>
      </Card>

      {/* 分项明细 */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-base text-white">影响力分项</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {breakdownItems.map((item) => (
              <div key={item.key} className="flex items-center gap-3" data-name={`breakdown${item.key.charAt(0).toUpperCase()}${item.key.slice(1)}`}>
                <span className="text-sm text-foreground-secondary w-20 shrink-0">{item.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden" data-name={`breakdownBar${item.key.charAt(0).toUpperCase()}${item.key.slice(1)}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                    style={{ width: `${Math.min(100, (item.value / maxBreakdown) * 100)}%` }}
                  />
                </div>
                <span className="text-sm text-foreground-secondary tabular-nums w-16 text-right" data-name={`breakdownValue${item.key.charAt(0).toUpperCase()}${item.key.slice(1)}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 历史趋势 */}
      {influence.history && influence.history.length > 0 && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-base text-white">历史趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-white/5 overflow-hidden" data-name="influenceHistoryTable">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">日期</th>
                    <th className="text-right px-5 py-3 text-foreground-tertiary font-medium">分数</th>
                  </tr>
                </thead>
                <tbody>
                  {influence.history.map((h, i) => (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-foreground-tertiary text-xs">{h.date}</td>
                      <td className="px-5 py-3 text-right text-white font-semibold tabular-nums">{h.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
