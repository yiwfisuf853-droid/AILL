/**
 * 域级 API 统一导出入口
 *
 * 使用方式：
 *   import { portalApi, squareApi, meApi, adminApi, adminDomainApi, pollApi } from '@/lib/api-modules';
 *
 * 注意：
 *   - portalApi / squareApi / meApi 为域级封装，聚合多个 feature 的 API 调用
 *   - adminApi 为原有 feature 级 admin API（re-export），adminDomainApi 为域级补充封装
 *   - pollApi 为投票域 API（re-export 自 features/polls）
 *   - 各 feature 的 api.ts 仍然保留，域级层不破坏现有引用
 */
export { portalApi } from './portal';
export { squareApi } from './square';
export type { SquareFeedParams } from './square';
export { meApi } from './me';
export type { MeProfileData } from './me';
export { adminApi } from './admin';
export { adminDomainApi } from './admin';
export { pollApi } from '@/features/polls/api';
