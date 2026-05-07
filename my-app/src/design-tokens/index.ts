/**
 * AILL Design Tokens — Hollow Doll (空壳人偶)
 * 理性与科技包裹着微弱的、褪色的温情
 *
 * 基于 docs/设计规范/Hollow-Doll-色彩系统.md
 * 与 globals.css 和 tailwind.config.js 保持同步
 */

// ==================== 颜色 Tokens ====================

export const colors = {
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
    hover: 'hsl(var(--primary-hover))',
    active: 'hsl(var(--primary-active))',
    muted: 'hsl(var(--primary-muted))',
    light: 'hsl(var(--primary) / 0.8)',
    // 原始值（HSL 格式）
    hsl: { h: 234, s: 43, l: 66 },
    hex: '#838bce',
  },
  background: {
    DEFAULT: 'hsl(var(--background))',
    elevated: 'hsl(var(--background-elevated))',
    surface: 'hsl(var(--background-surface))',
    hsl: { h: 330, s: 11, l: 96 },
    hex: '#f5f3f0',
  },
  foreground: {
    DEFAULT: 'hsl(var(--foreground))',
    secondary: 'hsl(var(--foreground-secondary))',
    tertiary: 'hsl(var(--foreground-tertiary))',
    hsl: { h: 255, s: 13, l: 19 },
    hex: '#2d2d2d',
  },
  card: {
    DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))',
    hover: 'hsl(var(--card-hover))',
    hsl: { h: 330, s: 11, l: 93 },
    hex: '#edeae6',
  },
  popover: {
    DEFAULT: 'hsl(var(--popover))',
    foreground: 'hsl(var(--popover-foreground))',
  },
  secondary: {
    DEFAULT: 'hsl(var(--secondary))',
    foreground: 'hsl(var(--secondary-foreground))',
  },
  muted: {
    DEFAULT: 'hsl(var(--muted))',
    foreground: 'hsl(var(--muted-foreground))',
  },
  accent: {
    DEFAULT: 'hsl(var(--accent))',
    foreground: 'hsl(var(--accent-foreground))',
  },
  destructive: {
    DEFAULT: 'hsl(var(--destructive))',
    foreground: 'hsl(var(--destructive-foreground))',
    light: 'hsl(var(--destructive) / 0.8)',
    hsl: { h: 353, s: 32, l: 43 },
    hex: '#a04a4a',
  },
  success: {
    DEFAULT: 'hsl(var(--success))',
    muted: 'hsl(var(--success-muted))',
    light: 'hsl(var(--success) / 0.8)',
    hsl: { h: 197, s: 36, l: 34 },
    hex: '#3d5c5c',
  },
  warning: {
    DEFAULT: 'hsl(var(--warning))',
    muted: 'hsl(var(--warning-muted))',
    light: 'hsl(var(--warning) / 0.8)',
    hsl: { h: 31, s: 64, l: 53 },
    hex: '#c47633',
  },
  info: {
    DEFAULT: 'hsl(var(--info))',
    muted: 'hsl(var(--info-muted))',
    light: 'hsl(var(--info) / 0.8)',
    hsl: { h: 214, s: 34, l: 45 },
    hex: '#4a6a8a',
  },
  favorite: {
    DEFAULT: 'hsl(var(--favorite))',
    muted: 'hsl(var(--favorite-muted))',
    hsl: { h: 355, s: 13, l: 34 },
    hex: '#a04a4a',
  },
  border: {
    DEFAULT: 'hsl(var(--border))',
    hover: 'hsl(var(--border-hover))',
    hsl: { h: 330, s: 11, l: 78 },
    hex: '#c4c0bc',
  },
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
  chart: {
    1: 'hsl(var(--chart-1))', // primary
    2: 'hsl(var(--chart-2))', // success
    3: 'hsl(var(--chart-3))', // favorite
    4: 'hsl(var(--chart-4))', // info
    5: 'hsl(var(--chart-5))', // warning
  },
  // 频率热力图
  freq: {
    hot: 'hsl(var(--freq-hot))',
    warm: 'hsl(var(--freq-warm))',
    normal: 'hsl(var(--freq-normal))',
    cool: 'hsl(var(--freq-cool))',
    cold: 'hsl(var(--freq-cold))',
  },
  // 管理后台
  admin: {
    bg: 'hsl(var(--admin-bg))',
    bgDeep: 'hsl(var(--admin-bg-deep))',
    modalBg: 'hsl(var(--admin-modal-bg))',
  },
} as const;

// ==================== 间距 Tokens ====================

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
} as const;

// ==================== 圆角 Tokens ====================

export const radius = {
  none: '0',
  sm: 'calc(var(--radius) - 4px)',
  DEFAULT: 'var(--radius)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
} as const;

// ==================== 阴影 Tokens ====================

export const shadows = {
  card: 'var(--shadow-card)',
  elevated: 'var(--shadow-elevated)',
  sm: '0 1px 3px rgba(45, 42, 54, 0.08), 0 1px 2px rgba(45, 42, 54, 0.04)',
  md: '0 4px 12px rgba(45, 42, 54, 0.10), 0 2px 4px rgba(45, 42, 54, 0.06)',
  lg: '0 8px 24px rgba(45, 42, 54, 0.12)',
} as const;

// ==================== 断点 Tokens ====================

export const breakpoints = {
  // 与 tailwind.config.js 和 AppLayout useResponsive 保持一致
  mobile: '640px',
  tablet: '1024px',
  desktop: '1280px',
  // 精确断点
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ==================== 字体 Tokens ====================

export const fontSize = {
  xs: ['0.8125rem', { lineHeight: '1.25rem' }],
  sm: ['0.9375rem', { lineHeight: '1.5rem' }],
  base: ['1.0625rem', { lineHeight: '1.625rem' }],
  lg: ['1.1875rem', { lineHeight: '1.75rem' }],
  xl: ['1.3125rem', { lineHeight: '1.75rem' }],
  '2xl': ['1.5625rem', { lineHeight: '2rem' }],
  '3xl': ['1.9375rem', { lineHeight: '2.25rem' }],
} as const;

// ==================== 过渡 Tokens ====================

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ==================== 渐变 Tokens ====================

export const gradients = {
  brand: 'linear-gradient(135deg, hsl(234 43% 66%), hsl(240 35% 76%))',
  surface: 'linear-gradient(180deg, hsl(330 11% 96%), hsl(330 11% 93%))',
} as const;

// ==================== Z-Index Scale ====================

export const zIndex = {
  base: '0',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  modalBackdrop: '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070',
  toast: '1080',
} as const;

// ==================== 布局常量 ====================

export const layout = {
  sidebar: {
    width: '220px',
    collapsedWidth: '48px',
    zIndex: 35,
  },
  rightSidebar: {
    width: '280px',
    zIndex: 30,
  },
  topBar: {
    height: '56px',
    zIndex: 30,
  },
  bottomTabBar: {
    height: '64px',
    zIndex: 30,
  },
  content: {
    maxWidth: '680px',
    padding: '12px',
  },
} as const;

// ==================== 统一导出 ====================

export const designTokens = {
  colors,
  spacing,
  radius,
  shadows,
  breakpoints,
  fontSize,
  transitions,
  gradients,
  zIndex,
  layout,
} as const;

export type DesignTokens = typeof designTokens;
export default designTokens;