import { useState, useEffect, useCallback } from 'react';
import { IconClose, IconSearch, IconPlus, IconDelete, IconBrain } from '@/components/ui/Icon';
import { useAuthStore } from '@/features/auth/store';
import { aiApi } from '@/features/ai/api';
import { cn } from '@/lib/utils';

interface MemoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MemoryDrawer({ open, onClose }: MemoryDrawerProps) {
  const { user } = useAuthStore();
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('general');

  const loadMemories = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res: any = await aiApi.getMemories(user.id, search ? { keyword: search } : {});
      const memList = res.list || res || [];
      setMemories(Array.isArray(memList) ? memList : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id, search]);

  useEffect(() => {
    if (open) loadMemories();
  }, [open, loadMemories]);

  const handleAdd = async () => {
    if (!user?.id || !newContent.trim()) return;
    try {
      await aiApi.storeMemory(user.id, { content: newContent.trim(), memoryType: newType });
      setNewContent('');
      setShowAdd(false);
      loadMemories();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (memoryId: string) => {
    if (!user?.id) return;
    try {
      await aiApi.deleteAiMemory(user.id, memoryId);
      setMemories(prev => prev.filter(m => m.id !== memoryId));
    } catch {
      // ignore
    }
  };

  if (!open) return null;

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        data-name="memoryDrawerOverlay"
      />

      {/* 抽屉 */}
      <div
        className="fixed right-0 top-0 h-full w-80 bg-background border-l border-border z-50 flex flex-col shadow-xl"
        data-name="memoryDrawer"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <IconBrain size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground" data-name="memoryDrawerTitle">AI 记忆</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            data-name="memoryDrawerCloseBtn"
          >
            <IconClose size={16} className="text-foreground-tertiary" />
          </button>
        </div>

        {/* 搜索 */}
        <div className="px-4 py-2 border-b border-border/30">
          <div className="relative">
            <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
            <input
              type="text"
              placeholder="搜索记忆..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadMemories()}
              className="w-full h-8 pl-8 pr-3 text-xs bg-background-elevated border border-border/60 rounded-md focus:outline-none focus:border-primary/40"
              data-name="memoryDrawerSearchInput"
            />
          </div>
        </div>

        {/* 添加按钮 */}
        <div className="px-4 py-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
            data-name="memoryDrawerAddBtn"
          >
            <IconPlus size={14} />
            添加记忆
          </button>
        </div>

        {/* 添加表单 */}
        {showAdd && (
          <div className="px-4 pb-3 space-y-2 border-b border-border/30" data-name="memoryDrawerAddForm">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="输入要记住的内容..."
              className="w-full h-20 p-2 text-xs bg-background-elevated border border-border/60 rounded-md resize-none focus:outline-none focus:border-primary/40"
              data-name="memoryDrawerAddInput"
            />
            <div className="flex items-center gap-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="h-7 px-2 text-xs bg-background-elevated border border-border/60 rounded-md"
                data-name="memoryDrawerAddTypeSelect"
              >
                <option value="general">通用</option>
                <option value="preference">偏好</option>
                <option value="fact">事实</option>
                <option value="instruction">指令</option>
              </select>
              <button
                onClick={handleAdd}
                disabled={!newContent.trim()}
                className="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                data-name="memoryDrawerAddSubmitBtn"
              >
                存储
              </button>
            </div>
          </div>
        )}

        {/* 记忆列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2" data-name="memoryDrawerList">
          {loading ? (
            <p className="text-xs text-foreground-tertiary text-center py-8">加载中...</p>
          ) : memories.length === 0 ? (
            <p className="text-xs text-foreground-tertiary text-center py-8">
              {search ? '未找到匹配的记忆' : '暂无记忆，点击上方添加'}
            </p>
          ) : (
            memories.map((memory) => (
              <div
                key={memory.id}
                className="group p-2.5 rounded-lg bg-background-elevated border border-border/40 hover:border-border transition-colors"
                data-name={`memoryDrawerItem${memory.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-foreground leading-relaxed flex-1" data-name={`memoryDrawerItem${memory.id}Content`}>
                    {memory.content}
                  </p>
                  <button
                    onClick={() => handleDelete(memory.id)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all shrink-0"
                    data-name={`memoryDrawerItem${memory.id}DeleteBtn`}
                  >
                    <IconDelete size={12} className="text-destructive" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  {memory.memoryType && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary" data-name={`memoryDrawerItem${memory.id}Type`}>
                      {memory.memoryType}
                    </span>
                  )}
                  <span className="text-[9px] text-foreground-tertiary" data-name={`memoryDrawerItem${memory.id}Date`}>
                    {new Date(memory.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
