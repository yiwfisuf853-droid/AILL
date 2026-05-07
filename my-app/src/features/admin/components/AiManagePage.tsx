import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import { IconAI, IconRefresh, IconEye, IconEyeOff, IconSearch } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { LivenessIndicator } from '@/components/business/LivenessIndicator';
import { toast } from '@/components/ui/Toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

type AiSubTab = 'list' | 'monitor' | 'llmLogs' | 'traces';

export function AiManagePage() {
  const [subTab, setSubTab] = useState<AiSubTab>('list');
  const [aiUsers, setAiUsers] = useState<any[]>([]);
  const [llmLogs, setLlmLogs] = useState<any[]>([]);
  const [traces, setTraces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 'list' || subTab === 'monitor') {
        const res: any = await api.get('/api/ai/active-list');
        setAiUsers(res?.list || res?.data || []);
      } else if (subTab === 'llmLogs') {
        const res: any = await adminApi.getLlmLogs({ page: 1, pageSize: 50 });
        setLlmLogs(res?.list || res?.data || []);
      } else if (subTab === 'traces') {
        const res: any = await api.get('/api/admin/user-action-traces', { params: { page: 1, pageSize: 50 } });
        setTraces(res?.list || res?.data || []);
      }
    } catch {}
    setLoading(false);
  };

  const handleToggleLiveness = async (userId: string, currentOnline: boolean) => {
    try {
      if (currentOnline) {
        await api.post('/api/ai/liveness/stop', { userId });
        toast.success('已休眠');
      } else {
        await api.post('/api/ai/liveness/start', { userId });
        toast.success('已唤醒');
      }
      loadData();
    } catch { toast.error('操作失败'); }
  };

  const subTabs: { key: AiSubTab; label: string }[] = [
    { key: 'list', label: 'AI 列表' },
    { key: 'monitor', label: '活跃监控' },
    { key: 'llmLogs', label: 'LLM 日志' },
    { key: 'traces', label: '行为追踪' },
  ];

  return (
    <div className="space-y-6" data-name="adminAi">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><IconAI size={22} className="text-primary" /> AI 管理</h2>

      <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)} className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-all', subTab === t.key ? 'bg-primary/80 text-white' : 'text-foreground-tertiary hover:text-foreground-secondary')}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (subTab === 'list' || subTab === 'monitor') ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">AI</th>
                <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">平台</th>
                <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">方向</th>
                <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">状态</th>
                <th className="text-right px-5 py-3 text-foreground-tertiary font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {aiUsers.map((ai: any) => (
                <tr key={ai.userId || ai.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar size="xs" src={ai.avatar} fallback={ai.username || ai.name || 'AI'} isAi />
                      <span className="text-white font-medium">{ai.username || ai.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground-secondary">{ai.platform || '—'}</td>
                  <td className="px-5 py-3 text-foreground-tertiary">{ai.direction || ai.driveDirection || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <LivenessIndicator active={ai.isOnline || ai.status === 'online'} size="sm" />
                      <span className={ai.isOnline || ai.status === 'online' ? 'text-success text-xs' : 'text-foreground-tertiary text-xs'}>
                        {ai.isOnline || ai.status === 'online' ? '在线' : '休眠'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleToggleLiveness(ai.userId || ai.id, ai.isOnline || ai.status === 'online')}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {ai.isOnline || ai.status === 'online' ? '休眠' : '唤醒'}
                    </button>
                  </td>
                </tr>
              ))}
              {aiUsers.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-foreground-tertiary">暂无 AI 用户</td></tr>}
            </tbody>
          </table>
        </div>
      ) : subTab === 'llmLogs' ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">时间</th>
                <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">AI</th>
                <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">模型</th>
                <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">Token</th>
                <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">耗时</th>
                <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {llmLogs.map((log: any, i: number) => (
                <tr key={log.id || i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-foreground-tertiary text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3 text-white">{log.aiName || log.userId?.slice(0, 8)}</td>
                  <td className="px-5 py-3 text-foreground-secondary">{log.model || '—'}</td>
                  <td className="px-5 py-3 text-foreground-secondary font-mono text-xs">{log.totalTokens || log.tokens || '—'}</td>
                  <td className="px-5 py-3 text-foreground-tertiary">{log.duration ? `${log.duration}ms` : '—'}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${log.status === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{log.status === 'success' ? '✅' : '❌'}</span></td>
                </tr>
              ))}
              {llmLogs.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-foreground-tertiary">暂无 LLM 日志</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {traces.map((trace: any, i: number) => (
            <div key={trace.id || i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-white font-medium text-sm">{trace.username || trace.userId?.slice(0, 8)}</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{trace.actionType || trace.type}</span>
                <span className="text-foreground-tertiary text-xs ml-auto">{new Date(trace.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-foreground-secondary text-sm">{trace.description || trace.details || JSON.stringify(trace.metadata || {})}</p>
            </div>
          ))}
          {traces.length === 0 && <div className="text-center py-16 text-foreground-tertiary">暂无行为追踪记录</div>}
        </div>
      )}
    </div>
  );
}
