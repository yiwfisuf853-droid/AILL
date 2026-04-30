import { useState } from "react";
import { IconAI, IconSend, IconRefresh } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface AiReplyButtonProps {
  postId: string;
  onReply?: (content: string) => void;
  availableAiUsers?: Array<{
    id: string;
    name: string;
    avatar?: string;
    trustLevel: number;
  }>;
  className?: string;
}

/**
 * AI 回复按钮组件
 * 允许用户邀请 AI 参与帖子讨论
 */
export function AiReplyButton({
  postId,
  onReply,
  availableAiUsers = [],
  className
}: AiReplyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAi, setSelectedAi] = useState<string | null>(null);

  const handleReply = async () => {
    if (!selectedAi || !onReply) return;

    setIsLoading(true);
    try {
      // TODO: 调用 AI 生成评论的 API
      // const response = await aiApi.generateComment(postId, selectedAi);
      // onReply(response.content);

      // 模拟 AI 回复
      setTimeout(() => {
        onReply(`[AI ${selectedAi}] 这是一个有趣的帖子，让我来分析一下...`);
        setIsLoading(false);
        setIsOpen(false);
        setSelectedAi(null);
      }, 2000);
    } catch (error) {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("relative", className)} data-name="aiReplyBtn">
      {/* 主按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 text-xs"
      >
        <IconAI size={14} />
        AI 回复
      </Button>

      {/* 下拉面板 */}
      {isOpen && (
        <div data-name="aiReplyPanel" className="absolute top-full right-0 mt-2 w-72 bg-popover border rounded-lg shadow-lg z-50 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between" data-name="aiReplyPanelHeader">
              <h4 className="text-sm font-medium">选择 AI 参与讨论</h4>
              <button
                onClick={() => setIsOpen(false)}
                data-name="aiReplyPanelCloseBtn"
                className="text-foreground-tertiary hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* AI 列表 */}
            <div className="space-y-2 max-h-64 overflow-y-auto" data-name="aiReplyList">
              {availableAiUsers.length === 0 ? (
                <div className="text-center py-4 text-foreground-tertiary text-xs">
                  暂无可用的 AI 助手
                </div>
              ) : (
                availableAiUsers.map((ai) => (
                  <button
                    key={ai.id}
                    onClick={() => setSelectedAi(ai.id)}
                    data-name={`aiReplyItem${ai.id}`}
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left",
                      selectedAi === ai.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <IconAI size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium truncate">{ai.name}</span>
                      </div>
                      <div className="text-xs text-foreground-tertiary">
                        信任等级 Lv.{ai.trustLevel}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* 操作按钮 */}
            <Button
              onClick={handleReply}
              disabled={!selectedAi || isLoading}
              data-name="aiReplySubmitBtn"
              className="w-full gap-2"
              size="sm"
            >
              {isLoading ? (
                <>
                  <IconRefresh size={14} className="animate-spin" />
                  AI 正在思考...
                </>
              ) : (
                <>
                  <IconSend size={14} />
                  邀请 AI 回复
                </>
              )}
            </Button>

            {/* 提示 */}
            <p className="text-xs text-foreground-tertiary text-center" data-name="aiReplyHint">
              AI 将基于帖子内容生成回复
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
