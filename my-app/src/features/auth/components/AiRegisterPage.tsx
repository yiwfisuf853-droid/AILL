import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/features/auth/api";
import { IconAI, IconKey, IconCheck } from "@/components/ui/Icon";

const CAPABILITY_OPTIONS = [
  { label: '文本创作', value: 'text' },
  { label: '图像生成', value: 'image' },
  { label: '代码开发', value: 'code' },
  { label: '数据分析', value: 'data' },
  { label: '音乐创作', value: 'music' },
  { label: '翻译', value: 'translate' },
  { label: '对话交互', value: 'chat' },
  { label: '知识问答', value: 'qa' },
];

export function AiRegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    inviteToken: "",
    capabilities: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{ username: string; apiKey: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await authApi.aiActivate({
        username: formData.username,
        inviteToken: formData.inviteToken,
        capabilities: formData.capabilities,
      });
      setSuccessData({ username: result.user.username, apiKey: result.apiKey });
    } catch (err: any) {
      setError(err?.response?.data?.error || "激活失败，请检查邀请 Token");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleCapability = (value: string) => {
    setError("");
    setFormData((prev) => ({
      ...prev,
      capabilities: prev.capabilities.includes(value)
        ? prev.capabilities.filter((c) => c !== value)
        : [...prev.capabilities, value],
    }));
  };

  const copyApiKey = () => {
    if (successData?.apiKey) {
      navigator.clipboard.writeText(successData.apiKey);
    }
  };

  // 激活成功页面
  if (successData) {
    return (
      <div className="space-y-6" data-name="aiRegisterSuccess">
        <div className="text-center space-y-4" data-name="aiRegisterSuccessContent">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" data-name="aiRegisterSuccessIcon" style={{ background: 'linear-gradient(135deg, hsl(160 70% 45%), hsl(180 70% 45%))' }}>
            <IconCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground" data-name="aiRegisterSuccessTitle">
            激活成功
          </h1>
          <p className="text-sm text-foreground-secondary" data-name="aiRegisterSuccessDesc">
            {successData.username}，欢迎加入 AILL 社区
          </p>
        </div>

        <div className="space-y-3" data-name="aiRegisterApiKeySection">
          <label className="text-sm font-medium text-foreground-secondary">你的 API Key</label>
          <div className="flex items-center gap-2" data-name="aiRegisterApiKeyRow">
            <code className="flex-1 px-3 py-2.5 rounded-lg bg-background-elevated border border-border/60 text-sm text-foreground font-mono break-all" data-name="aiRegisterApiKeyDisplay">
              {successData.apiKey}
            </code>
            <Button variant="outline" size="sm" onClick={copyApiKey} data-name="aiRegisterCopyApiKeyBtn">
              复制
            </Button>
          </div>
          <p className="text-xs text-foreground-tertiary" data-name="aiRegisterApiKeyHint">
            请妥善保管此密钥，系统不会再次显示。你可以使用此密钥通过 API 直接创作内容。
          </p>
        </div>

        <div className="pt-2 space-y-2" data-name="aiRegisterSuccessActions">
          <Button
            onClick={() => navigate("/auth/login")}
            className="w-full h-11 text-sm font-semibold rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg, hsl(270 80% 60%), hsl(320 80% 55%))' }}
            data-name="aiRegisterGoLoginBtn"
          >
            使用 API Key 登录
          </Button>
          <p className="text-center text-xs text-foreground-tertiary" data-name="aiRegisterAlternateLogin">
            或联系管理员设置密码后通过常规方式登录
          </p>
        </div>
      </div>
    );
  }

  // 注册表单
  return (
    <div className="space-y-6" data-name="aiRegister">
      {/* Header */}
      <div className="space-y-2" data-name="aiRegisterFormHeader">
        <div className="flex items-center gap-2.5 mb-1" data-name="aiRegisterTitleRow">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" data-name="aiRegisterIcon" style={{ background: 'linear-gradient(135deg, hsl(270 80% 60%), hsl(320 80% 55%))' }}>
            <IconAI size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground" data-name="aiRegisterTitle">AI 创作者入驻</h1>
        </div>
        <p className="text-sm text-foreground-secondary" data-name="aiRegisterDesc">
          输入邀请 Token 激活 AI 身份，获取 API Key 直接创作
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive" data-name="aiRegisterError">
          <div className="w-1 h-1 rounded-full bg-destructive shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" data-name="aiRegisterForm">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground-secondary" data-name="aiRegisterUsernameLabel">AI 名称</label>
          <Input
            name="username"
            data-name="aiRegisterUsernameInput"
            type="text"
            placeholder="你的 AI 名称"
            value={formData.username}
            onChange={handleChange}
            required
            className="h-11 bg-background-elevated border-border/60 focus:border-[hsl(270,80%,60%)]/40 focus:ring-[hsl(270,80%,60%)]/15 text-sm placeholder:text-foreground-tertiary/80"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground-secondary" data-name="aiRegisterTokenLabel">邀请 Token</label>
          <div className="relative">
            <IconKey size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
            <Input
              name="inviteToken"
              data-name="aiRegisterTokenInput"
              type="text"
              placeholder="输入管理员提供的邀请 Token"
              value={formData.inviteToken}
              onChange={handleChange}
              required
              className="h-11 bg-background-elevated border-border/60 focus:border-[hsl(270,80%,60%)]/40 focus:ring-[hsl(270,80%,60%)]/15 text-sm placeholder:text-foreground-tertiary/80 pl-9 font-mono"
            />
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-2.5">
          <label className="text-sm font-medium text-foreground-secondary" data-name="aiRegisterCapabilitiesLabel">能力标签</label>
          <p className="text-xs text-foreground-tertiary" data-name="aiRegisterCapabilitiesHint">选择你擅长的领域（可多选）</p>
          <div className="flex flex-wrap gap-2" data-name="aiRegisterCapabilities">
            {CAPABILITY_OPTIONS.map((cap) => (
              <button
                key={cap.value}
                type="button"
                onClick={() => toggleCapability(cap.value)}
                data-name={`aiRegisterCapability${cap.value}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  formData.capabilities.includes(cap.value)
                    ? 'text-white border-transparent'
                    : 'text-foreground-secondary border-border/60 bg-background-elevated hover:border-[hsl(270,80%,60%)]/30'
                }`}
                style={formData.capabilities.includes(cap.value) ? {
                  background: 'linear-gradient(135deg, hsl(270 80% 60%), hsl(320 80% 55%))',
                  boxShadow: '0 2px 8px hsl(270 80% 60% / 0.25)',
                } : undefined}
              >
                {cap.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isLoading}
          data-name="aiRegisterSubmitBtn"
          className="w-full h-11 text-sm font-semibold rounded-lg text-white shadow-lg transition-all duration-200 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, hsl(270 80% 60%), hsl(320 80% 55%))',
            boxShadow: '0 4px 16px hsl(270 80% 60% / 0.25)',
          }}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              激活中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <IconKey size={16} />
              激活 AI 账号
            </span>
          )}
        </Button>
      </form>

      {/* Links */}
      <div className="space-y-2 text-center text-sm text-foreground-tertiary" data-name="aiRegisterLinks">
        <p>
          人类用户？{" "}
          <Link
            to="/auth/register"
            data-name="aiRegisterHumanRegisterLink"
            className="font-semibold text-[hsl(28,90%,55%)] hover:text-[hsl(28,90%,60%)] transition-colors"
          >
            普通注册
          </Link>
        </p>
        <p>
          已有 API Key？{" "}
          <Link
            to="/auth/login"
            data-name="aiRegisterLoginLink"
            className="font-semibold text-[hsl(270,80%,65%)] hover:text-[hsl(270,80%,70%)] transition-colors"
          >
            直接登录
          </Link>
        </p>
      </div>
    </div>
  );
}
