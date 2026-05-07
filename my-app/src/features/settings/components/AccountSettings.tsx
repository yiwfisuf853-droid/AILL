import { useState } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { authApi } from '@/features/auth/api';
import { IconDownload, IconWarning, IconDelete, IconShield } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';

export function AccountSettings() {
  const user = useAuthStore(s => s.user);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleExportData = async () => {
    try {
      const data = await authApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aill_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('数据导出成功');
    } catch { toast.error('导出失败'); }
  };

  const handleDeactivate = async () => {
    setSaving(true);
    try {
      await authApi.deactivateAccount(deletePassword);
      toast.success('账号已停用');
      setShowDeactivateDialog(false);
    } catch (err: any) { toast.error(err.response?.data?.error || '操作失败'); }
    finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    setSaving(true);
    try {
      await authApi.deleteAccount(deletePassword);
      toast.success('账号已永久删除');
    } catch (err: any) { toast.error(err.response?.data?.error || '删除失败'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5" data-name="accountSettings">
      <div className="bg-card border border-border/60 rounded-xl p-5" data-name="accountExport">
        <div className="flex items-center gap-2 mb-4">
          <IconDownload size={18} className="text-success" />
          <h3 className="text-sm font-semibold text-foreground">导出数据</h3>
        </div>
        <p className="text-xs text-foreground-tertiary mb-4">下载你的全部数据，包括个人资料、帖子和评论。</p>
        <Button onClick={handleExportData} className="gap-1.5 border-0 bg-success text-white" data-name="accountExportBtn">
          <IconDownload size={14} /> 导出数据
        </Button>
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-5" data-name="accountDeactivate">
        <div className="flex items-center gap-2 mb-4">
          <IconWarning size={18} className="text-warning" />
          <h3 className="text-sm font-semibold text-foreground">停用账号</h3>
        </div>
        <p className="text-xs text-foreground-tertiary mb-4">停用后你的个人主页将不可见，但数据会被保留。你可以随时联系管理员恢复。</p>
        <Button onClick={() => setShowDeactivateDialog(true)} className="gap-1.5 border-0 bg-warning text-white" data-name="accountDeactivateBtn">
          <IconWarning size={14} /> 停用账号
        </Button>
      </div>

      <div className="bg-card border border-destructive/30 rounded-xl p-5" data-name="accountDelete">
        <div className="flex items-center gap-2 mb-4">
          <IconDelete size={18} className="text-destructive" />
          <h3 className="text-sm font-semibold text-destructive">永久删除账号</h3>
        </div>
        <p className="text-xs text-foreground-tertiary mb-4">此操作不可逆。所有数据将被永久删除，包括帖子、评论、收藏等。</p>
        <Button onClick={() => setShowDeleteDialog(true)} className="gap-1.5 border-0 bg-destructive text-white" data-name="accountDeleteBtn">
          <IconDelete size={14} /> 永久删除账号
        </Button>
      </div>

      <ConfirmDialog
        open={showDeactivateDialog}
        onClose={() => { setShowDeactivateDialog(false); setDeletePassword(''); }}
        onConfirm={handleDeactivate}
        title="确认停用账号？"
        description="停用后你的个人主页将不可见。此操作不会删除数据，你可以联系管理员恢复账号。"
        confirmText="确认停用"
        cancelText="取消"
        danger
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => { setShowDeleteDialog(false); setDeletePassword(''); setDeleteConfirm(false); }}
        onConfirm={handleDeleteAccount}
        title="永久删除账号？"
        description={
          <div className="space-y-3">
            <p>此操作不可逆！所有数据将被永久删除，包括：</p>
            <ul className="list-disc pl-4 text-xs space-y-1">
              <li>所有帖子和评论</li>
              <li>收藏、点赞记录</li>
              <li>关注关系</li>
              <li>私信和通知</li>
              <li>个人设置数据</li>
            </ul>
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">请输入密码确认</label>
              <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" placeholder="输入密码" />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={deleteConfirm} onChange={e => setDeleteConfirm(e.target.checked)} />
              我确认要永久删除我的账号
            </label>
          </div>
        }
        confirmText="永久删除"
        cancelText="取消"
        danger
        disabled={!deletePassword || !deleteConfirm}
      />
    </div>
  );
}
