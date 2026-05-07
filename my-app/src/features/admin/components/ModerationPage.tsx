import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api';
import type { ModerationRule, ModerationRecord } from '../types';
import { IconShield, IconPlus, IconCheck, IconClose, IconWarning, IconFilter } from '@/components/ui/Icon';
import { AdminModal } from './AdminLayout';
import { cn } from '@/lib/utils';

export function ModerationPage() {
  const [subTab, setSubTab] = useState<'rules' | 'records'>('records');
  const [rules, setRules] = useState<ModerationRule[]>([]);
  const [records, setRecords] = useState<ModerationRecord[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({ type: '', pattern: '', action: 'warn' });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviewModal, setReviewModal] = useState<{ open: boolean; record: ModerationRecord | null; action: 'approve' | 'reject' | null }>({ open: false, record: null, action: null });
  const [reviewReason, setReviewReason] = useState('');

  const loadRules = useCallback(async () => {
    setLoading(true);
    try { const res: any = await adminApi.getModerationRules(); setRules(res.list || res || []); } catch { setRules([]); }
    setLoading(false);
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const res: any = await adminApi.getModerationRecords(params);
      setRecords(res.list || res || []);
    } catch { setRecords([]); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { subTab === 'rules' ? loadRules() : loadRecords(); }, [subTab, loadRules, loadRecords]);

  const handleCreateRule = async () => {
    try { await adminApi.createModerationRule(newRule); } catch {}
    setRules(prev => [...prev, { id: String(Date.now()), ...newRule, status: 1, createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) }]);
    setShowRuleModal(false); setNewRule({ type: '', pattern: '', action: 'warn' });
  };

  const handleReviewAction = async () => {
    if (!reviewModal.record || !reviewModal.action) return;
    const statusValue = reviewModal.action === 'approve' ? 1 : 2;
    try { await adminApi.updateModerationRecord(reviewModal.record.id, { status: statusValue, reason: reviewReason || undefined }); } catch {}
    const newStatus = reviewModal.action === 'approve' ? 'approved' : 'rejected';
    setRecords(prev => prev.map(r => r.id === reviewModal.record!.id ? { ...r, status: newStatus, reviewNote: reviewReason || undefined, reviewedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') } : r));
    setReviewModal({ open: false, record: null, action: null }); setReviewReason('');
  };

  const typeLabel = (t: string) => ({ keyword: '关键词', regex: '正则', ai: 'AI检测' }[t] || t);
  const actionLabel = (a: string) => ({ warn: '警告', block: '拦截', review: '审核' }[a] || a);
  const actionColor = (a: string) => ({ warn: 'bg-warning/15 text-warning-light', block: 'bg-destructive/15 text-destructive-light', review: 'bg-primary/15 text-primary-light' }[a] || '');
  const statusLabel = (s: string | number) => typeof s === 'number' ? (s === 1 ? '启用' : '禁用') : ({ pending: '待审核', approved: '已通过', rejected: '已拒绝' }[s] || s);
  const statusColor = (s: string | number) => {
    if (typeof s === 'number') return s === 1 ? 'bg-success/15 text-success-light' : 'bg-foreground-tertiary/15 text-foreground-tertiary';
    return { pending: 'bg-warning/15 text-warning-light', approved: 'bg-success/15 text-success-light', rejected: 'bg-destructive/15 text-destructive-light' }[s] || '';
  };

  return (
    <div className="space-y-6" data-name="adminModeration">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><IconShield size={22} className="text-primary" /> 内容审核</h2>
        {subTab === 'rules' && <button onClick={() => setShowRuleModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all"><IconPlus size={16} /> 创建规则</button>}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
          {(['records', 'rules'] as const).map(key => (
            <button key={key} onClick={() => setSubTab(key)} className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-all', subTab === key ? 'bg-primary/80 text-white' : 'text-foreground-tertiary hover:text-foreground-secondary')}>
              {key === 'rules' ? '审核规则' : '审核记录'}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'records' && (
        <div className="flex items-center gap-2">
          <IconFilter size={16} className="text-foreground-tertiary" />
          {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors', statusFilter === s ? 'bg-white/10 text-white' : 'text-foreground-tertiary hover:text-foreground-secondary hover:bg-white/5')}>
              {s === 'all' ? '全部' : statusLabel(s)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : subTab === 'rules' ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5"><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">类型</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">匹配模式</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">动作</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">状态</th><th className="text-right px-5 py-3 text-foreground-tertiary font-medium">操作</th></tr></thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-foreground-secondary">{typeLabel(r.type)}</td>
                  <td className="px-5 py-3 text-white font-mono text-xs">{r.pattern}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColor(r.action)}`}>{actionLabel(r.action)}</span></td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{statusLabel(r.status)}</span></td>
                  <td className="px-5 py-3 text-right"><button onClick={() => setRules(prev => prev.map(rr => rr.id === r.id ? { ...rr, status: rr.status === 1 ? 0 : 1 } : rr))} className="p-1.5 rounded-lg text-foreground-tertiary hover:text-primary hover:bg-white/5 transition-colors">{r.status === 1 ? <IconClose size={16} /> : <IconCheck size={16} />}</button></td>
                </tr>
              ))}
              {rules.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-foreground-tertiary">暂无审核规则</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-foreground-secondary text-xs font-medium">{r.targetType}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
                    <span className="text-foreground-tertiary text-xs flex items-center gap-1"><IconWarning size={12} />{r.reason}</span>
                  </div>
                  {r.content && <div className="text-xs text-foreground-tertiary bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.03] line-clamp-2">{r.content}</div>}
                </div>
                {r.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setReviewModal({ open: true, record: r, action: 'approve' }); setReviewReason(''); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors"><IconCheck size={14} /> 通过</button>
                    <button onClick={() => { setReviewModal({ open: true, record: r, action: 'reject' }); setReviewReason(''); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><IconClose size={14} /> 拒绝</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {records.length === 0 && <div className="rounded-xl border border-white/5 bg-white/[0.02] px-5 py-16 text-center"><p className="text-foreground-tertiary text-sm">暂无审核记录</p></div>}
        </div>
      )}

      <AdminModal open={showRuleModal} onClose={() => setShowRuleModal(false)} title="创建审核规则">
        <div className="space-y-4">
          <div><label className="block text-xs text-foreground-tertiary mb-1.5">规则类型</label><select value={newRule.type} onChange={e => setNewRule(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50"><option value="">请选择</option><option value="keyword">关键词</option><option value="regex">正则表达式</option><option value="ai">AI检测</option></select></div>
          <div><label className="block text-xs text-foreground-tertiary mb-1.5">匹配模式</label><input value={newRule.pattern} onChange={e => setNewRule(p => ({ ...p, pattern: e.target.value }))} placeholder="输入关键词或正则表达式" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-muted-foreground focus:outline-none focus:border-primary/50" /></div>
          <div><label className="block text-xs text-foreground-tertiary mb-1.5">动作</label><select value={newRule.action} onChange={e => setNewRule(p => ({ ...p, action: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50"><option value="warn">警告</option><option value="block">拦截</option><option value="review">人工审核</option></select></div>
          <div className="flex justify-end gap-3 pt-2"><button onClick={() => setShowRuleModal(false)} className="px-4 py-2 rounded-lg text-sm text-foreground-tertiary hover:text-white hover:bg-white/5 transition-colors">取消</button><button onClick={handleCreateRule} disabled={!newRule.type || !newRule.pattern} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 hover:shadow-lg hover:shadow-primary/20 transition-all">创建</button></div>
        </div>
      </AdminModal>

      <AdminModal open={reviewModal.open} onClose={() => { setReviewModal({ open: false, record: null, action: null }); setReviewReason(''); }} title={reviewModal.action === 'approve' ? '通过审核' : '拒绝内容'}>
        <div className="space-y-4">
          <div><label className="block text-xs text-foreground-tertiary mb-1.5">{reviewModal.action === 'approve' ? '通过说明（可选）' : '拒绝理由（可选）'}</label><textarea value={reviewReason} onChange={e => setReviewReason(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-muted-foreground focus:outline-none focus:border-primary/50 resize-none" /></div>
          <div className="flex justify-end gap-3 pt-2"><button onClick={() => { setReviewModal({ open: false, record: null, action: null }); setReviewReason(''); }} className="px-4 py-2 rounded-lg text-sm text-foreground-tertiary hover:text-white hover:bg-white/5 transition-colors">取消</button><button onClick={handleReviewAction} className={cn('px-4 py-2 rounded-lg text-white text-sm font-medium transition-all', reviewModal.action === 'approve' ? 'bg-success hover:bg-success-light' : 'bg-destructive hover:bg-destructive-light')}>{reviewModal.action === 'approve' ? '确认通过' : '确认拒绝'}</button></div>
        </div>
      </AdminModal>
    </div>
  );
}
