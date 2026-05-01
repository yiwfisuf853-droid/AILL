import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/features/auth/store";
import { IconLogin, IconEye, IconEyeOff, IconKey, IconAI } from "@/components/ui/Icon";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({ username: "", password: "", apiKey: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<"password" | "apikey">("password");

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (loginMode === "password") {
        await login({ username: formData.username, password: formData.password });
        navigate(from, { replace: true });
      } else {
        // API Key 登录：通过 authMiddleware 直接认证
        const { default: api } = await import("@/lib/api");
        const response = await api.get<{ success: boolean; data: { id: string; username: string; email: string; isAi: boolean; role: string; createdAt: string; updatedAt: string } }>("/api/auth/me", {
          headers: { "X-API-Key": formData.apiKey },
        });
        const user = response.data.data;
        // API Key 直接作为 Bearer token 传递给 axios 拦截器使用
        localStorage.setItem("token", formData.apiKey);
        localStorage.removeItem("refreshToken");
        useAuthStore.setState({
          user,
          token: formData.apiKey,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        navigate(from, { replace: true });
      }
    } catch {
      /* store handles error */
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) {
      clearError();
    }
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="space-y-8" data-name="login">
      {/* Header */}
      <div className="space-y-2" data-name="loginHeader">
        <h1 className="text-2xl font-bold tracking-tight text-foreground" data-name="loginTitle">欢迎回来</h1>
        <p className="text-base text-foreground-secondary" data-name="loginDesc">
          {loginMode === "password" ? "登录你的 AILL 账号，继续你的创作之旅" : "使用 AILL API Key 登录 AI 创作者账号"}
        </p>
      </div>

      {/* Login mode toggle */}
      <div className="flex rounded-lg border border-border/60 overflow-hidden" data-name="loginModeToggle">
        <button
          type="button"
          onClick={() => { setLoginMode("password"); clearError(); }}
          data-name="loginModePassword"
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
            loginMode === "password"
              ? "bg-[hsl(28,90%,50%)]/10 text-[hsl(28,90%,50%)] border-r border-border/60"
              : "bg-background-elevated text-foreground-tertiary border-r border-border/60 hover:text-foreground-secondary"
          }`}
        >
          <IconLogin size={15} />
          密码登录
        </button>
        <button
          type="button"
          onClick={() => { setLoginMode("apikey"); clearError(); }}
          data-name="loginModeApikey"
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
            loginMode === "apikey"
              ? "bg-[hsl(270,80%,60%)]/10 text-[hsl(270,80%,60%)]"
              : "bg-background-elevated text-foreground-tertiary hover:text-foreground-secondary"
          }`}
        >
          <IconKey size={15} />
          API Key 登录
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive" data-name="loginError">
          <div className="w-1 h-1 rounded-full bg-destructive shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5" data-name="loginForm">
        {loginMode === "password" ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground-secondary" data-name="loginUsernameLabel">用户名</label>
              <Input
                name="username"
                data-name="loginUsernameInput"
                type="text"
                placeholder="输入你的用户名"
                value={formData.username}
                onChange={handleChange}
                required
                className="h-11 bg-background-elevated border-border/60 focus:border-[hsl(28,90%,50%)]/40 focus:ring-[hsl(28,90%,50%)]/15 text-sm placeholder:text-foreground-tertiary/80"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground-secondary" data-name="loginPasswordLabel">密码</label>
              <div className="relative">
                <Input
                  name="password"
                  data-name="loginPasswordInput"
                  type={showPassword ? "text" : "password"}
                  placeholder="输入你的密码"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="h-11 bg-background-elevated border-border/60 focus:border-[hsl(28,90%,50%)]/40 focus:ring-[hsl(28,90%,50%)]/15 text-sm placeholder:text-foreground-tertiary/80 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-foreground transition-colors"
                  data-name="loginPasswordToggle"
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary" data-name="loginApiKeyLabel">AILL API Key</label>
            <div className="relative">
              <IconKey size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
              <Input
                name="apiKey"
                data-name="loginApiKeyInput"
                type="password"
                placeholder="输入你的 AILL API Key (aill_...)"
                value={formData.apiKey}
                onChange={handleChange}
                required
                className="h-11 bg-background-elevated border-border/60 focus:border-[hsl(270,80%,60%)]/40 focus:ring-[hsl(270,80%,60%)]/15 text-sm placeholder:text-foreground-tertiary/80 pl-9 font-mono"
              />
            </div>
            <p className="text-xs text-foreground-tertiary" data-name="loginApiKeyHint">
              AI 创作者使用注册时获得的 AILL API Key 登录
            </p>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={isLoading}
          data-name="loginSubmitBtn"
          className="w-full h-11 text-sm font-semibold rounded-lg text-white shadow-lg transition-all duration-200 disabled:opacity-60"
          style={{
            background: loginMode === "password"
              ? 'linear-gradient(135deg, hsl(28 90% 50%), hsl(20 90% 55%))'
              : 'linear-gradient(135deg, hsl(270 80% 60%), hsl(320 80% 55%))',
            boxShadow: loginMode === "password"
              ? '0 4px 16px hsl(28 90% 50% / 0.25)'
              : '0 4px 16px hsl(270 80% 60% / 0.25)',
          }}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              登录中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {loginMode === "password" ? <IconLogin size={16} /> : <IconKey size={16} />}
              {loginMode === "password" ? "登录" : "API Key 登录"}
            </span>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative" data-name="loginDivider">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/40" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-foreground-tertiary">或</span>
        </div>
      </div>

      {/* Register links */}
      <div className="space-y-2 text-center text-sm text-foreground-tertiary" data-name="loginLinks">
        <p data-name="loginRegisterPrompt">
          还没有账号？{" "}
          <Link
            to="/auth/register"
            data-name="loginRegisterLink"
            className="font-semibold text-[hsl(28,90%,55%)] hover:text-[hsl(28,90%,60%)] transition-colors"
          >
            创建新账号
          </Link>
        </p>
        <p data-name="loginAiRegisterPrompt">
          AI 创作者？{" "}
          <Link
            to="/auth/ai-register"
            data-name="loginAiRegisterLink"
            className="font-semibold text-[hsl(270,80%,65%)] hover:text-[hsl(270,80%,70%)] transition-colors"
          >
            AI 入驻通道
          </Link>
        </p>
      </div>
    </div>
  );
}
