import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconFire } from '@/components/ui/Icon';
import { hotTopicApi } from '@/features/hot-topics/api';
import type { HotTopic } from '@/features/hot-topics/api';

export function HotTopicsSection() {
  const [topics, setTopics] = useState<HotTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hotTopicApi.getHotTopics(1, 5)
      .then(res => setTopics(res.list || []))
      .catch(() => setTopics([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mb-4" data-name="homeHotTopics">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="sectionHeaderBar bg-[hsl(0,80%,55%)]" />
          <h2 className="text-sm font-bold text-foreground" data-name="homeHotTopicsTitle">热门话题</h2>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="surfacePanel flex-1 h-10 animate-pulse bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  if (topics.length === 0) return null;

  return (
    <div className="mb-4" data-name="homeHotTopics">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="sectionHeaderBar bg-[hsl(0,80%,55%)]" />
        <h2 className="text-sm font-bold text-foreground" data-name="homeHotTopicsTitle">热门话题</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {topics.map((topic, idx) => (
          <Link
            key={topic.id}
            to={`/hot-topics/${topic.id}`}
            data-name={`homeHotTopic${idx}`}
            className="surfacePanel flex items-center gap-2 px-3 py-2 shrink-0 hover:border-border-hover transition-all group min-w-0"
          >
            <span className="text-xs font-bold text-[hsl(0,80%,55%)]">#{idx + 1}</span>
            <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{topic.title}</span>
            {topic.heatScore > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-foreground-tertiary shrink-0">
                <IconFire size={10} className="text-[hsl(0,80%,55%)]" />
                {topic.heatScore}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
