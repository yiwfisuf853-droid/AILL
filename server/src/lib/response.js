/**
 * 统一 API 响应工具
 * 让所有端点返回一致的 JSON 结构
 */

/** 成功响应 */
export function success(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    ...(typeof data === 'object' && data !== null ? data : { data }),
  });
}

/** 创建成功响应 (201) */
export function created(res, data) {
  return success(res, data, 201);
}

/** 删除成功响应 */
export function deleted(res, message = '删除成功') {
  return res.json({ success: true, message });
}

/** 分页列表响应 */
export function paginated(res, list, total, page, pageSize) {
  return res.json({
    success: true,
    list,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  });
}
