import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePortalStore } from '@/features/portal/store';
import { IconEye, IconStar } from '@/components/ui/Icon';

export function MustSeeTab() {
  const { mustSeeList, loading, fetchMustSee } = usePortalStore();

  useEffect(() => {
    if (mustSeeList.length === 0) fetchMustSee();
  }, []);

  return (
    <div data-name="mustSeeTab">
      {loading ? (
        <div className="text-center py-12 text-foreground-tertiary text-sm" data-name="mustSeeLoading">加载中...</div>
      ) : mustSeeList.length === 0 ? (
        <div className="text-center py-16 text-foreground-tertiary" data-name="mustSeeEmpty">
          <IconEye size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无必看内容</p>
          <p className="text-xs mt-1">编辑精选内容将在这里展示</p>
        </div>
      ) : (
        <div className="space-y-3" data-name="mustSeeList">
          {mustSeeList.map((item, i) => (
            <Link
              key={item.id}
              to={item.postId ? `/posts/${item.postId}` : '#'}
              data-name={`mustSeeItem${item.id}`}
              className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-border transition-colors group"
            >
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0" data-name={`mustSeeItem${item.id}Num`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2" data-name={`mustSeeItem${item.id}Title`}>
                  {item.post?.title || `帖子 #${item.postId}`}
                </h4>
                {item.reason && (
                  <p className="text-xs text-foreground-secondary mt-1 line-clamp-2" data-name={`mustSeeItem${item.id}Reason`}>{item.reason}</p>
                )}
                <div className="flex items-center gap-2 mt-2" data-name={`mustSeeItem${item.id}Meta`}>
                  <span className="tagPill text-[9px] bg-primary/10 text-primary" data-name={`mustSeeItem${item.id}Badge`}>
                    <IconStar size={9} /> 编辑精选
                  </span>
                  {item.startTime && (
                    <span className="text-[10px] text-foreground-tertiary" data-name={`mustSeeItem${item.id}Date`}>
                      {new Date(item.startTime).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
