import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconPlus, IconClose, IconLock, IconCheck, IconCalendar } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { PollType, CreatePollDto } from '../types';

/** 投票创建器属性 */
interface PollCreatorProps {
  /** 创建回调 */
  onSubmit: (data: CreatePollDto) => Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
  /** 关联帖子 ID */
  postId?: string;
  /** 加载中 */
  loading?: boolean;
}

/** 选项输入状态 */
interface OptionInput {
  id: string;
  text: string;
}

/** 生成临时 ID */
let tempIdCounter = 0;
function tempId(): string {
  tempIdCounter += 1;
  return `temp-${Date.now()}-${tempIdCounter}`;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;

/**
 * 投票创建组件
 * 支持标题、选项增删、单选/多选切换、匿名切换、截止时间
 */
export function PollCreator({ onSubmit, onCancel, postId, loading = false }: PollCreatorProps) {
  // 标题
  const [title, setTitle] = useState('');
  // 描述
  const [description, setDescription] = useState('');
  // 选项列表
  const [options, setOptions] = useState<OptionInput[]>([
    { id: tempId(), text: '' },
    { id: tempId(), text: '' },
  ]);
  // 投票类型
  const [pollType, setPollType] = useState<PollType>('single');
  // 是否匿名
  const [isAnonymous, setIsAnonymous] = useState(false);
  // 截止时间
  const [endedAt, setEndedAt] = useState('');
  // 验证错误
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 添加选项
  const handleAddOption = useCallback(() => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, { id: tempId(), text: '' }]);
  }, [options.length]);

  // 删除选项
  const handleRemoveOption = useCallback(
    (id: string) => {
      if (options.length <= MIN_OPTIONS) return;
      setOptions((prev) => prev.filter((o) => o.id !== id));
    },
    [options.length]
  );

  // 更新选项文本
  const handleOptionChange = useCallback((id: string, text: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  }, []);

  // 验证
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '请输入投票标题';
    } else if (title.trim().length > 200) {
      newErrors.title = '标题不能超过 200 字';
    }

    const validOptions = options.filter((o) => o.text.trim());
    if (validOptions.length < MIN_OPTIONS) {
      newErrors.options = `至少需要 ${MIN_OPTIONS} 个非空选项`;
    }

    if (endedAt && new Date(endedAt) <= new Date()) {
      newErrors.endedAt = '截止时间必须晚于当前时间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交
  const handleSubmit = async () => {
    if (!validate()) return;

    const data: CreatePollDto = {
      title: title.trim(),
      description: description.trim() || undefined,
      postId,
      pollType,
      isAnonymous,
      endedAt: endedAt || undefined,
      options: options.filter((o) => o.text.trim()).map((o) => o.text.trim()),
    };

    await onSubmit(data);
  };

  return (
    <Card data-name="pollCreator" className="bg-card">
      <CardHeader>
        <CardTitle data-name="pollCreatorTitle" className="text-lg">
          创建投票
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 标题输入 */}
        <div data-name="pollCreatorTitleInput">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            标题 <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入投票标题"
            maxLength={200}
            className={cn(
              'w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'transition-all duration-200',
              errors.title ? 'border-destructive' : 'border-border'
            )}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-destructive">{errors.title}</p>
          )}
        </div>

        {/* 描述输入 */}
        <div data-name="pollCreatorDescInput">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            描述（选填）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="补充说明（可选）"
            rows={2}
            className={cn(
              'w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm resize-none',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'transition-all duration-200',
              'border-border'
            )}
          />
        </div>

        {/* 选项列表 */}
        <div data-name="pollCreatorOptions">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            选项 <span className="text-destructive">*</span>
          </label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                {/* 序号指示器 */}
                <span
                  className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    option.text.trim()
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => handleOptionChange(option.id, e.target.value)}
                  placeholder={`选项 ${index + 1}`}
                  maxLength={200}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border bg-background text-foreground text-sm',
                    'placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                    'transition-all duration-200',
                    'border-border'
                  )}
                />
                {/* 删除按钮（至少保留2个选项） */}
                {options.length > MIN_OPTIONS && (
                  <button
                    data-name="pollCreatorRemoveOption"
                    onClick={() => handleRemoveOption(option.id)}
                    className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <IconClose size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.options && (
            <p className="mt-1 text-xs text-destructive">{errors.options}</p>
          )}
          {/* 添加选项按钮 */}
          {options.length < MAX_OPTIONS && (
            <Button
              data-name="pollCreatorAddOption"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              icon={<IconPlus size={14} />}
              className="mt-2"
            >
              添加选项
            </Button>
          )}
          {options.length >= MAX_OPTIONS && (
            <p className="mt-2 text-xs text-muted-foreground">已达到最大选项数量（{MAX_OPTIONS}）</p>
          )}
        </div>

        {/* 投票类型切换 */}
        <div data-name="pollCreatorType" className="flex items-center gap-4">
          <label className="text-sm font-medium text-foreground">投票类型</label>
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            <button
              data-name="pollCreatorTypeSingle"
              onClick={() => setPollType('single')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                pollType === 'single'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground-secondary hover:text-foreground'
              )}
            >
              单选
            </button>
            <button
              data-name="pollCreatorTypeMulti"
              onClick={() => setPollType('multi')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                pollType === 'multi'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground-secondary hover:text-foreground'
              )}
            >
              多选
            </button>
          </div>
        </div>

        {/* 匿名切换 */}
        <div data-name="pollCreatorAnonymous" className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isAnonymous}
            onClick={() => setIsAnonymous(!isAnonymous)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
              isAnonymous ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                isAnonymous ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
          <div className="flex items-center gap-1.5 text-sm">
            <IconLock size={14} className="text-muted-foreground" />
            <span className="text-foreground">匿名投票</span>
            <span className="text-muted-foreground">（投票结果不公开投票者）</span>
          </div>
        </div>

        {/* 截止时间 */}
        <div data-name="pollCreatorEndTime">
          <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
            <IconCalendar size={14} />
            截止时间（选填）
          </label>
          <input
            type="datetime-local"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            className={cn(
              'w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'transition-all duration-200',
              errors.endedAt ? 'border-destructive' : 'border-border'
            )}
          />
          {errors.endedAt && (
            <p className="mt-1 text-xs text-destructive">{errors.endedAt}</p>
          )}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          data-name="pollCreatorSubmit"
          onClick={handleSubmit}
          disabled={loading}
          loading={loading}
          icon={<IconCheck size={14} />}
        >
          创建投票
        </Button>
        {onCancel && (
          <Button
            data-name="pollCreatorCancel"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            取消
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default PollCreator;