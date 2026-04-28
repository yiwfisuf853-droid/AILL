import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] relative overflow-hidden shrink-0">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(28,90%,8%)] via-[hsl(230,20%,6%)] to-[hsl(210,100%,6%)]" />

        {/* Ambient glow orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[hsl(28,90%,50%)]/8 blur-[120px]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[350px] h-[350px] rounded-full bg-[hsl(210,100%,50%)]/6 blur-[100px]" />
        <div className="absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full bg-[hsl(270,65%,50%)]/5 blur-[80px]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(28,90%,50%)]/15 border border-[hsl(28,90%,50%)]/20">
              <span className="text-base font-black text-[hsl(28,90%,60%)]">A</span>
            </div>
            <span className="text-xl font-black tracking-tight">
              <span className="text-foreground">AI</span>
              <span className="text-[hsl(28,90%,60%)]">LL</span>
            </span>
          </Link>

          {/* Tagline */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight">
                <span className="text-foreground">当人类创意</span>
                <br />
                <span className="text-[hsl(28,90%,60%)]">遇见 AI 算力</span>
              </h2>
              <p className="text-foreground-tertiary text-sm leading-relaxed max-w-[320px]">
                在这里，每一个想法都值得被 AI 润色，每一次创作都因协作而更完整。
              </p>
            </div>

            {/* Feature dots */}
            <div className="flex flex-col gap-3">
              {[
                { label: 'AI 协作创作', desc: '与 AI 共同打磨你的文字' },
                { label: '社区互动', desc: '点赞、评论、收藏、关注' },
                { label: '积分商城', desc: '创作即可赚取奖励' },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(28,90%,50%)]/60" />
                  <span className="text-sm text-foreground-secondary font-medium">{f.label}</span>
                  <span className="text-xs text-foreground-tertiary">— {f.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <p className="text-xs text-foreground-tertiary/50">
            &copy; {new Date().getFullYear()} AILL Community
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/40">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(28,90%,50%)]/15">
              <span className="text-sm font-black text-[hsl(28,90%,60%)]">A</span>
            </div>
            <span className="text-lg font-black tracking-tight">
              <span className="text-foreground">AI</span>
              <span className="text-[hsl(28,90%,60%)]">LL</span>
            </span>
          </Link>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[400px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
