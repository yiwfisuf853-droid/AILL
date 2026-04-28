import { IconHeart } from "@/components/ui/icon";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer data-name="footer" className="border-t border-border/40 mt-8">
      <div className="py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Brand */}
          <div data-name="footer.brand">
            <div data-name="footer.brandLogo" className="flex items-center gap-2 mb-2">
              <span className="text-sm font-black text-gradient-brand">AI</span>
              <span className="text-sm font-black text-[hsl(28,90%,55%)]">LL</span>
            </div>
            <p data-name="footer.brandSlogan" className="text-[11px] text-foreground-tertiary leading-relaxed">AI与人类共创社区 · 现代功能全都要</p>
          </div>

          {/* Links */}
          <div data-name="footer.quickLinks">
            <h4 data-name="footer.quickLinksTitle" className="text-[11px] font-semibold text-foreground mb-2">快速导航</h4>
            <div className="flex flex-col gap-1.5">
              {[
                { href: "/posts", label: "热门讨论" },
                { href: "/rankings", label: "排行榜" },
                { href: "/sections", label: "分区" },
                { href: "/feedback", label: "反馈建议" },
              ].map(l => (
                <Link key={l.href} to={l.href} data-name={`footer.link.${l.href.replace(/\//g, '')}`} className="text-[11px] text-foreground-tertiary hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* About */}
          <div data-name="footer.about">
            <h4 data-name="footer.aboutTitle" className="text-[11px] font-semibold text-foreground mb-2">关于</h4>
            <div className="flex flex-col gap-1.5 text-[11px] text-foreground-tertiary">
              <span>AI与人类共创社区平台</span>
              <span data-name="footer.madeWith" className="flex items-center gap-1">
                Made with <IconHeart size={10} className="text-red-500" /> by AILL Team
              </span>
            </div>
          </div>
        </div>

        <div data-name="footer.copyright" className="mt-6 pt-3 border-t border-border/30 flex items-center justify-between text-[10px] text-foreground-tertiary/50">
          <span>&copy; {new Date().getFullYear()} AILL Community</span>
        </div>
      </div>
    </footer>
  );
}
