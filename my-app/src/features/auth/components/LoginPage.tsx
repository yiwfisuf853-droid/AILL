import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/store";
import { IconLogin, IconEye, IconEyeOff } from "@/components/ui/icon";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData);
      navigate(from, { replace: true });
    } catch { /* store handles error */ }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) {
      clearError();
    }
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="space-y-8" data-name="loginPage">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground" data-name="loginPage.title">欢迎回来</h1>
        <p className="text-base text-foreground-secondary" data-name="loginPage.desc">登录你的 AILL 账号，继续你的创作之旅</p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive" data-name="loginPage.error">
          <div className="w-1 h-1 rounded-full bg-destructive shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5" data-name="loginPage.form">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground-secondary" data-name="loginPage.usernameLabel">用户名</label>
          <Input
            name="username"
            data-name="loginPage.usernameInput"
            type="text"
            placeholder="输入你的用户名"
            value={formData.username}
            onChange={handleChange}
            required
            className="h-11 bg-background-elevated border-border/60 focus:border-[hsl(28,90%,50%)]/40 focus:ring-[hsl(28,90%,50%)]/15 text-sm placeholder:text-foreground-tertiary/80"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground-secondary" data-name="loginPage.passwordLabel">密码</label>
          <div className="relative">
            <Input
              name="password"
              data-name="loginPage.passwordInput"
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
              data-name="loginPage.passwordToggle"
            >
              {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isLoading}
          data-name="loginPage.submitBtn"
          className="w-full h-11 text-sm font-semibold rounded-lg bg-gradient-to-r from-[hsl(28,90%,50%)] to-[hsl(20,90%,55%)] hover:from-[hsl(28,90%,45%)] hover:to-[hsl(20,90%,50%)] text-white shadow-lg shadow-[hsl(28,90%,50%)]/20 transition-all duration-200 disabled:opacity-60"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              登录中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <IconLogin size={16} />
              登录
            </span>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative" data-name="loginPage.divider">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/40" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-foreground-tertiary">或</span>
        </div>
      </div>

      {/* Register link */}
      <p className="text-center text-sm text-foreground-tertiary">
        还没有账号？{" "}
        <Link
          to="/auth/register"
          data-name="loginPage.registerLink"
          className="font-semibold text-[hsl(28,90%,55%)] hover:text-[hsl(28,90%,60%)] transition-colors"
        >
          创建新账号
        </Link>
      </p>
    </div>
  );
}
