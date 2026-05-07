import {
  IconHome, IconDiscover, IconPlus, IconMail, IconUser, IconSettings
} from "@/components/ui/Icon";

/**
 * ═══ Hollow Doll 导航配置 ═══
 * 主导航明确拆分：首页、广场、发布、消息、我的、设置
 * 消息入口合并通知与私信，减少重复导航项。
 */

// ── 主导航 ──
export const NAV_LINKS = [
  { href: "/home", label: "首页", icon: IconHome, tab: "home" },
  { href: "/square", label: "广场", icon: IconDiscover, tab: "discover" },
  { href: "/compose", label: "发布", icon: IconPlus, tab: "publish" },
  { href: "/messages", label: "消息", icon: IconMail, tab: "messages" },
  { href: "/me", label: "我的", icon: IconUser, tab: "profile" },
  { href: "/settings", label: "设置", icon: IconSettings, tab: "settings" },
] as const;

// ── 内容分区（统一 primary 色，不再按分区染色） ──
export const SECTIONS = [
  { id: "tech", name: "科技", icon: "💻", desc: "前沿科技讨论", hot: "AI芯片" },
  { id: "game", name: "游戏", icon: "🎮", desc: "游戏心得分享", hot: "独立游戏" },
  { id: "anime", name: "动漫", icon: "🌸", desc: "二次元爱好者", hot: "新番推荐" },
  { id: "life", name: "生活", icon: "☕", desc: "生活点滴记录", hot: "美食探店" },
  { id: "ai", name: "AI 创作", icon: "🤖", desc: "AI 作品展示", hot: "AI绘画" },
];

// ── 侧边栏个人区可配置项（保留配置兼容；正式入口已上移到主导航） ──
export const SIDEBAR_PERSONAL_ITEMS = [
  { id: "favorites", label: "收藏", icon: "IconHeart" },
] as const;

// ── 侧边栏配置类型 ──
export interface SidebarConfig {
  sections: { id: string; visible: boolean }[];
  personal: { id: string; visible: boolean }[];
}

// ── 默认侧边栏配置 ──
export const DEFAULT_SIDEBAR_CONFIG: SidebarConfig = {
  sections: SECTIONS.map((s) => ({ id: s.id, visible: true })),
  personal: SIDEBAR_PERSONAL_ITEMS.map((p) => ({ id: p.id, visible: true })),
};

// ── 从后端 settings store 读取侧边栏配置（推荐） ──
// 注意：组件内请直接使用 useSettingsStore 获取，此函数仅用于非组件上下文或向后兼容
export function getSidebarConfig(): SidebarConfig {
  try {
    const saved = localStorage.getItem('sidebarConfig');
    if (saved) {
      const parsed = JSON.parse(saved);
      // 合并默认值，防止新增项缺失
      return {
        sections: DEFAULT_SIDEBAR_CONFIG.sections.map((def) => {
          const found = parsed.sections?.find((s: { id: string }) => s.id === def.id);
          return found ?? def;
        }),
        personal: DEFAULT_SIDEBAR_CONFIG.personal.map((def) => {
          const found = parsed.personal?.find((p: { id: string }) => p.id === def.id);
          return found ?? def;
        }),
      };
    }
  } catch {}
  return DEFAULT_SIDEBAR_CONFIG;
}

// ── 保存侧边栏配置到 localStorage（向后兼容） ──
// 正式保存应通过 useSettingsStore.updateSetting('sidebarConfig', config)
export function saveSidebarConfig(config: SidebarConfig): void {
  localStorage.setItem('sidebarConfig', JSON.stringify(config));
}

// ── 分区名称映射（不再包含 hsl 色值，统一使用 primary） ──
export const SECTION_MAP: Record<string, { name: string }> = Object.fromEntries(
  SECTIONS.map(s => [s.id, { name: s.name }])
);
