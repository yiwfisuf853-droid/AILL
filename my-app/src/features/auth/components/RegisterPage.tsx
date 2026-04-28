import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/store";
import { IconUser, IconEye, IconEyeOff } from "@/components/ui/icon";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [validationError, setValidationError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (formData.password !== formData.confirmPassword) {
      setValidationError("两次输入的密码不一致");
      return;
    }
    if (formData.password.length < 6) {
      setValidationError("密码长度至少为 6 位");
      return;
    }

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      navigate("/");
    } catch { /* store handles error */ }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) {
      clearError();
    }
    setValidationError("");
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const errorMsg = error || validationError;

  return (
    <div className="space-y-8" data-name="registerPage">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground" data-name="registerPage.title">加入 AILL</h1>
        <p className="text-base text-foreground-secondary" data-name="registerPage.desc">创建你的账号，开始与 AI 协同创作</p>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive" data-name="registerPage.error">
          <div className="w-1 h-1 rounded-full bg-destructive shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" data-name="registerPage.form">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground-secondary" data-name="registerPage.usernameLabel">用户名</label>
          <Input
            name="username"
            data-name="registerPage.usernameInput"
            type="text"
            placeholder="给自己取个名字"
            value={formData.username}
            onChange={handleChange}
            required
            className="h-11 bg-background-elevated border-border/60 focus:border-[hsl(28,90%,50%)]/40 focus:ring-[hsl(28,90%,50%)]/15 text-sm placeholder:text-foreground-tertiary/80"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground-secondary" data-name="registerPage.emailLabel">邮箱</label>
          <Input
            name="email"
            data-name="registerPage.emailInput"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleChange}
            required
            className="h-11 bg-background-elevated border-border/60 focus:border-[hsl(28,90%,50%)]/40 focus:ring-[hsl(28,90%,50%)]/15 text-sm placeholder:text-foreground-tertiary/80"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground-secondary" data-name="registerPage.passwordLabel">密码</label>
          <div className="relative">
            <Input
              name="password"
              data-name="registerPage.passwordInput"
              type={showPassword ? "text" : "password"}
              placeholder="至少 6 位字符"
              value={formData.password}
              onChange={handleChange}
              required
              className="h-11 bg-background-elevated border-border/60 focus:border-[hsl(28,90%,50%)]/40 focus:ring-[hsl(28,90%,50%)]/15 text-sm placeholder:text-foreground-tertiary/80 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-foreground transition-colors"
              data-name="registerPage.passwordToggle"
            >
              {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground-secondary" data-name="registerPage.confirmPasswordLabel">确认密码</label>
          <Input
            name="confirmPassword"
            data-name="registerPage.confirmPasswordInput"
            type="password"
            placeholder="再次输入密码"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="h-11 bg-background-elevated border-border/60 focus:border-[hsl(28,90%,50%)]/40 focus:ring-[hsl(28,90%,50%)]/15 text-sm placeholder:text-foreground-tertiary/80"
          />
        </div>

        {/* Submit */}
        <div className="pt-1">
          <Button
            type="submit"
            disabled={isLoading}
            data-name="registerPage.submitBtn"
            className="w-full h-11 text-sm font-semibold rounded-lg bg-gradient-to-r from-[hsl(28,90%,50%)] to-[hsl(20,90%,55%)] hover:from-[hsl(28,90%,45%)] hover:to-[hsl(20,90%,50%)] text-white shadow-lg shadow-[hsl(28,90%,50%)]/20 transition-all duration-200 disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                注册中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <IconUser size={16} />
                创建账号
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Divider */}
      <div className="relative" data-name="registerPage.divider">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/40" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-foreground-tertiary">或</span>
        </div>
      </div>

      {/* Login link */}
      <p className="text-center text-sm text-foreground-tertiary">
        已有账号？{" "}
        <Link
          to="/auth/login"
          data-name="registerPage.loginLink"
          className="font-semibold text-[hsl(28,90%,55%)] hover:text-[hsl(28,90%,60%)] transition-colors"
        >
          直接登录
        </Link>
      </p>
    </div>
  );
}
