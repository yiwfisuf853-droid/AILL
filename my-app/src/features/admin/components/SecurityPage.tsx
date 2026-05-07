import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api';
import type { IpBlacklist, RiskAssessment } from '../types';
import { IconLock, IconPlus, IconDelete } from '@/components/ui/Icon';
import { AdminModal } from './AdminLayout';
import { cn } from '@/lib/utils';

export function SecurityPage() {
  const [subTab, setSubTab] = useState<'blacklist' | 'risk' | 'trust'>('blacklist');
  const [blacklist, setBlacklist] = useState<IpBlacklist[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIp, setNewIp] = useState({ ip: '', reason: '' });
  const [loading, setLoading] = useState(false);

  const loadBlacklist = useCallback(async () => {
    setLoading(true);
    try { const res: any = await adminApi.getIpBlacklist(); setBlacklist(res.list || res || []); } catch { setBlacklist([]); }
    setLoading(false);
  }, []);

  const loadRisks = useCallback(async () => {
    setLoading(true);
    try { const res: any = await adminApi.getRiskAssessments(); setRisks(res.list || res || []); } catch { setRisks([]); }
    setLoading(false);
  }, []);

  useEffect(() => { subTab === 'blacklist' ? loadBlacklist() : loadRisks(); }, [subTab, loadBlacklist, loadRisks]);

  const handleAddIp = async () => {
    try { await adminApi.addIpBlacklist(newIp); } catch {}
    setBlacklist(prev => [...prev, { id: String(Date.now()), ...newIp, createdBy: 'admin', createdAt: new Date().toISOString().slice(0, 10) }]);
    setShowAddModal(false); setNewIp({ ip: '', reason: '' });
  };

  const handleRemoveIp = async (id: string) => {
    try { await adminApi.removeIpBlacklist(id); } catch {}
    setBlacklist(prev => prev.filter(b => b.id !== id));
  };

  const riskLevelColor = (l: number) => l >= 4 ? 'bg-destructive/15 text-destructive-light' : l >= 2 ? 'bg-warning/15 text-warning-light' : 'bg-success/15 text-success-light';
  const riskLevelLabel = (l: number) => l >= 4 ? '高危' : l >= 2 ? '中危' : '低危';

  return (
    <div className="space-y-6" data-name="adminSecurity">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><IconLock size={22} className="text-primary" /> 安全管理</h2>
        {subTab === 'blacklist' && <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all"><IconPlus size={16} /> 添加IP</button>}
      </div>

      <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
        {(['blacklist', 'risk', 'trust'] as const).map(key => (
          <button key={key} onClick={() => setSubTab(key)} className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-all', subTab === key ? 'bg-primary/80 text-white' : 'text-foreground-tertiary hover:text-foreground-secondary')}>
            {key === 'blacklist' ? 'IP黑名单' : key === 'risk' ? '风险评估' : '信任等级'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : subTab === 'blacklist' ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5"><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">IP地址</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">原因</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">添加者</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">时间</th><th className="text-right px-5 py-3 text-foreground-tertiary font-medium">操作</th></tr></thead>
            <tbody>
              {blacklist.map(b => (
                <tr key={b.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-white font-mono text-xs">{b.ip}</td>
                  <td className="px-5 py-3 text-foreground-tertiary">{b.reason}</td>
                  <td className="px-5 py-3 text-foreground-tertiary text-xs">{b.createdBy}</td>
                  <td className="px-5 py-3 text-foreground-tertiary text-xs">{b.createdAt}</td>
                  <td className="px-5 py-3 text-right"><button onClick={() => handleRemoveIp(b.id)} className="p-1.5 rounded-lg text-foreground-tertiary hover:text-destructive hover:bg-destructive/10 transition-colors"><IconDelete size={16} /></button></td>
                </tr>
              ))}
              {blacklist.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-foreground-tertiary">暂无IP黑名单</td></tr>}
            </tbody>
          </table>
        </div>
      ) : subTab === 'risk' ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5"><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">用户ID</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">风险类型</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">风险等级</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">描述</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">时间</th></tr></thead>
            <tbody>
              {risks.map(r => (
                <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-white font-mono text-xs">{r.userId}</td>
                  <td className="px-5 py-3 text-foreground-secondary">{r.riskType}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskLevelColor(r.riskLevel)}`}>{riskLevelLabel(r.riskLevel)} (L{r.riskLevel})</span></td>
                  <td className="px-5 py-3 text-foreground-tertiary">{r.description}</td>
                  <td className="px-5 py-3 text-foreground-tertiary text-xs">{r.createdAt}</td>
                </tr>
              ))}
              {risks.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-foreground-tertiary">暂无风险评估记录</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 text-foreground-tertiary">信任等级管理开发中</div>
      )}

      <AdminModal open={showAddModal} onClose={() => setShowAddModal(false)} title="添加IP黑名单">
        <div className="space-y-4">
          <div><label className="block text-xs text-foreground-tertiary mb-1.5">IP地址</label><input value={newIp.ip} onChange={e => setNewIp(p => ({ ...p, ip: e.target.value }))} placeholder="例如: 192.168.1.100" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-muted-foreground focus:outline-none focus:border-primary/50" /></div>
          <div><label className="block text-xs text-foreground-tertiary mb-1.5">原因</label><input value={newIp.reason} onChange={e => setNewIp(p => ({ ...p, reason: e.target.value }))} placeholder="封禁原因" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-muted-foreground focus:outline-none focus:border-primary/50" /></div>
          <div className="flex justify-end gap-3 pt-2"><button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg text-sm text-foreground-tertiary hover:text-white hover:bg-white/5 transition-colors">取消</button><button onClick={handleAddIp} disabled={!newIp.ip || !newIp.reason} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 hover:shadow-lg hover:shadow-primary/20 transition-all">添加</button></div>
        </div>
      </AdminModal>
    </div>
  );
}
