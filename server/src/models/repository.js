import pg from './pg.js';

// ========== PG 连接初始化 ==========

export async function initializePgConnection() {
  const connected = await pg.testConnection();
  if (connected) {
    console.log('Using PostgreSQL as primary database');
  } else {
    console.error('PostgreSQL connection failed!');
  }
  return connected;
}

// ========== JSONB 序列化 ==========
const JSONB_FIELDS = {
  posts: ['images', 'tags'],
  comments: ['images'],
  products: ['images'],
  collections: ['tags'],
  campaigns: ['rewardConfig'],
  achievements: ['condition', 'reward'],
  moderation_rules: ['targetAudience'],
  user_settings: ['settingValue'],
  api_keys: ['permissions'],
  ai_profiles: ['capabilities'],
  ai_memories: ['memoryValue'],
  themes: ['config'],
  sys_config: ['configValue'],
  file_metadata: [],
  announcements: [],
  dict_items: ['extra'],
  subscriptions: ['notificationSettings'],
  asset_rules: ['conditions', 'rewards'],
};

function serializeForPg(table, data) {
  const snakeTable = toSnakeCase(table);
  const jsonbFields = JSONB_FIELDS[snakeTable] || [];
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = toSnakeCase(key);
    if ((jsonbFields.includes(key) || jsonbFields.includes(snakeKey)) && value !== null && value !== undefined) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ========== orderBy 白名单校验 ==========

const ORDER_BY_PATTERN = /^[a-zA-Z_]+\s*(ASC|DESC)?(\s*,\s*[a-zA-Z_]+\s*(ASC|DESC)?)*$/i;

function validateOrderBy(orderBy) {
  if (!ORDER_BY_PATTERN.test(orderBy)) {
    throw new Error(`Invalid orderBy: ${orderBy}`);
  }
}

// ========== 通用查询 ==========

export async function findAll(table, options = {}) {
  const { where = {}, page, limit, orderBy = 'created_at DESC', notWhere = {} } = options;
  validateOrderBy(orderBy);

  const conditions = [];
  const params = [];
  let idx = 1;

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    if (value === null) {
      conditions.push(`"${toSnakeCase(key)}" IS NULL`);
    } else {
      conditions.push(`"${toSnakeCase(key)}" = $${idx}`);
      params.push(value);
      idx++;
    }
  }

  for (const [key, value] of Object.entries(notWhere)) {
    if (value === undefined) continue;
    if (value === null) {
      conditions.push(`"${toSnakeCase(key)}" IS NOT NULL`);
    } else {
      conditions.push(`"${toSnakeCase(key)}" != $${idx}`);
      params.push(value);
      idx++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await pg.query(`SELECT COUNT(*) as total FROM ${table} ${whereClause}`, params);
  const total = Number(countRes.rows[0].total);

  if (page && limit) {
    const offset = (page - 1) * limit;
    const res = await pg.query(
      `SELECT * FROM ${table} ${whereClause} ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );
    return { total, page, limit, list: res.rows.map(row => toCamelCase(row, table)) };
  }

  const res = await pg.query(`SELECT * FROM ${table} ${whereClause} ORDER BY ${orderBy}`, params);
  return res.rows.map(row => toCamelCase(row, table));
}

export async function findOne(table, where) {
  const conditions = [];
  const params = [];
  let idx = 1;

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    if (value === null) {
      conditions.push(`"${toSnakeCase(key)}" IS NULL`);
    } else {
      conditions.push(`"${toSnakeCase(key)}" = $${idx}`);
      params.push(value);
      idx++;
    }
  }

  if (conditions.length === 0) return null;

  const res = await pg.query(
    `SELECT * FROM ${table} WHERE ${conditions.join(' AND ')} LIMIT 1`,
    params
  );

  return res.rows.length > 0 ? toCamelCase(res.rows[0], table) : null;
}

export async function findById(table, id) {
  const res = await pg.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return res.rows.length > 0 ? toCamelCase(res.rows[0], table) : null;
}

export async function insert(table, data) {
  const serialized = serializeForPg(table, data);
  const keys = Object.keys(serialized).map(k => `"${toSnakeCase(k)}"`);
  const values = Object.values(serialized);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const res = await pg.query(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );

  return toCamelCase(res.rows[0], table);
}

export async function batchInsert(table, rows) {
  if (rows.length === 0) return [];

  const results = [];
  for (const data of rows) {
    results.push(await insert(table, data));
  }
  return results;
}

export async function update(table, id, data) {
  const serialized = serializeForPg(table, data);
  const sets = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(serialized)) {
    sets.push(`"${toSnakeCase(key)}" = $${idx}`);
    values.push(value);
    idx++;
  }

  values.push(id);

  const res = await pg.query(
    `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  return res.rows.length > 0 ? toCamelCase(res.rows[0], table) : null;
}

export async function updateWhere(table, where, data) {
  const serialized = serializeForPg(table, data);
  const conditions = [];
  const params = [];
  let idx = 1;

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    conditions.push(`${toSnakeCase(key)} = $${idx}`);
    params.push(value);
    idx++;
  }

  const sets = [];
  for (const [key, value] of Object.entries(serialized)) {
    sets.push(`"${toSnakeCase(key)}" = $${idx}`);
    params.push(value);
    idx++;
  }

  const res = await pg.query(
    `UPDATE ${table} SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')} RETURNING *`,
    params
  );

  return res.rows.map(row => toCamelCase(row, table));
}

// ========== 软删除表缓存 ==========

const softDeleteTables = new Set();

async function isSoftDeleteTable(table) {
  if (softDeleteTables.size === 0) {
    // 启动时一次性加载所有含 deleted_at 列的表
    const res = await pg.query(
      `SELECT table_name FROM information_schema.columns WHERE column_name = 'deleted_at' AND table_schema = 'public'`
    );
    for (const row of res.rows) {
      softDeleteTables.add(row.table_name);
    }
  }
  return softDeleteTables.has(table);
}

export async function remove(table, id) {
  if (await isSoftDeleteTable(table)) {
    const res = await pg.query(
      `UPDATE ${table} SET deleted_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    );
    return res.rows.length > 0;
  }

  // 没有 deleted_at 列则硬删除
  const res = await pg.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id]);
  return res.rows.length > 0;
}

export async function hardDelete(table, where) {
  const conditions = [];
  const params = [];
  let idx = 1;

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    conditions.push(`${toSnakeCase(key)} = $${idx}`);
    params.push(value);
    idx++;
  }

  const res = await pg.query(
    `DELETE FROM ${table} WHERE ${conditions.join(' AND ')}`,
    params
  );

  return res.rowCount;
}

export async function increment(table, id, field, amount = 1) {
  const snakeField = `"${toSnakeCase(field)}"`;
  const res = await pg.query(
    `UPDATE ${table} SET ${snakeField} = ${snakeField} + $1 WHERE id = $2 RETURNING *`,
    [amount, id]
  );

  return res.rows.length > 0 ? toCamelCase(res.rows[0], table) : null;
}

export async function count(table, where = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    conditions.push(`${toSnakeCase(key)} = $${idx}`);
    params.push(value);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await pg.query(`SELECT COUNT(*) as total FROM ${table} ${whereClause}`, params);

  return Number(res.rows[0].total);
}

export async function rawQuery(sql, params = []) {
  return pg.query(sql, params);
}

// ========== 命名转换工具 ==========

export function toSnakeCase(str) {
  // 先处理连续大写字母（如 AI -> A_I -> a_i），再处理普通驼峰
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

export function toCamelCase(obj, table = null) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => toCamelCase(item));
  // 防止 map(callback) 将 index 作为 table 传入
  if (typeof table !== 'string') table = null;

  // 构建当前表的 JSONB 字段白名单（同时支持 snake_case 和 camelCase 键名匹配）
  const jsonbFields = table ? (JSONB_FIELDS[toSnakeCase(table)] || []) : [];
  const jsonbFieldsCamel = jsonbFields.map(f => f.replace(/_([a-z])/g, (_, l) => l.toUpperCase()));
  const isJsonbField = (key) => jsonbFields.includes(key) || jsonbFieldsCamel.includes(key);

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    // 仅对白名单内的 JSONB 字段自动解析，避免误解析普通文本
    if (isJsonbField(key) && typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && parsed !== null) {
          result[camelKey] = parsed;
          continue;
        }
      } catch {}
    }
    result[camelKey] = value;
  }
  return result;
}

export default {
  initializePgConnection,
  findAll, findOne, findById,
  insert, batchInsert, update, updateWhere,
  remove, hardDelete, increment, count,
  rawQuery: pg.query,
  getClient: pg.getClient,
  toSnakeCase, toCamelCase,
};
