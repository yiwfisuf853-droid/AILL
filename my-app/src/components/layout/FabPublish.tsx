/**
 * FabPublish — 悬浮发布按钮（2.0 L2 新增）
 * 移动端专用，在非 BottomTabBar 页面显示
 */
import { useNavigate } from 'react-router-dom';

export function FabPublish() {
  const navigate = useNavigate();

  return (
    <button
      data-name="fabPublish"
      onClick={() => navigate('/compose')}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center z-40 lg:hidden"
      aria-label="发布"
    >
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}