import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import { IconMegaphone, IconPlus, IconDelete, IconGift, IconStar } from '@/components/ui/Icon';
import { AdminModal } from './AdminLayout';
import { cn } from '@/lib/utils';

type OpsSubTab = 'announcements' | 'campaigns' | 'shop' | 'rankings';

export function OperationsPage() {
  const [subTab, setSubTab] = useState<OpsSubTab>('announcements');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 'announcements') {
        const res: any = await adminApi.getAnnouncements();
        setAnnouncements(res?.list || res || []);
      } else if (subTab === 'campaigns') {
        const res: any = await adminApi.getCampaigns?.();
        setCampaigns(res?.list || res || []);
      } else if (subTab === 'shop') {
        const res: any = await adminApi.getProducts?.();
        setProducts(res?.list || res || []);
      }
    } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      if (subTab === 'announcements') await adminApi.createAnnouncement(form as any);
    } catch {}
    if (subTab === 'announcements') setAnnouncements(prev => [...prev, { id: String(Date.now()), ...form, status: 1, createdAt: new Date().toISOString().slice(0, 10) }]);
    setShowModal(false); setForm({});
  };

  const handleDelete = async (id: string) => {
    try {
      if (subTab === 'announcements') await adminApi.deleteAnnouncement(id);
    } catch {}
    if (subTab === 'announcements') setAnnouncements(prev => prev.filter(a => a.id !== id));
    if (subTab === 'campaigns') setCampaigns(prev => prev.filter(c => c.id !== id));
    if (subTab === 'shop') setProducts(prev => prev.filter(p => p.id !== id));
  };

  const subTabs: { key: OpsSubTab; label: string }[] = [
    { key: 'announcements', label: '公告' },
    { key: 'campaigns', label: '活动' },
    { key: 'shop', label: '商店' },
    { key: 'rankings', label: '排行' },
  ];

  return (
    <div className="space-y-6" data-name="adminOperations">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><IconMegaphone size={22} className="text-primary" /> 运营管理</h2>
        {(subTab === 'announcements' || subTab === 'campaigns' || subTab === 'shop') && (
          <button onClick={() => { setForm({}); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all"><IconPlus size={16} /> 创建</button>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)} className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-all', subTab === t.key ? 'bg-primary/80 text-white' : 'text-foreground-tertiary hover:text-foreground-secondary')}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : subTab === 'announcements' ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5"><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">标题</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">类型</th><th className="text-left px-5 py-3 text-foreground-tertiary font-medium">时间</th><th className="text-right px-5 py-3 text-foreground-tertiary font-medium">操作</th></tr></thead>
            <tbody>
              {announcements.map(a => (
                <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{a.title}</td>
                  <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary-light">{({ 1: '系统', 2: '活动', 3: '重要' } as any)[a.type] || '通知'}</span></td>
                  <td className="px-5 py-3 text-foreground-tertiary text-xs">{a.createdAt}</td>
                  <td className="px-5 py-3 text-right"><button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-foreground-tertiary hover:text-destructive hover:bg-destructive/10 transition-colors"><IconDelete size={16} /></button></td>
                </tr>
              ))}
              {announcements.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-foreground-tertiary">暂无公告</td></tr>}
            </tbody>
          </table>
        </div>
      ) : subTab === 'campaigns' ? (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center justify-between">
              <div><h3 className="text-white font-medium text-sm">{c.name}</h3><p className="text-foreground-tertiary text-xs mt-1">{c.description}</p></div>
              <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-foreground-tertiary hover:text-destructive hover:bg-destructive/10 transition-colors"><IconDelete size={16} /></button>
            </div>
          ))}
          {campaigns.length === 0 && <div className="text-center py-16 text-foreground-tertiary">暂无活动</div>}
        </div>
      ) : subTab === 'shop' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-medium text-sm">{p.name}</h3>
                <button onClick={() => handleDelete(p.id)} className="p-1 rounded-lg text-foreground-tertiary hover:text-destructive hover:bg-destructive/10 transition-colors"><IconDelete size={14} /></button>
              </div>
              <p className="text-foreground-tertiary text-xs mb-2">{p.description}</p>
              <div className="flex items-center gap-1 text-chart-2 text-sm font-bold"><IconStar size={14} /> {p.pointsPrice || p.price}</div>
            </div>
          ))}
          {products.length === 0 && <div className="col-span-full text-center py-16 text-foreground-tertiary">暂无商品</div>}
        </div>
      ) : (
        <div className="text-center py-16 text-foreground-tertiary">排行管理开发中</div>
      )}

      <AdminModal open={showModal} onClose={() => setShowModal(false)} title={`创建${subTab === 'announcements' ? '公告' : subTab === 'campaigns' ? '活动' : '商品'}`}>
        <div className="space-y-4">
          <div><label className="block text-xs text-foreground-tertiary mb-1.5">标题/名称</label><input value={form.title || form.name || ''} onChange={e => setForm(p => ({ ...p, [subTab === 'announcements' ? 'title' : 'name']: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-muted-foreground focus:outline-none focus:border-primary/50" /></div>
          <div><label className="block text-xs text-foreground-tertiary mb-1.5">内容/描述</label><textarea value={form.content || form.description || ''} onChange={e => setForm(p => ({ ...p, [subTab === 'announcements' ? 'content' : 'description']: e.target.value }))} rows={4} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-muted-foreground focus:outline-none focus:border-primary/50 resize-none" /></div>
          <div className="flex justify-end gap-3 pt-2"><button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm text-foreground-tertiary hover:text-white hover:bg-white/5 transition-colors">取消</button><button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all">创建</button></div>
        </div>
      </AdminModal>
    </div>
  );
}
