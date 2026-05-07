import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import type { AuditLog } from '../types';
import { IconBookOpen } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

type LogSubTab = 'audit' | 'llm' | 'security';

export function LogsPage() {
  const [subTab, setSubTab] = useState<LogSubTab>('audit');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 'audit') {
        const res: any = await adminApi.getAuditLogs({ page: 1, pageSize: 50 });
        setLogs(res?.list || res?.data || []);
      } else if (subTab === 'llm') {
        const res: any = await adminApi.getLlmLogs({ page: 1, pageSize: 50 });
        setLogs(res?.list || res?.data || []);
      } else {
        const res: any = await adminApi.getAuditLogs({ page: 1, pageSize: 50, type: 'security' });
        setLogs(res?.list || res?.data || []);
      }
    } catch { setLogs([]); }
    setLoading(false);
  };

  const actionLabel: Record<string, string> = {
    user_ban: '封禁用户', user_unban: '解封用户', post_delete: '删除帖子', post_restore: '恢复帖子',
    config_update: '更新配置', moderation_approve: '审核通过', moderation_reject: '审核驳回',
    comment_delete: '删除评论', login_attempt: '登录尝试',
  };

  return (
    <div className="space-y-6" data-name="adminLogs">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><IconBookOpen size={22} className="text-primary" /> 日志管理</h2>

      <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
        {(['audit', 'llm', 'security'] as const).map(key => (
          <button key={key} onClick={() => setSubTab(key)} className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-all', subTab === key ? 'bg-primary/80 text-white' : 'text-foreground-tertiary hover:text-foreground-secondary')}>
            {key === 'audit' ? '操作日志' : key === 'llm' ? 'LLM日志' : '安全日志'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : subTab === 'audit' || subTab === 'security' ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5"><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">时间</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">操作人</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">操作</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">目标</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">描述</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">IP</th></tr></thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-foreground-secondary whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3 text-foreground-secondary">{log.operatorName || log.operatorId?.slice(0, 8)}</td>
                  <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{actionLabel[log.action] || log.action}</span></td>
                  <td className="px-5 py-3 text-foreground-tertiary">{log.targetType}/{log.targetId?.slice(0, 8)}</td>
                  <td className="px-5 py-3 text-foreground-tertiary max-w-[200px] truncate">{log.description || '-'}</td>
                  <td className="px-5 py-3 text-foreground-tertiary font-mono text-xs">{log.ip || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-foreground-tertiary">暂无日志</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5"><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">时间</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">AI</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">模型</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">Token</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">耗时</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">状态</th></tr></thead>
            <tbody>
              {logs.map((log: any, i: number) => (
                <tr key={log.id || i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-foreground-tertiary text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3 text-white">{log.aiName || log.userId?.slice(0, 8)}</td>
                  <td className="px-5 py-3 text-foreground-secondary">{log.model || '—'}</td>
                  <td className="px-5 py-3 text-foreground-secondary font-mono text-xs">{log.totalTokens || log.tokens || '—'}</td>
                  <td className="px-5 py-3 text-foreground-tertiary">{log.duration ? `${log.duration}ms` : '—'}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${log.status === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{log.status === 'success' ? '✅' : '❌'}</span></td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-foreground-tertiary">暂无 LLM 日志</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
