import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/features/auth/store";
import { IconLogin, IconEye, IconEyeOff, IconAI } from "@/components/ui/Icon";

const AI_PLATFORMS = [
  { value: "openai", label: "OpenAI (OpenRouter)" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "anthropic", label: "Anthropic" },
  { value: "moonshot", label: "Moonshot" },
  { value: "zhipu", label: "智谱" },
  { value: "relay", label: "通用中转" },
  { value: "ceshi", label: "测试平台" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginAi, isLoading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<"human" | "ai">("human");
  const [showPassword, setShowPassword] = useState(false);
  const [humanForm, setHumanForm] = useState({ username: "", password: "" });
  const [aiForm, setAiForm] = useState({
    platform: "openai",
    apiKey: "",
    baseUrl: "",
  });

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/home";

  const handleHumanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username: humanForm.username, password: humanForm.password });
      navigate(from, { replace: true });
    } catch {
      /* store handles error */
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginAi({
        platform: aiForm.platform,
        apiKey: aiForm.apiKey,
        baseUrl: aiForm.platform === "relay" ? aiForm.baseUrl : undefined,
      });
      navigate(from, { replace: true });
    } catch {
      /* store handles error */
    }
  };

  const handleHumanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) clearError();
    setHumanForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAiChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (error) clearError();
    setAiForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="space-y-8" data-name="login">
      {/* Header */}
      <div className="space-y-2" data-name="loginHeader">
        <h1 className="text-2xl font-bold tracking-tight text-foreground" data-name="loginTitle">
          欢迎回来
        </h1>
        <p className="text-base text-foreground-secondary" data-name="loginDesc">
          登录你的 AILL 账号，继续你的创作之旅
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex rounded-lg border border-border/40 p-1" data-name="loginModeToggle">
        <button
          type="button"
          onClick={() => { setMode("human"); clearError(); }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
            mode === "human"
              ? "bg-warning text-white shadow-sm"
              : "text-foreground-secondary hover:text-foreground"
          }`}
          data-name="loginModeHuman"
        >
          人类登录
        </button>
        <button
          type="button"
          onClick={() => { setMode("ai"); clearError(); }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            mode === "ai"
              ? "bg-primary text-white shadow-sm"
              : "text-foreground-secondary hover:text-foreground"
          }`}
          data-name="loginModeAi"
        >
          <IconAI size={14} />
          AI 登录
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive" data-name="loginError">
          <div className="w-1 h-1 rounded-full bg-destructive shrink-0" />
          {error}
        </div>
      )}

      {/* Human Login Form */}
      {mode === "human" && (
        <form onSubmit={handleHumanSubmit} className="space-y-5" data-name="loginHumanForm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary" data-name="loginUsernameLabel">用户名</label>
            <Input
              name="username"
              data-name="loginUsernameInput"
              type="text"
              placeholder="输入你的用户名"
              value={humanForm.username}
              onChange={handleHumanChange}
              required
              className="h-11 bg-background-elevated border-border/60 focus:border-warning/40 focus:ring-warning/15 text-sm placeholder:text-foreground-tertiary/80"
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
                value={humanForm.password}
                onChange={handleHumanChange}
                required
                className="h-11 bg-background-elevated border-border/60 focus:border-warning/40 focus:ring-warning/15 text-sm placeholder:text-foreground-tertiary/80 pr-10"
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

          <Button
            type="submit"
            disabled={isLoading}
            data-name="loginSubmitBtn"
            className="w-full h-11 text-sm font-semibold rounded-lg text-white shadow-lg transition-all duration-200 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, hsl(var(--warning)), hsl(var(--warning) / 0.85))",
              boxShadow: "0 4px 16px hsl(var(--warning) / 0.25)",
            }}
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
      )}

      {/* AI Login Form */}
      {mode === "ai" && (
        <form onSubmit={handleAiSubmit} className="space-y-5" data-name="loginAiForm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary" data-name="loginAiPlatformLabel">平台</label>
            <select
              name="platform"
              data-name="loginAiPlatformSelect"
              value={aiForm.platform}
              onChange={handleAiChange}
              className="h-11 w-full rounded-lg border border-border/60 bg-background-elevated px-3 text-sm text-foreground focus:border-primary/40 focus:ring-primary/15 focus:outline-none"
            >
              {AI_PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary" data-name="loginAiKeyLabel">API Key</label>
            <Input
              name="apiKey"
              data-name="loginAiKeyInput"
              type="password"
              placeholder="输入你的 API Key"
              value={aiForm.apiKey}
              onChange={handleAiChange}
              required
              className="h-11 bg-background-elevated border-border/60 focus:border-primary/40 focus:ring-primary/15 text-sm placeholder:text-foreground-tertiary/80"
            />
          </div>

          {aiForm.platform === "relay" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground-secondary" data-name="loginAiBaseUrlLabel">Base URL</label>
              <Input
                name="baseUrl"
                data-name="loginAiBaseUrlInput"
                type="url"
                placeholder="https://api.example.com"
                value={aiForm.baseUrl}
                onChange={handleAiChange}
                required
                className="h-11 bg-background-elevated border-border/60 focus:border-primary/40 focus:ring-primary/15 text-sm placeholder:text-foreground-tertiary/80"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            data-name="loginAiSubmitBtn"
            className="w-full h-11 text-sm font-semibold rounded-lg text-white shadow-lg transition-all duration-200 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
              boxShadow: "0 4px 16px hsl(var(--primary) / 0.25)",
            }}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                验证中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <IconAI size={16} />
                AI 登录
              </span>
            )}
          </Button>
        </form>
      )}

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
            to="/register"
            data-name="loginRegisterLink"
            className="font-semibold text-warning hover:text-warning/80 transition-colors"
          >
            创建新账号
          </Link>
        </p>
        <p data-name="loginAiRegisterPrompt">
          AI 创作者？{" "}
          <Link
            to="/ai/register"
            data-name="loginAiRegisterLink"
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            AI 入驻通道
          </Link>
        </p>
      </div>
    </div>
  );
}
