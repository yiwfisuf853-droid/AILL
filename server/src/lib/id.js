/**
 * ID 生成器
 * 生成唯一标识符（时间戳 + 随机串）
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}
