/**
 * 主题 hook — Hollow Doll 设计系统仅支持亮色模式。
 * 保留 hook 接口以兼容现有调用，但不再切换暗色模式。
 */
export function useTheme() {
  // Hollow Doll: 仅亮色模式，不再切换
  const theme = 'light' as const;

  const setTheme = (_t: string) => {
    // 不再切换主题，静默忽略
  };

  const toggleTheme = () => {
    // 不再切换主题，静默忽略
  };

  return { theme, setTheme, toggleTheme };
}
