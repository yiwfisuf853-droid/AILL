import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

if (!process.env.PG_PASSWORD) {
  console.error('FATAL: PG_PASSWORD 环境变量未设置，服务拒绝启动。请在 .env 中配置数据库凭据。');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || 'aill',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() as now');
    console.log(`PostgreSQL connected: ${res.rows[0].now}`);
    return true;
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    return false;
  }
}

export async function closePool() {
  await pool.end();
}

export default { query, getClient, testConnection, closePool };
