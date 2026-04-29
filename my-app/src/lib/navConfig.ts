import {
  IconHome, IconDiscover, IconTrophy, IconBookOpen,
  IconShop, IconLive, IconCampaign, IconAI, IconBookmark
} from "@/components/ui/Icon";

export const NAV_LINKS = [
  { href: "/", label: "首页", icon: IconHome, module: "home" },
  { href: "/posts", label: "发现", icon: IconDiscover, module: "discover" },
  { href: "/rankings", label: "榜单", icon: IconTrophy, module: "rankings" },
  { href: "/sections", label: "分区", icon: IconBookOpen, module: "sections" },
  { href: "/shop", label: "商城", icon: IconShop, module: "shop" },
  { href: "/live", label: "直播", icon: IconLive, module: "live" },
  { href: "/campaigns", label: "活动", icon: IconCampaign, module: "campaigns" },
  { href: "/ai", label: "AI", icon: IconAI, module: "ai" },
  { href: "/subscriptions", label: "订阅", icon: IconBookmark, module: "subscriptions" },
] as const;

export const MODULE_HSL: Record<string, string> = {
  home: "210 100% 56%",
  discover: "160 70% 45%",
  rankings: "38 92% 56%",
  sections: "270 65% 60%",
  shop: "340 75% 58%",
  live: "0 80% 55%",
  campaigns: "28 90% 56%",
  ai: "262 83% 68%",
  subscriptions: "220 70% 55%",
};

export const SECTIONS = [
  { id: "tech", name: "科技", icon: "💻", color: "210 100% 56%", desc: "前沿科技讨论", hot: "AI芯片", bg: "from-blue-500/15 to-blue-500/5 border-blue-500/20" },
  { id: "game", name: "游戏", icon: "🎮", color: "270 65% 60%", desc: "游戏心得分享", hot: "独立游戏", bg: "from-purple-500/15 to-purple-500/5 border-purple-500/20" },
  { id: "anime", name: "动漫", icon: "🌸", color: "330 75% 58%", desc: "二次元爱好者", hot: "新番推荐", bg: "from-pink-500/15 to-pink-500/5 border-pink-500/20" },
  { id: "life", name: "生活", icon: "☕", color: "28 90% 56%", desc: "生活点滴记录", hot: "美食探店", bg: "from-amber-500/15 to-amber-500/5 border-amber-500/20" },
  { id: "ai", name: "AI 创作", icon: "🤖", color: "262 83% 68%", desc: "AI 作品展示", hot: "AI绘画", bg: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20" },
];

// 侧边栏个人区可配置项
export const SIDEBAR_PERSONAL_ITEMS = [
  { id: "notifications", label: "通知", icon: "IconNotification" },
  { id: "messages", label: "私信", icon: "IconMail" },
  { id: "favorites", label: "收藏", icon: "IconHeart" },
  { id: "profile", label: "我的", icon: "IconUser" },
  { id: "settings", label: "设置", icon: "IconSettings" },
] as const;

// 侧边栏配置类型
export interface SidebarConfig {
  sections: { id: string; visible: boolean }[];
  personal: { id: string; visible: boolean }[];
}

// 默认侧边栏配置
export const DEFAULT_SIDEBAR_CONFIG: SidebarConfig = {
  sections: SECTIONS.map((s) => ({ id: s.id, visible: true })),
  personal: SIDEBAR_PERSONAL_ITEMS.map((p) => ({ id: p.id, visible: true })),
};

// 从 localStorage 读取侧边栏配置
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

// 保存侧边栏配置到 localStorage
export function saveSidebarConfig(config: SidebarConfig): void {
  localStorage.setItem('sidebarConfig', JSON.stringify(config));
}

export const SECTION_MAP: Record<string, { name: string; hsl: string }> = Object.fromEntries(
  SECTIONS.map(s => [s.id, { name: s.name, hsl: s.color }])
);