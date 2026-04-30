import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { adminApi } from '../api';
import type {
  AdminUser,
  ModerationRule,
  ModerationRecord,
  Announcement,
  IpBlacklist,
  RiskAssessment,
  SystemConfig,
  AuditLog,
  FeedbackItem,
} from '../api';
import { IconBookOpen, IconCampaign, IconCheck, IconChevronLeft, IconChevronRight, IconClose, IconComment, IconDelete, IconEdit, IconFilter, IconGroup, IconHome, IconLock, IconPlus, IconSearch, IconSettings, IconShield, IconWarning } from "@/components/ui/Icon";

// ==================== Sidebar ====================

type TabKey = 'overview' | 'users' | 'moderation' | 'announcements' | 'security' | 'config' | 'audit' | 'feedback';

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const sidebarItems: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: '数据概览', icon: IconHome },
  { key: 'users', label: '用户管理', icon: IconGroup },
  { key: 'moderation', label: '内容审核', icon: IconShield },
  { key: 'feedback', label: '反馈处理', icon: IconComment },
  { key: 'announcements', label: '系统公告', icon: IconCampaign },
  { key: 'audit', label: '审计日志', icon: IconBookOpen },
  { key: 'security', label: '安全管理', icon: IconLock },
  { key: 'config', label: '系统配置', icon: IconSettings },
];

function Sidebar({ activeTab, onTabChange, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      data-name="adminSidebar"
      className={`fixed left-0 top-0 h-full z-30 flex flex-col border-r border-white/5 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
      style={{ background: `linear-gradient(180deg, hsl(var(--admin-bg)) 0%, hsl(var(--admin-bg-deep)) 100%)` }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5 shrink-0" data-name="adminSidebarLogo">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-black text-sm shrink-0" data-name="adminSidebarLogoIcon">
          A
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-sm tracking-wide whitespace-nowrap" data-name="adminSidebarLogoText">
            AILL Admin
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto" data-name="adminSidebarNav">
        {sidebarItems.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              data-name={`adminSidebarNav${key}`}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/20 to-cyan-500/10 text-cyan-300 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-cyan-400' : 'text-zinc-500'
                }`}
              />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" data-name="adminSidebarNavActiveDot" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/5" data-name="adminSidebarCollapseWrap">
        <button
          onClick={onToggleCollapse}
          data-name="adminSidebarCollapseBtn"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors text-sm"
        >
          {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
          {!collapsed && <span>收起</span>}
        </button>
      </div>
    </aside>
  );
}

// ==================== Modal ====================

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-name="adminModalOverlay">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} data-name="adminModalBackdrop" />
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/10 p-6 shadow-2xl" style={{ backgroundColor: 'hsl(var(--admin-modal-bg))' }} data-name="adminModalContent">
        <div className="flex items-center justify-between mb-5" data-name="adminModalHeader">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            data-name="adminModalCloseBtn"
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <IconClose size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ==================== Overview Tab ====================

function OverviewTab() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const data = await adminApi.getOverview();
        setOverview(data);
      } catch {
        // 使用空数据
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  const stats = [
    { label: '总用户数', value: overview?.users?.total ?? '—', sub: overview?.users?.today != null ? `今日 +${overview.users.today}` : undefined, icon: IconGroup, color: 'from-blue-500 to-cyan-400' },
    { label: '总帖子数', value: overview?.posts?.total ?? '—', sub: overview?.posts?.today != null ? `今日 +${overview.posts.today}` : undefined, icon: IconBookOpen, color: 'from-violet-500 to-purple-400' },
    { label: '总评论数', value: overview?.comments?.total ?? '—', sub: overview?.comments?.today != null ? `今日 +${overview.comments.today}` : undefined, icon: IconComment, color: 'from-emerald-500 to-green-400' },
    { label: '待审核内容', value: overview?.pendingModeration ?? '—', icon: IconShield, color: 'from-amber-500 to-orange-400' },
  ];

  if (loading) {
    return (
      <div className="space-y-6" data-name="adminOverviewLoading">
        <h2 className="text-xl font-bold text-white" data-name="adminOverviewTitleLoading">数据概览</h2>
        <div className="flex items-center justify-center py-20" data-name="adminOverviewLoadingSpinner">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-name="adminOverviewTab">
      <h2 className="text-xl font-bold text-white" data-name="adminOverviewTitle">数据概览</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-name="adminStatCardGrid">
        {stats.map((s) => (
          <div
            key={s.label}
            data-name={`adminStatCard${s.label}`}
            className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-5"
          >
            <div
              className="absolute top-0 right-0 w-24 h-24 opacity-10 blur-2xl"
              data-name="adminStatCardDecorBg"
              style={{
                background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
              }}
            />
            <div className="flex items-center justify-between mb-3" data-name="adminStatCardHeader">
              <div>
                <span className="text-sm text-zinc-400">{s.label}</span>
                {s.sub && <div className="text-[10px] text-zinc-600 mt-0.5">{s.sub}</div>}
              </div>
              <div
                className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}
                data-name={`adminStatCard${s.label}Icon`}
              >
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white" data-name={`adminStatCard${s.label}Value`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 近7天发帖趋势 */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6" data-name="adminWeeklyChart">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">发帖趋势 (近7天)</h3>
        <WeeklyChart />
      </div>
    </div>
  );
}

// 近 7 天趋势柱状图
function WeeklyChart() {
  const [trends, setTrends] = useState<Array<{ date: string; posts: number; comments: number; users: number }>>([]);
  const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  useEffect(() => {
    adminApi.getTrends(7).then((res: any) => {
      const list = res?.list || res || [];
      setTrends(Array.isArray(list) ? list : []);
    }).catch(() => {
      setTrends([]);
    });
  }, []);

  const max = Math.max(...trends.map(t => t.posts), 1);

  return (
    <div className="h-48 flex items-end gap-3" data-name="adminWeeklyChartBars">
      {trends.length > 0 ? trends.map((t, i) => {
        const d = new Date(t.date);
        const label = dayLabels[d.getDay()];
        const pct = (t.posts / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2" data-name={`adminWeeklyChartBar${i}`}>
            <span className="text-[10px] text-zinc-500">{t.posts}</span>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-blue-600/60 to-cyan-400/80 transition-all"
              data-name={`adminWeeklyChartBar${i}Fill`}
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            <span className="text-[10px] text-zinc-600">{label}</span>
          </div>
        );
      }) : (
        // 无数据时的空占位
        Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2" data-name={`adminWeeklyChartBarEmpty${i}`}>
            <span className="text-[10px] text-zinc-600">0</span>
            <div className="w-full rounded-t-md bg-white/5" style={{ height: '4%' }} data-name={`adminWeeklyChartBarEmpty${i}Fill`} />
            <span className="text-[10px] text-zinc-700">--</span>
          </div>
        ))
      )}
    </div>
  );
}

// ==================== Users Tab ====================

function UsersTab() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  // 搜索防抖
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // 加载真实用户数据
  useEffect(() => {
    setLoading(true);
    adminApi.listUsers({ search: debouncedSearch || undefined }).then((res: any) => {
      setUsers(res.list || []);
    }).catch(() => {
      setUsers([]);
    }).finally(() => setLoading(false));
  }, [debouncedSearch]);

  const handleToggleStatus = async (id: string) => {
    try {
      const updated: any = await adminApi.toggleUserStatus(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: updated.status ?? (u.status === 1 ? 0 : 1) } : u)));
    } catch {}
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = { admin: '管理员', moderator: '版主', user: '用户' };
    return map[role] || role;
  };
  const roleColor = (role: string) => {
    const map: Record<string, string> = {
      admin: 'bg-red-500/15 text-red-300',
      moderator: 'bg-blue-500/15 text-blue-300',
      user: 'bg-zinc-500/15 text-zinc-300',
    };
    return map[role] || 'bg-zinc-500/15 text-zinc-300';
  };

  return (
    <div className="space-y-6" data-name="adminUsersTab">
      <div className="flex items-center justify-between" data-name="adminUsersHeader">
        <h2 className="text-xl font-bold text-white" data-name="adminUsersTitle">用户管理</h2>
        <div className="relative" data-name="adminUserSearchWrap">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2  text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-name="adminUserSearchInput"
            placeholder="搜索用户名或邮箱..."
            className="pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 w-64 transition-colors"
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden" data-name="adminUserTableWrap">
        <table className="w-full text-sm" data-name="adminUserTable">
          <thead>
            <tr className="border-b border-white/5" data-name="adminUserTableHeader">
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">ID</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">用户名</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">邮箱</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">角色</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">状态</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">注册时间</th>
              <th className="text-right px-5 py-3 text-zinc-400 font-medium">操作</th>
            </tr>
          </thead>
          <tbody data-name="adminUserTableBody">
            {users.map((u) => (
              <tr key={u.id} data-name={`adminUser${u.id}Row`} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 text-zinc-500 font-mono text-xs">{u.id}</td>
                <td className="px-5 py-3 text-white font-medium">{u.username}</td>
                <td className="px-5 py-3 text-zinc-400">{u.email}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor(u.role)}`} data-name={`adminUser${u.id}RoleBadge`}>
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.status === 1
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-red-500/15 text-red-300'
                    }`}
                    data-name={`adminUser${u.id}StatusBadge`}
                  >
                    {u.status === 1 ? '正常' : '禁用'}
                  </span>
                </td>
                <td className="px-5 py-3 text-zinc-500 text-xs">{u.createdAt}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleToggleStatus(u.id)}
                    data-name={`adminUserRow${u.id}ToggleBtn`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      u.status === 1
                        ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {u.status === 1 ? (
                      <>
                        <IconClose size={12} /> 禁用
                      </>
                    ) : (
                      <>
                        <IconCheck size={12} /> 启用
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr data-name="adminUserTableEmpty">
                <td colSpan={7} className="px-5 py-10 text-center text-zinc-500">
                  未找到匹配用户
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== Moderation Tab ====================

function ModerationTab() {
  const [subTab, setSubTab] = useState<'rules' | 'records'>('records');
  const [rules, setRules] = useState<ModerationRule[]>([]);
  const [records, setRecords] = useState<ModerationRecord[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({ type: '', pattern: '', action: 'warn' });
  const [loading, setLoading] = useState(false);

  // Status filter for records
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    record: ModerationRecord | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, record: null, action: null });
  const [reviewReason, setReviewReason] = useState('');

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await adminApi.getModerationRules();
      setRules(res.list || res || []);
    } catch {
      setRules([]);
    }
    setLoading(false);
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const res: any = await adminApi.getModerationRecords(params);
      setRecords(res.list || res || []);
    } catch {
      setRecords([]);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    if (subTab === 'rules') loadRules();
    else loadRecords();
  }, [subTab, loadRules, loadRecords]);

  const handleCreateRule = async () => {
    try {
      await adminApi.createModerationRule(newRule);
      setShowRuleModal(false);
      setNewRule({ type: '', pattern: '', action: 'warn' });
      loadRules();
    } catch {
      setRules((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          ...newRule,
          status: 1,
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        },
      ]);
      setShowRuleModal(false);
      setNewRule({ type: '', pattern: '', action: 'warn' });
    }
  };

  const handleToggleRuleStatus = async (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: r.status === 1 ? 0 : 1 } : r))
    );
  };

  const handleReviewAction = async () => {
    if (!reviewModal.record || !reviewModal.action) return;
    const statusValue = reviewModal.action === 'approve' ? 1 : 2;
    try {
      await adminApi.updateModerationRecord(reviewModal.record.id, {
        status: statusValue,
        reason: reviewReason || undefined,
      });
    } catch {
      // local fallback
    }
    // Update local state
    const newStatus = reviewModal.action === 'approve' ? 'approved' : 'rejected';
    setRecords((prev) =>
      prev.map((r) =>
        r.id === reviewModal.record!.id
          ? {
              ...r,
              status: newStatus,
              reviewNote: reviewReason || undefined,
              reviewedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }
          : r
      )
    );
    setReviewModal({ open: false, record: null, action: null });
    setReviewReason('');
  };

  const openReviewModal = (record: ModerationRecord, action: 'approve' | 'reject') => {
    setReviewModal({ open: true, record, action });
    setReviewReason('');
  };

  // Summary counts
  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const approvedCount = records.filter((r) => r.status === 'approved').length;
  const rejectedCount = records.filter((r) => r.status === 'rejected').length;

  const typeLabel = (t: string) => {
    const map: Record<string, string> = { keyword: '关键词', regex: '正则', ai: 'AI检测' };
    return map[t] || t;
  };
  const actionLabel = (a: string) => {
    const map: Record<string, string> = { warn: '警告', block: '拦截', review: '审核' };
    return map[a] || a;
  };
  const actionColor = (a: string) => {
    const map: Record<string, string> = {
      warn: 'bg-amber-500/15 text-amber-300',
      block: 'bg-red-500/15 text-red-300',
      review: 'bg-blue-500/15 text-blue-300',
    };
    return map[a] || 'bg-zinc-500/15 text-zinc-300';
  };
  const statusLabel = (s: string | number) => {
    const map: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
    if (typeof s === 'number') return s === 1 ? '启用' : '禁用';
    return map[s] || s;
  };
  const statusColor = (s: string | number) => {
    if (typeof s === 'number') {
      return s === 1 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-500/15 text-zinc-400';
    }
    const map: Record<string, string> = {
      pending: 'bg-amber-500/15 text-amber-300',
      approved: 'bg-emerald-500/15 text-emerald-300',
      rejected: 'bg-red-500/15 text-red-300',
    };
    return map[s] || 'bg-zinc-500/15 text-zinc-300';
  };
  const targetTypeLabel = (t: string) => {
    const map: Record<string, string> = { post: '帖子', comment: '评论', user: '用户', message: '消息' };
    return map[t] || t;
  };

  return (
    <div className="space-y-6" data-name="adminModerationTab">
      <div className="flex items-center justify-between" data-name="adminModerationHeader">
        <h2 className="text-xl font-bold text-white" data-name="adminModerationTitle">内容审核</h2>
        {subTab === 'rules' && (
          <button
            onClick={() => setShowRuleModal(true)}
            data-name="adminCreateRuleBtn"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
          >
            <IconPlus size={16} /> 创建规则
          </button>
        )}
      </div>

      {/* Sub tabs + summary */}
      <div className="flex items-center gap-4" data-name="adminModerationSubTabWrap">
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg" data-name="adminModerationSubTabGroup">
          {(['records', 'rules'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              data-name={`adminModerationSubTab${key}`}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                subTab === key
                  ? 'bg-gradient-to-r from-blue-600/80 to-cyan-500/60 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {key === 'rules' ? '审核规则' : '审核记录'}
            </button>
          ))}
        </div>
        {subTab === 'records' && records.length > 0 && (
          <div className="flex items-center gap-2 text-xs" data-name="adminModerationSummary">
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-medium" data-name="adminModerationPendingCount">
                {pendingCount} 待审核
              </span>
            )}
            {approvedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-medium" data-name="adminModerationApprovedCount">
                {approvedCount} 已通过
              </span>
            )}
            {rejectedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 font-medium" data-name="adminModerationRejectedCount">
                {rejectedCount} 已拒绝
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status filter for records */}
      {subTab === 'records' && (
        <div className="flex items-center gap-2" data-name="adminModerationFilterBar">
          <IconFilter size={16} className="text-zinc-500" />
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              data-name={`adminModerationFilter${s}`}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {s === 'all' ? '全部' : statusLabel(s)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20" data-name="adminModerationLoadingSpinner">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : subTab === 'rules' ? (
        /* ========== Rules List ========== */
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden" data-name="adminRuleTableWrap">
          <table className="w-full text-sm" data-name="adminRuleTable">
            <thead>
              <tr className="border-b border-white/5" data-name="adminRuleTableHeader">
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">类型</th>
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">匹配模式</th>
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">动作</th>
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">状态</th>
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">更新时间</th>
                <th className="text-right px-5 py-3 text-zinc-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody data-name="adminRuleTableBody">
              {rules.map((r) => (
                <tr key={r.id} data-name={`adminRule${r.id}Row`} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-zinc-300">{typeLabel(r.type)}</td>
                  <td className="px-5 py-3 text-white font-mono text-xs">{r.pattern}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColor(r.action)}`} data-name={`adminRule${r.id}ActionBadge`}>
                      {actionLabel(r.action)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`} data-name={`adminRule${r.id}StatusBadge`}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">{r.updatedAt}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleToggleRuleStatus(r.id)}
                      data-name={`adminRule${r.id}ToggleBtn`}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-white/5 transition-colors"
                      title={r.status === 1 ? '禁用' : '启用'}
                    >
                      {r.status === 1 ? (
                        <IconClose size={20} className="text-emerald-400" />
                      ) : (
                        <IconCheck size={20} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr data-name="adminRuleTableEmpty">
                  <td colSpan={6} className="px-5 py-10 text-center text-zinc-500">
                    暂无审核规则
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* ========== Records List ========== */
        <div className="space-y-3" data-name="adminRecordList">
          {records.map((r) => (
            <div
              key={r.id}
              data-name={`adminRecord${r.id}Card`}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.03] transition-colors"
            >
              {/* Record header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Target type badge */}
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 text-xs font-medium" data-name={`adminRecord${r.id}TypeBadge`}>
                      {targetTypeLabel(r.targetType)}
                    </span>
                    {/* Status badge */}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`} data-name={`adminRecord${r.id}StatusBadge`}>
                      {statusLabel(r.status)}
                    </span>
                    {/* Reason tag */}
                    <span className="text-zinc-500 text-xs flex items-center gap-1">
                      <IconWarning size={12} />
                      {r.reason}
                    </span>
                    <span className="text-zinc-600 text-xs">{r.createdAt}</span>
                  </div>
                  {/* Content preview */}
                  <div className="text-sm text-zinc-300" data-name={`adminRecord${r.id}Content`}>
                    <span className="text-zinc-500 mr-1">目标ID:</span>
                    <span className="font-mono text-xs text-white">{r.targetId}</span>
                    {r.content && (
                      <div className="mt-1.5 text-zinc-400 text-xs line-clamp-2 bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.03]" data-name={`adminRecord${r.id}ContentPreview`}>
                        {r.content}
                      </div>
                    )}
                  </div>
                  {/* Review info */}
                  {(r.reviewNote || r.reviewer || r.reviewedAt) && (
                    <div className="text-xs text-zinc-500 flex items-center gap-3 flex-wrap" data-name={`adminRecord${r.id}ReviewInfo`}>
                      {r.reviewer && <span>审核人: {r.reviewer}</span>}
                      {r.reviewNote && <span>备注: {r.reviewNote}</span>}
                      {r.reviewedAt && <span>审核时间: {r.reviewedAt}</span>}
                    </div>
                  )}
                </div>

                {/* Action buttons - only for pending */}
                {r.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0" data-name={`adminRecord${r.id}Actions`}>
                    <button
                      onClick={() => openReviewModal(r, 'approve')}
                      data-name={`adminRecord${r.id}ApproveBtn`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                      title="通过"
                    >
                      <IconCheck size={14} /> 通过
                    </button>
                    <button
                      onClick={() => openReviewModal(r, 'reject')}
                      data-name={`adminRecord${r.id}RejectBtn`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors"
                      title="拒绝"
                    >
                      <IconClose size={14} /> 拒绝
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {records.length === 0 && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] px-5 py-16 text-center" data-name="adminRecordListEmpty">
              <IconShield size={40} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">
                {statusFilter === 'all' ? '暂无审核记录' : `暂无${statusLabel(statusFilter)}的记录`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Rule Modal */}
      <Modal open={showRuleModal} onClose={() => setShowRuleModal(false)} title="创建审核规则">
        <div className="space-y-4" data-name="adminCreateRuleForm">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 block">规则类型</label>
            <select
              value={newRule.type}
              onChange={(e) => setNewRule((p) => ({ ...p, type: e.target.value }))}
              data-name="adminCreateRuleTypeSelect"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="" className="bg-[hsl(var(--admin-modal-bg))]">请选择</option>
              <option value="keyword" className="bg-[hsl(var(--admin-modal-bg))]">关键词</option>
              <option value="regex" className="bg-[hsl(var(--admin-modal-bg))]">正则表达式</option>
              <option value="ai" className="bg-[hsl(var(--admin-modal-bg))]">AI检测</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 block">匹配模式</label>
            <input
              value={newRule.pattern}
              onChange={(e) => setNewRule((p) => ({ ...p, pattern: e.target.value }))}
              data-name="adminCreateRulePatternInput"
              placeholder="输入关键词或正则表达式"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 block">动作</label>
            <select
              value={newRule.action}
              onChange={(e) => setNewRule((p) => ({ ...p, action: e.target.value }))}
              data-name="adminCreateRuleActionSelect"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="warn" className="bg-[hsl(var(--admin-modal-bg))]">警告</option>
              <option value="block" className="bg-[hsl(var(--admin-modal-bg))]">拦截</option>
              <option value="review" className="bg-[hsl(var(--admin-modal-bg))]">人工审核</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2" data-name="adminCreateRuleFormActions">
            <button
              onClick={() => setShowRuleModal(false)}
              data-name="adminCreateRuleCancelBtn"
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreateRule}
              disabled={!newRule.type || !newRule.pattern}
              data-name="adminCreateRuleSubmitBtn"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium disabled:opacity-40 hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
            >
              创建
            </button>
          </div>
        </div>
      </Modal>

      {/* Review Action Modal */}
      <Modal
        open={reviewModal.open}
        onClose={() => { setReviewModal({ open: false, record: null, action: null }); setReviewReason(''); }}
        title={reviewModal.action === 'approve' ? '通过审核' : '拒绝内容'}
      >
        <div className="space-y-4" data-name="adminReviewActionForm">
          {reviewModal.record && (
            <div className="rounded-lg bg-white/[0.03] border border-white/5 px-4 py-3 space-y-1.5" data-name="adminReviewRecordInfo">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">目标:</span>
                <span className="text-white font-mono">{reviewModal.record.targetType} / {reviewModal.record.targetId}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">举报原因:</span>
                <span className="text-zinc-300">{reviewModal.record.reason}</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              {reviewModal.action === 'approve' ? '通过说明（可选）' : '拒绝理由（可选）'}
            </label>
            <textarea
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              data-name="adminReviewReasonTextarea"
              placeholder={reviewModal.action === 'approve' ? '填写通过说明...' : '填写拒绝理由...'}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2" data-name="adminReviewActionFormActions">
            <button
              onClick={() => { setReviewModal({ open: false, record: null, action: null }); setReviewReason(''); }}
              data-name="adminReviewCancelBtn"
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleReviewAction}
              data-name="adminReviewConfirmBtn"
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-all ${
                reviewModal.action === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20'
                  : 'bg-red-600 hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/20'
              }`}
            >
              {reviewModal.action === 'approve' ? '确认通过' : '确认拒绝'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ==================== Announcements Tab ====================

function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 1,
    priority: 0,
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const res: any = await adminApi.getAnnouncements();
      setAnnouncements(res.list || res || []);
    } catch {
      setAnnouncements([
        { id: '1', title: '系统升级通知', content: '系统将于今晚进行升级维护', type: 1, priority: 1, startTime: null, endTime: null, isSticky: 1, status: 1, createdBy: 'admin', createdAt: '2025-06-10', updatedAt: '2025-06-10' },
        { id: '2', title: '新功能上线', content: 'AI角色创建功能已上线', type: 2, priority: 0, startTime: null, endTime: null, isSticky: 0, status: 1, createdBy: 'admin', createdAt: '2025-06-08', updatedAt: '2025-06-08' },
        { id: '3', title: '社区规范更新', content: '请查阅最新的社区规范', type: 3, priority: 2, startTime: null, endTime: null, isSticky: 0, status: 1, createdBy: 'admin', createdAt: '2025-06-05', updatedAt: '2025-06-05' },
      ]);
    }
  };

  const handleCreate = async () => {
    try {
      await adminApi.createAnnouncement(form);
      setShowModal(false);
      setForm({ title: '', content: '', type: 1, priority: 0 });
      loadAnnouncements();
    } catch {
      setAnnouncements((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          ...form,
          startTime: null,
          endTime: null,
          isSticky: 0,
          status: 1,
          createdBy: 'admin',
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        },
      ]);
      setShowModal(false);
      setForm({ title: '', content: '', type: 1, priority: 0 });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteAnnouncement(id);
      loadAnnouncements();
    } catch {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const typeLabel = (t: number) => {
    const map: Record<number, string> = { 1: '系统', 2: '活动', 3: '重要' };
    return map[t] || '通知';
  };
  const typeColor = (t: number) => {
    const map: Record<number, string> = { 1: 'bg-blue-500/15 text-blue-300', 2: 'bg-emerald-500/15 text-emerald-300', 3: 'bg-red-500/15 text-red-300' };
    return map[t] || 'bg-zinc-500/15 text-zinc-300';
  };
  const priorityLabel = (p: number) => {
    const map: Record<number, string> = { 0: '普通', 1: '重要', 2: '紧急' };
    return map[p] || '普通';
  };
  const priorityColor = (p: number) => {
    const map: Record<number, string> = { 0: 'bg-zinc-500/15 text-zinc-400', 1: 'bg-amber-500/15 text-amber-300', 2: 'bg-red-500/15 text-red-300' };
    return map[p] || 'bg-zinc-500/15 text-zinc-400';
  };

  return (
    <div className="space-y-6" data-name="adminAnnouncementsTab">
      <div className="flex items-center justify-between" data-name="adminAnnouncementsHeader">
        <h2 className="text-xl font-bold text-white" data-name="adminAnnouncementsTitle">系统公告</h2>
        <button
          onClick={() => setShowModal(true)}
          data-name="adminCreateAnnouncementBtn"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
        >
          <IconPlus size={16} /> 创建公告
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden" data-name="adminAnnouncementTableWrap">
        <table className="w-full text-sm" data-name="adminAnnouncementTable">
          <thead>
            <tr className="border-b border-white/5" data-name="adminAnnouncementTableHeader">
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">标题</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">类型</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">优先级</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">状态</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">时间</th>
              <th className="text-right px-5 py-3 text-zinc-400 font-medium">操作</th>
            </tr>
          </thead>
          <tbody data-name="adminAnnouncementTableBody">
            {announcements.map((a) => (
              <tr key={a.id} data-name={`adminAnnouncement${a.id}Row`} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 text-white font-medium">{a.title}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(a.type)}`} data-name={`adminAnnouncement${a.id}TypeBadge`}>
                    {typeLabel(a.type)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor(a.priority)}`} data-name={`adminAnnouncement${a.id}PriorityBadge`}>
                    {priorityLabel(a.priority)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300" data-name={`adminAnnouncement${a.id}StatusBadge`}>
                    已发布
                  </span>
                </td>
                <td className="px-5 py-3 text-zinc-500 text-xs">{a.createdAt}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleDelete(a.id)}
                    data-name={`adminAnnouncement${a.id}DeleteBtn`}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <IconDelete size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {announcements.length === 0 && (
              <tr data-name="adminAnnouncementTableEmpty">
                <td colSpan={6} className="px-5 py-10 text-center text-zinc-500">
                  暂无公告
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Announcement Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="创建公告">
        <div className="space-y-4" data-name="adminCreateAnnouncementForm">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">标题</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              data-name="adminAnnouncementTitleInput"
              placeholder="公告标题"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">内容</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              data-name="adminAnnouncementContentTextarea"
              placeholder="公告内容"
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4" data-name="adminAnnouncementTypePriorityGrid">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">类型</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: Number(e.target.value) }))}
                data-name="adminAnnouncementTypeSelect"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              >
                <option value={1} className="bg-[hsl(var(--admin-modal-bg))]">系统</option>
                <option value={2} className="bg-[hsl(var(--admin-modal-bg))]">活动</option>
                <option value={3} className="bg-[hsl(var(--admin-modal-bg))]">重要</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">优先级</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))}
                data-name="adminAnnouncementPrioritySelect"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              >
                <option value={0} className="bg-[hsl(var(--admin-modal-bg))]">普通</option>
                <option value={1} className="bg-[hsl(var(--admin-modal-bg))]">重要</option>
                <option value={2} className="bg-[hsl(var(--admin-modal-bg))]">紧急</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2" data-name="adminAnnouncementFormActions">
            <button
              onClick={() => setShowModal(false)}
              data-name="adminAnnouncementCancelBtn"
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.title || !form.content}
              data-name="adminAnnouncementSubmitBtn"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium disabled:opacity-40 hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
            >
              创建
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ==================== Security Tab ====================

function SecurityTab() {
  const [subTab, setSubTab] = useState<'blacklist' | 'risk'>('blacklist');
  const [blacklist, setBlacklist] = useState<IpBlacklist[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIp, setNewIp] = useState({ ip: '', reason: '' });
  const [loading, setLoading] = useState(false);

  const loadBlacklist = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await adminApi.getIpBlacklist();
      setBlacklist(res.list || res || []);
    } catch {
      setBlacklist([
        { id: '1', ip: '192.168.1.100', reason: '恶意请求', createdBy: 'admin', createdAt: '2025-06-10' },
        { id: '2', ip: '10.0.0.55', reason: '暴力破解', createdBy: 'system', createdAt: '2025-06-09' },
      ]);
    }
    setLoading(false);
  }, []);

  const loadRisks = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await adminApi.getRiskAssessments();
      setRisks(res.list || res || []);
    } catch {
      setRisks([
        { id: '1', userId: 'u-101', riskType: 'login', riskLevel: 3, description: '异地登录', createdAt: '2025-06-10 14:30' },
        { id: '2', userId: 'u-202', riskType: 'behavior', riskLevel: 2, description: '频繁发帖', createdAt: '2025-06-10 15:20' },
        { id: '3', userId: 'u-303', riskType: 'login', riskLevel: 5, description: '疑似被盗号', createdAt: '2025-06-10 16:05' },
      ]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (subTab === 'blacklist') loadBlacklist();
    else loadRisks();
  }, [subTab, loadBlacklist, loadRisks]);

  const handleAddIp = async () => {
    try {
      await adminApi.addIpBlacklist(newIp);
      setShowAddModal(false);
      setNewIp({ ip: '', reason: '' });
      loadBlacklist();
    } catch {
      setBlacklist((prev) => [
        ...prev,
        { id: String(Date.now()), ...newIp, createdBy: 'admin', createdAt: new Date().toISOString().slice(0, 10) },
      ]);
      setShowAddModal(false);
      setNewIp({ ip: '', reason: '' });
    }
  };

  const handleRemoveIp = async (id: string) => {
    try {
      await adminApi.removeIpBlacklist(id);
      loadBlacklist();
    } catch {
      setBlacklist((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const riskLevelColor = (l: number) => {
    if (l >= 4) return 'bg-red-500/15 text-red-300';
    if (l >= 2) return 'bg-amber-500/15 text-amber-300';
    return 'bg-emerald-500/15 text-emerald-300';
  };
  const riskLevelLabel = (l: number) => {
    if (l >= 4) return '高危';
    if (l >= 2) return '中危';
    return '低危';
  };

  return (
    <div className="space-y-6" data-name="adminSecurityTab">
      <div className="flex items-center justify-between" data-name="adminSecurityHeader">
        <h2 className="text-xl font-bold text-white" data-name="adminSecurityTitle">安全管理</h2>
        {subTab === 'blacklist' && (
          <button
            onClick={() => setShowAddModal(true)}
            data-name="adminAddIpBtn"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
          >
            <IconPlus size={16} /> 添加IP
          </button>
        )}
      </div>

      {/* Sub tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit" data-name="adminSecuritySubTabGroup">
        {(['blacklist', 'risk'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            data-name={`adminSecuritySubTab${key}`}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              subTab === key
                ? 'bg-gradient-to-r from-blue-600/80 to-cyan-500/60 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {key === 'blacklist' ? 'IP黑名单' : '风险评估'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20" data-name="adminSecurityLoadingSpinner">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : subTab === 'blacklist' ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden" data-name="adminBlacklistTableWrap">
          <table className="w-full text-sm" data-name="adminBlacklistTable">
            <thead>
              <tr className="border-b border-white/5" data-name="adminBlacklistTableHeader">
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">IP地址</th>
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">原因</th>
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">添加者</th>
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">时间</th>
                <th className="text-right px-5 py-3 text-zinc-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody data-name="adminBlacklistTableBody">
              {blacklist.map((b) => (
                <tr key={b.id} data-name={`adminBlacklist${b.id}Row`} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-white font-mono text-xs">{b.ip}</td>
                  <td className="px-5 py-3 text-zinc-400">{b.reason}</td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">{b.createdBy}</td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">{b.createdAt}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleRemoveIp(b.id)}
                      data-name={`adminBlacklist${b.id}DeleteBtn`}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <IconDelete size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {blacklist.length === 0 && (
                <tr data-name="adminBlacklistTableEmpty">
                  <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">
                    暂无IP黑名单
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden" data-name="adminRiskTableWrap">
          <table className="w-full text-sm" data-name="adminRiskTable">
            <thead>
              <tr className="border-b border-white/5" data-name="adminRiskTableHeader">
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">用户ID</th>
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">风险类型</th>
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">风险等级</th>
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">描述</th>
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">时间</th>
              </tr>
            </thead>
            <tbody data-name="adminRiskTableBody">
              {risks.map((r) => (
                <tr key={r.id} data-name={`adminRisk${r.id}Row`} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-white font-mono text-xs">{r.userId}</td>
                  <td className="px-5 py-3 text-zinc-300">{r.riskType}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskLevelColor(r.riskLevel)}`} data-name={`adminRisk${r.id}LevelBadge`}>
                      {riskLevelLabel(r.riskLevel)} (L{r.riskLevel})
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-400">{r.description}</td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">{r.createdAt}</td>
                </tr>
              ))}
              {risks.length === 0 && (
                <tr data-name="adminRiskTableEmpty">
                  <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">
                    暂无风险评估记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add IP Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="添加IP黑名单">
        <div className="space-y-4" data-name="adminAddIpForm">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">IP地址</label>
            <input
              value={newIp.ip}
              onChange={(e) => setNewIp((p) => ({ ...p, ip: e.target.value }))}
              data-name="adminAddIpInput"
              placeholder="例如: 192.168.1.100"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">原因</label>
            <input
              value={newIp.reason}
              onChange={(e) => setNewIp((p) => ({ ...p, reason: e.target.value }))}
              data-name="adminAddIpReasonInput"
              placeholder="封禁原因"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2" data-name="adminAddIpFormActions">
            <button
              onClick={() => setShowAddModal(false)}
              data-name="adminAddIpCancelBtn"
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddIp}
              disabled={!newIp.ip || !newIp.reason}
              data-name="adminAddIpSubmitBtn"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium disabled:opacity-40 hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
            >
              添加
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ==================== Config Tab ====================

function ConfigTab() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res: any = await adminApi.getSystemConfig();
      // API 可能返回对象或数组，做兼容处理
      if (Array.isArray(res)) {
        setConfigs(res);
      } else if (res && res.list) {
        setConfigs(res.list);
      } else if (typeof res === 'object') {
        // 如果返回的是 key-value 对象，转为数组
        const entries = Object.entries(res).filter(([k]) => k !== 'id' && typeof res[k] !== 'object');
        setConfigs(
          entries.map(([key, value]) => ({
            id: key,
            key,
            value: String(value),
            description: '',
            updatedAt: new Date().toISOString().slice(0, 10),
          }))
        );
      }
    } catch {
      setConfigs([
        { id: '1', key: 'max_upload_size', value: '10MB', description: '最大上传文件大小', updatedAt: '2025-06-01' },
        { id: '2', key: 'ai_auto_reply', value: 'true', description: 'AI自动回复开关', updatedAt: '2025-06-02' },
        { id: '3', key: 'content_moderation', value: 'enabled', description: '内容审核开关', updatedAt: '2025-06-03' },
        { id: '4', key: 'rate_limit_per_min', value: '60', description: '每分钟请求限制', updatedAt: '2025-06-04' },
      ]);
    }
    setLoading(false);
  };

  const startEdit = (config: SystemConfig) => {
    setEditingId(config.id);
    setEditValue(config.value);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (config: SystemConfig) => {
    try {
      await adminApi.setSystemConfig({ [config.key]: editValue });
    } catch {
      // 本地更新
    }
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === config.id ? { ...c, value: editValue, updatedAt: new Date().toISOString().slice(0, 10) } : c
      )
    );
    setEditingId(null);
    setEditValue('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-name="adminConfigLoadingSpinner">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-name="adminConfigTab">
      <h2 className="text-xl font-bold text-white" data-name="adminConfigTitle">系统配置</h2>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden" data-name="adminConfigTableWrap">
        <table className="w-full text-sm" data-name="adminConfigTable">
          <thead>
            <tr className="border-b border-white/5" data-name="adminConfigTableHeader">
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">键</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">值</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">描述</th>
              <th className="text-right px-5 py-3 text-zinc-400 font-medium">操作</th>
            </tr>
          </thead>
          <tbody data-name="adminConfigTableBody">
            {configs.map((c) => (
              <tr key={c.id} data-name={`adminConfig${c.id}Row`} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 text-cyan-300 font-mono text-xs">{c.key}</td>
                <td className="px-5 py-3">
                  {editingId === c.id ? (
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      data-name={`adminConfig${c.id}EditInput`}
                      className="px-2 py-1 rounded bg-white/5 border border-cyan-500/50 text-sm text-white focus:outline-none w-40"
                      autoFocus
                    />
                  ) : (
                    <span className="text-white font-mono text-xs">{c.value}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-zinc-400">{c.description}</td>
                <td className="px-5 py-3 text-right">
                  {editingId === c.id ? (
                    <div className="inline-flex items-center gap-1" data-name={`adminConfig${c.id}EditActions`}>
                      <button
                        onClick={() => saveEdit(c)}
                        data-name={`adminConfig${c.id}SaveBtn`}
                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        <IconCheck size={16} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        data-name={`adminConfig${c.id}CancelBtn`}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <IconClose size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(c)}
                      data-name={`adminConfig${c.id}EditBtn`}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-white/5 transition-colors"
                    >
                      <IconEdit size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {configs.length === 0 && (
              <tr data-name="adminConfigTableEmpty">
                <td colSpan={4} className="px-5 py-10 text-center text-zinc-500">
                  暂无配置项
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== Audit Log Tab ====================

function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getAuditLogs({ page: 1, pageSize: 50 }).then((res: any) => {
      setLogs(res.list || res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const actionLabel: Record<string, string> = {
    user_ban: '封禁用户', user_unban: '解封用户',
    post_delete: '删除帖子', post_restore: '恢复帖子',
    config_update: '更新配置', moderation_approve: '审核通过', moderation_reject: '审核驳回',
    comment_delete: '删除评论', login_attempt: '登录尝试',
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20" data-name="adminAuditLoadingSpinner"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" data-name="adminAuditTab">
      <h2 className="text-xl font-bold text-white" data-name="adminAuditTitle">审计日志</h2>
      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden" data-name="adminAuditTableWrap">
        <table className="w-full text-sm" data-name="adminAuditTable">
          <thead>
            <tr className="border-b border-white/5" data-name="adminAuditTableHeader">
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">时间</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">操作人</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">操作</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">目标</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">描述</th>
              <th className="text-left px-5 py-3 text-zinc-400 font-medium">IP</th>
            </tr>
          </thead>
          <tbody data-name="adminAuditTableBody">
            {logs.map((log) => (
              <tr key={log.id} data-name={`adminAudit${log.id}Row`} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 text-zinc-300 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-5 py-3 text-zinc-300">{log.operatorName || log.operatorId?.slice(0, 8)}</td>
                <td className="px-5 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/10 text-cyan-400" data-name={`adminAudit${log.id}ActionBadge`}>
                    {actionLabel[log.action] || log.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-zinc-400">{log.targetType}/{log.targetId?.slice(0, 8)}</td>
                <td className="px-5 py-3 text-zinc-400 max-w-[200px] truncate">{log.description || '-'}</td>
                <td className="px-5 py-3 text-zinc-500 font-mono text-xs">{log.ip || '-'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr data-name="adminAuditTableEmpty"><td colSpan={6} className="px-5 py-10 text-center text-zinc-500">暂无审计日志</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== Feedback Tab ====================

function FeedbackTab() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadFeedbacks = useCallback(() => {
    adminApi.getFeedbacks({ page: 1, pageSize: 50 }).then((res: any) => {
      setFeedbacks(res.list || res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadFeedbacks(); }, [loadFeedbacks]);

  const handleStatus = async (id: string, status: string) => {
    setProcessing(id);
    try {
      await adminApi.updateFeedbackStatus(id, { status });
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    } catch {} finally { setProcessing(null); }
  };

  const statusLabel: Record<string, { text: string; cls: string }> = {
    pending: { text: '待处理', cls: 'bg-yellow-500/10 text-yellow-400' },
    processing: { text: '处理中', cls: 'bg-blue-500/10 text-blue-400' },
    resolved: { text: '已解决', cls: 'bg-green-500/10 text-green-400' },
    closed: { text: '已关闭', cls: 'bg-zinc-500/10 text-zinc-400' },
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20" data-name="adminFeedbackLoadingSpinner"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" data-name="adminFeedbackTab">
      <h2 className="text-xl font-bold text-white" data-name="adminFeedbackTitle">反馈处理</h2>
      <div className="space-y-3" data-name="adminFeedbackList">
        {feedbacks.map((fb) => {
          const sl = statusLabel[fb.status] || { text: fb.status, cls: 'bg-zinc-500/10 text-zinc-400' };
          return (
            <div key={fb.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-5" data-name={`adminFeedback${fb.id}Card`}>
              <div className="flex items-start justify-between gap-4 mb-3" data-name={`adminFeedback${fb.id}Header`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white truncate">{fb.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${sl.cls}`} data-name={`adminFeedback${fb.id}StatusBadge`}>{sl.text}</span>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2">{fb.content}</p>
                </div>
                <span className="text-xs text-zinc-500 shrink-0">{new Date(fb.createdAt).toLocaleDateString()}</span>
              </div>
              {fb.adminReply && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-sm text-zinc-300" data-name={`adminFeedback${fb.id}AdminReply`}>
                  <span className="text-cyan-400 font-medium">管理员回复：</span>{fb.adminReply}
                </div>
              )}
              <div className="flex items-center gap-2 mt-3" data-name={`adminFeedback${fb.id}Actions`}>
                {fb.status === 'pending' && (
                  <button onClick={() => handleStatus(fb.id, 'processing')} disabled={processing === fb.id}
                    data-name={`adminFeedback${fb.id}ProcessBtn`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50">
                    开始处理
                  </button>
                )}
                {fb.status === 'processing' && (
                  <button onClick={() => handleStatus(fb.id, 'resolved')} disabled={processing === fb.id}
                    data-name={`adminFeedback${fb.id}ResolveBtn`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50">
                    标记解决
                  </button>
                )}
                {fb.status !== 'closed' && (
                  <button onClick={() => handleStatus(fb.id, 'closed')} disabled={processing === fb.id}
                    data-name={`adminFeedback${fb.id}CloseBtn`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 transition-colors disabled:opacity-50">
                    关闭
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {feedbacks.length === 0 && (
          <div className="text-center py-20 text-zinc-500" data-name="adminFeedbackListEmpty">暂无反馈</div>
        )}
      </div>
    </div>
  );
}

// ==================== Main Dashboard ====================

export function AdminDashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 权限检查
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--admin-bg))' }} data-name="adminNoAuth">
          <p className="text-zinc-500 text-sm">请先登录后再访问管理后台</p>
        </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--admin-bg))' }} data-name="adminNoPerm">
          <p className="text-zinc-500 text-sm">仅管理员可访问此页面</p>
        </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'users':
        return <UsersTab />;
      case 'moderation':
        return <ModerationTab />;
      case 'feedback':
        return <FeedbackTab />;
      case 'announcements':
        return <AnnouncementsTab />;
      case 'audit':
        return <AuditTab />;
      case 'security':
        return <SecurityTab />;
      case 'config':
        return <ConfigTab />;
    }
  };

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: 'hsl(var(--admin-bg))' }} data-name="admin">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />

      {/* Main content */}
      <main
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-56'
        }`}
        data-name="adminMainContent"
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-8 border-b border-white/5 backdrop-blur-xl" style={{ backgroundColor: 'hsl(var(--admin-bg) / 0.8)' }} data-name="adminHeader">
          <div>
            <h1 className="text-sm font-semibold text-white" data-name="adminHeaderTitle">
              {sidebarItems.find((i) => i.key === activeTab)?.label || '管理后台'}
            </h1>
          </div>
          <div className="flex items-center gap-3" data-name="adminHeaderUserArea">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white" data-name="adminUserAvatar">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <span className="text-sm text-zinc-400" data-name="adminUsername">{user?.username || 'Admin'}</span>
          </div>
        </header>

        {/* Tab content */}
        <div className="p-8" data-name="adminTabContent">{renderTab()}</div>
      </main>
    </div>
  );
}
