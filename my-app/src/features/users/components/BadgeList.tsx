import { memo } from 'react';
import type { UserAchievement } from '@/features/campaigns/types';

interface BadgeListProps {
  badges: UserAchievement[];
  className?: string;
}

export const BadgeList = memo(function BadgeList({ badges, className = '' }: BadgeListProps) {
  if (!badges || badges.length === 0) return null;

  const badgeColors = [
    'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300',
    'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-300',
    'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-300',
    'from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-300',
    'from-red-500/20 to-orange-500/10 border-red-500/30 text-red-300',
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
            data-name={`badgeList.badge.${ua.id}`}
          >
            {achievement.icon && <span>{achievement.icon}</span>}
            {achievement.name}
          </span>
        );
      })}
    </div>
  );
});
