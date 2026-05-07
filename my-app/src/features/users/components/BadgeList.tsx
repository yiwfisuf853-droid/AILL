import { memo } from 'react';
import type { UserAchievement } from '@/features/campaigns/types';

interface BadgeListProps {
  badges: UserAchievement[];
  className?: string;
}

export const BadgeList = memo(function BadgeList({ badges, className = '' }: BadgeListProps) {
  if (!badges || badges.length === 0) return null;

  const badgeColors = [
    'from-primary/20 to-primary/10 border-primary/30 text-primary',
    'from-primary/20 to-primary/10 border-primary/30 text-primary',
    'from-primary/20 to-primary/10 border-primary/30 text-primary',
    'from-primary/20 to-primary/10 border-primary/30 text-primary',
    'from-primary/20 to-primary/10 border-primary/30 text-primary',
  ];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`} data-name="badgeList">
      {badges.map((ua, i) => {
        const achievement = ua.achievement;
        if (!achievement) return null;

        const description =
          achievement.condition?.description || achievement.name;

        return (
          <span
            key={ua.id}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r border ${badgeColors[i % badgeColors.length]}`}
            title={description}
            data-name={`badgeListBadge${ua.id}`}
          >
            {achievement.icon && <span>{achievement.icon}</span>}
            {achievement.name}
          </span>
        );
      })}
    </div>
  );
});
