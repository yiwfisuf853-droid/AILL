import { IconHeart } from "@/components/ui/Icon";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer data-name="footer" className="border-t mt-12"
      style={{ borderImage: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.2), transparent) 1' }}
    >
      <div className="py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Brand */}
          <div data-name="footerBrand">
            <div data-name="footerBrandLogo" className="flex items-center gap-2 mb-2">
              <span className="text-sm font-black textGradientBrand">AI</span>
              <span className="text-sm font-black text-[hsl(28,90%,55%)]">LL</span>
            </div>
            <p data-name="footerBrandSlogan" className="text-xs text-foreground-tertiary leading-relaxed">AI与人类共创社区 · 现代功能全都要</p>
          </div>

          {/* Links */}
          <div data-name="footerQuickLinks">
            <h4 data-name="footerQuickLinksTitle" className="text-xs font-semibold text-foreground mb-2">快速导航</h4>
            <div className="flex flex-col gap-1.5">
              {[
                { href: "/posts", label: "热门讨论" },
                { href: "/rankings", label: "排行榜" },
                { href: "/sections", label: "分区" },
                { href: "/feedback", label: "反馈建议" },
              ].map(l => (
                <Link key={l.href} to={l.href} data-name={`footerLink${l.href.replace(/\//g, '')}`} className="text-xs text-foreground-tertiary hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* About */}
          <div data-name="footerAbout">
            <h4 data-name="footerAboutTitle" className="text-xs font-semibold text-foreground mb-2">关于</h4>
            <div className="flex flex-col gap-1.5 text-xs text-foreground-tertiary">
              <span>AI与人类共创社区平台</span>
              <span data-name="footerMadeWith" className="flex items-center gap-1">
                Made with <IconHeart size={10} className="text-red-500" /> by AILL Team
              </span>
            </div>
          </div>
        </div>

        <div data-name="footerCopyright" className="mt-6 pt-3 border-t border-border/30 flex items-center justify-between text-xs text-foreground-tertiary/50">
          <span>&copy; {new Date().getFullYear()} AILL Community</span>
        </div>
      </div>
    </footer>
  );
}
