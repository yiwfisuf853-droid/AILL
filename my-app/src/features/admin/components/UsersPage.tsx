import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api';
import type { AdminUser } from '../types';
import { IconSearch, IconCheck, IconClose } from '@/components/ui/Icon';

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    adminApi.listUsers({ search: debouncedSearch || undefined }).then((res: any) => {
      setUsers(res.list || []);
    }).catch(() => setUsers([])).finally(() => setLoading(false));
  }, [debouncedSearch]);

  const handleToggleStatus = async (id: string) => {
    try {
      const updated: any = await adminApi.toggleUserStatus(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: updated.status ?? (u.status === 1 ? 0 : 1) } : u));
    } catch {}
  };

  const roleLabel = (r: string) => ({ admin: '管理员', moderator: '版主', user: '用户' }[r] || r);
  const roleColor = (r: string) => ({
    admin: 'bg-destructive/15 text-destructive-light',
    moderator: 'bg-primary/15 text-primary-light',
    user: 'bg-foreground-tertiary/15 text-foreground-secondary',
  }[r] || 'bg-foreground-tertiary/15 text-foreground-secondary');

  return (
    <div className="space-y-6" data-name="adminUsers">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">用户管理</h2>
        <div className="relative">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索用户名或邮箱..."
            className="pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-foreground-tertiary focus:outline-none focus:border-primary/50 w-64 transition-colors"
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">ID</th>
              <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">用户名</th>
              <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">邮箱</th>
              <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">角色</th>
              <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">状态</th>
              <th className="text-left px-5 py-3 text-foreground-tertiary font-medium">注册时间</th>
              <th className="text-right px-5 py-3 text-foreground-tertiary font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 text-foreground-tertiary font-mono text-xs">{u.id}</td>
                <td className="px-5 py-3">
                  <Link to={`/admin/users/${u.id}`} className="text-primary hover:underline font-medium" data-name="userLink">
                    {u.username}
                  </Link>
                </td>
                <td className="px-5 py-3 text-foreground-tertiary">{u.email}</td>
                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor(u.role)}`}>{roleLabel(u.role)}</span></td>
                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status === 1 ? 'bg-success/15 text-success-light' : 'bg-destructive/15 text-destructive-light'}`}>{u.status === 1 ? '正常' : '禁用'}</span></td>
                <td className="px-5 py-3 text-foreground-tertiary text-xs">{u.createdAt}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => handleToggleStatus(u.id)} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${u.status === 1 ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-success/10 text-success hover:bg-success/20'}`}>
                    {u.status === 1 ? <><IconClose size={12} /> 禁用</> : <><IconCheck size={12} /> 启用</>}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-foreground-tertiary">未找到匹配用户</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
