import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import type { SystemConfig } from '../types';
import { IconSettings, IconEdit, IconCheck, IconClose } from '@/components/ui/Icon';

export function ConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res: any = await adminApi.getSystemConfig();
      if (Array.isArray(res)) setConfigs(res);
      else if (res?.list) setConfigs(res.list);
      else if (typeof res === 'object') {
        setConfigs(Object.entries(res).filter(([k]) => k !== 'id' && typeof res[k] !== 'object').map(([key, value]) => ({ id: key, key, value: String(value), description: '', updatedAt: new Date().toISOString().slice(0, 10) })));
      }
    } catch { setConfigs([]); }
    setLoading(false);
  };

  const saveEdit = async (config: SystemConfig) => {
    try { await adminApi.setSystemConfig({ [config.key]: editValue }); } catch {}
    setConfigs(prev => prev.map(c => c.id === config.id ? { ...c, value: editValue, updatedAt: new Date().toISOString().slice(0, 10) } : c));
    setEditingId(null); setEditValue('');
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6" data-name="adminConfig">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><IconSettings size={22} className="text-primary" /> 系统配置</h2>
      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/5"><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">键</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">值</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">描述</th><th className="text-right px-5 py-3 text-foreground-tertiary font-medium">操作</th></tr></thead>
          <tbody>
            {configs.map(c => (
              <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 text-primary font-mono text-xs">{c.key}</td>
                <td className="px-5 py-3">
                  {editingId === c.id ? (
                    <input value={editValue} onChange={e => setEditValue(e.target.value)} className="px-2 py-1 rounded bg-white/5 border border-primary/50 text-sm text-white focus:outline-none w-40" autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit(c)} />
                  ) : <span className="text-white font-mono text-xs">{c.value}</span>}
                </td>
                <td className="px-5 py-3 text-foreground-tertiary">{c.description}</td>
                <td className="px-5 py-3 text-right">
                  {editingId === c.id ? (
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => saveEdit(c)} className="p-1.5 rounded-lg text-primary hover:bg-success/10 transition-colors"><IconCheck size={16} /></button>
                      <button onClick={() => { setEditingId(null); setEditValue(''); }} className="p-1.5 rounded-lg text-foreground-tertiary hover:text-destructive hover:bg-destructive/10 transition-colors"><IconClose size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingId(c.id); setEditValue(c.value); }} className="p-1.5 rounded-lg text-foreground-tertiary hover:text-primary hover:bg-white/5 transition-colors"><IconEdit size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
            {configs.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-foreground-tertiary">暂无配置项</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
