import pg from '../models/pg.js';
import * as repo from '../models/repository.js';

/**
 * PostgreSQL 数据库迁移脚本
 * 基于 第二版本.sql 的表结构
 * 运行: node src/data/migrate.js
 */

async function migrate() {
  console.log('Starting database migration...\n');

  const conn = await pg.getClient();

  try {
    await conn.query('BEGIN');

    // ========== 1. 核心内容模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id bigint PRIMARY KEY,
        visible_id varchar(32) UNIQUE,
        user_id bigint NOT NULL,
        title varchar(200) NOT NULL,
        content text,
        type smallint NOT NULL DEFAULT 1,
        originality_type smallint NOT NULL DEFAULT 0,
        original_post_id bigint,
        source_url varchar(500),
        source_author varchar(100),
        status smallint NOT NULL DEFAULT 0,
        view_count int NOT NULL DEFAULT 0,
        like_count int NOT NULL DEFAULT 0,
        favorite_count int NOT NULL DEFAULT 0,
        comment_count int NOT NULL DEFAULT 0,
        share_count int NOT NULL DEFAULT 0,
        hot_score numeric(10,4) DEFAULT 0,
        is_sticky smallint NOT NULL DEFAULT 0,
        is_essence smallint NOT NULL DEFAULT 0,
        scheduled_publish_at timestamp,
        quality_score numeric(5,2),
        deleted_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await conn.query(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_posts_status_created ON posts(status, created_at)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_posts_hot_score ON posts(hot_score)`);
    console.log('[OK] posts');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name varchar(50) NOT NULL UNIQUE,
        description varchar(200),
        usage_count int NOT NULL DEFAULT 0,
        status smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] tags');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS post_tags (
        id bigint PRIMARY KEY,
        post_id bigint NOT NULL,
        tag_id int NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (post_id, tag_id)
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id)`);
    console.log('[OK] post_tags');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id bigint PRIMARY KEY,
        post_id bigint NOT NULL,
        user_id bigint NOT NULL,
        parent_id bigint,
        content text NOT NULL,
        type smallint NOT NULL DEFAULT 1,
        like_count int NOT NULL DEFAULT 0,
        reply_count int NOT NULL DEFAULT 0,
        status smallint NOT NULL DEFAULT 1,
        deleted_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)`);
    console.log('[OK] comments');

    // ========== 2. 用户与权限模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id bigint PRIMARY KEY,
        visible_uid varchar(32) UNIQUE,
        username varchar(50) NOT NULL UNIQUE,
        nickname varchar(50),
        password_hash char(60) NOT NULL,
        email varchar(100) UNIQUE,
        phone varchar(20) UNIQUE,
        avatar varchar(200),
        signature varchar(200),
        role_id int NOT NULL DEFAULT 1,
        is_ai smallint NOT NULL DEFAULT 0,
        ai_provider varchar(50),
        ai_likelihood numeric(5,2),
        status smallint NOT NULL DEFAULT 1,
        last_login_at timestamp,
        registered_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)`);
    console.log('[OK] users');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        name varchar(50) NOT NULL UNIQUE,
        description varchar(200),
        permissions jsonb,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] user_roles');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        setting_key varchar(100) NOT NULL,
        setting_value jsonb NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, setting_key)
      );
    `);
    console.log('[OK] user_settings');

    // ========== 3. 社交关系 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_relationships (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        target_id bigint NOT NULL,
        type varchar(20) NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_user_relationships_user_id ON user_relationships(user_id)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_user_relationships_target_id ON user_relationships(target_id)`);
    console.log('[OK] user_relationships');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        blocked_user_id bigint NOT NULL,
        reason varchar(200),
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, blocked_user_id)
      );
    `);
    console.log('[OK] user_blocks');

    // ========== 4. 通知模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        type varchar(30) NOT NULL,
        title varchar(200),
        content text,
        source_id bigint,
        source_type varchar(30),
        is_read smallint NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
    console.log('[OK] notifications');

    // ========== 5. 用户资产模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS asset_types (
        id SERIAL PRIMARY KEY,
        name varchar(50) NOT NULL UNIQUE,
        description varchar(200),
        unit varchar(20),
        is_virtual smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] asset_types');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_assets (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        asset_type_id int NOT NULL,
        balance numeric(20,2) NOT NULL DEFAULT 0,
        frozen_amount numeric(20,2) NOT NULL DEFAULT 0,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, asset_type_id)
      );
    `);
    console.log('[OK] user_assets');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS asset_transactions (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        asset_type_id int NOT NULL,
        amount numeric(20,2) NOT NULL,
        balance_after numeric(20,2),
        type smallint NOT NULL,
        description varchar(200),
        source_id varchar(100),
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_asset_transactions_user_id ON asset_transactions(user_id)`);
    console.log('[OK] asset_transactions');

    // ========== 6. 消息模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id bigint PRIMARY KEY,
        type smallint NOT NULL DEFAULT 1,
        name varchar(100),
        last_message_id bigint,
        last_message_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    console.log('[OK] conversations');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id bigint PRIMARY KEY,
        conversation_id bigint NOT NULL,
        user_id bigint NOT NULL,
        last_read_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (conversation_id, user_id)
      );
    `);
    console.log('[OK] conversation_participants');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id bigint PRIMARY KEY,
        conversation_id bigint NOT NULL,
        sender_id bigint NOT NULL,
        content text NOT NULL,
        type smallint NOT NULL DEFAULT 1,
        is_read smallint NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`);
    console.log('[OK] messages');

    // ========== 7. 收藏模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS favorite_folders (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        name varchar(100) NOT NULL,
        description varchar(200),
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] favorite_folders');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        folder_id bigint,
        target_id varchar(100) NOT NULL,
        target_type smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)`);
    console.log('[OK] favorites');

    // ========== 8. 内容审核模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS moderation_rules (
        id bigint PRIMARY KEY,
        type smallint NOT NULL,
        pattern varchar(500) NOT NULL,
        action smallint NOT NULL DEFAULT 1,
        is_enabled smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] moderation_rules');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS moderation_records (
        id bigint PRIMARY KEY,
        target_id varchar(100) NOT NULL,
        target_type smallint NOT NULL,
        rule_id bigint,
        status smallint NOT NULL DEFAULT 0,
        moderator_id bigint,
        reason varchar(500),
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] moderation_records');

    // ========== 9. 反馈模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        type smallint NOT NULL,
        title varchar(200) NOT NULL,
        content text NOT NULL,
        status smallint NOT NULL DEFAULT 0,
        admin_reply text,
        replied_by bigint,
        replied_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] feedbacks');

    // ========== 10. 分区模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id varchar(50) PRIMARY KEY,
        name varchar(50) NOT NULL,
        description varchar(200),
        icon varchar(200),
        sort_order int NOT NULL DEFAULT 0,
        status smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] sections');

    // ========== 11. 榜单与公告 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS rankings (
        id bigint PRIMARY KEY,
        rank_type varchar(30) NOT NULL,
        target_type smallint NOT NULL,
        target_id bigint NOT NULL,
        score numeric(10,4) NOT NULL DEFAULT 0,
        rank_no int NOT NULL,
        period varchar(20) NOT NULL,
        calculated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_rankings_type_period ON rankings(rank_type, period)`);
    console.log('[OK] rankings');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS must_see_list (
        id bigint PRIMARY KEY,
        post_id bigint NOT NULL,
        reason varchar(200),
        sort_order int NOT NULL DEFAULT 0,
        start_time timestamp,
        end_time timestamp,
        created_by bigint NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    console.log('[OK] must_see_list');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id bigint PRIMARY KEY,
        title varchar(200) NOT NULL,
        content text NOT NULL,
        type smallint NOT NULL DEFAULT 1,
        priority int NOT NULL DEFAULT 0,
        start_time timestamp,
        end_time timestamp,
        is_sticky smallint NOT NULL DEFAULT 0,
        created_by bigint NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    console.log('[OK] announcements');

    // ========== 12. 合集模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        name varchar(100) NOT NULL,
        description varchar(500),
        cover_image varchar(200),
        type smallint NOT NULL DEFAULT 1,
        visibility smallint NOT NULL DEFAULT 1,
        post_count int NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    console.log('[OK] collections');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS collection_posts (
        id bigint PRIMARY KEY,
        collection_id bigint NOT NULL,
        post_id bigint NOT NULL,
        sort_order int NOT NULL DEFAULT 0,
        added_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (collection_id, post_id)
      );
    `);
    console.log('[OK] collection_posts');

    // ========== 13. 商城模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id bigint PRIMARY KEY,
        name varchar(100) NOT NULL,
        description varchar(500),
        type smallint NOT NULL DEFAULT 1,
        price_type smallint NOT NULL DEFAULT 1,
        price numeric(10,2) NOT NULL DEFAULT 0,
        points_price int NOT NULL DEFAULT 0,
        stock int NOT NULL DEFAULT 0,
        images jsonb,
        status smallint NOT NULL DEFAULT 1,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    console.log('[OK] products');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        product_id bigint NOT NULL,
        quantity int NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    console.log('[OK] carts');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id bigint PRIMARY KEY,
        order_no varchar(50) NOT NULL UNIQUE,
        user_id bigint NOT NULL,
        total_amount numeric(10,2) NOT NULL DEFAULT 0,
        total_points int NOT NULL DEFAULT 0,
        status smallint NOT NULL DEFAULT 1,
        payment_method varchar(30),
        paid_at timestamp,
        remark varchar(200),
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    console.log('[OK] orders');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id bigint PRIMARY KEY,
        order_id bigint NOT NULL,
        product_id bigint NOT NULL,
        quantity int NOT NULL DEFAULT 1,
        price numeric(10,2) NOT NULL DEFAULT 0,
        points_price int NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] order_items');

    // ========== 14. 直播模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS live_rooms (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        title varchar(200) NOT NULL,
        cover_image varchar(200),
        status smallint NOT NULL DEFAULT 1,
        start_time timestamp,
        end_time timestamp,
        view_count int NOT NULL DEFAULT 0,
        like_count int NOT NULL DEFAULT 0,
        comment_count int NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    console.log('[OK] live_rooms');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS live_messages (
        id bigint PRIMARY KEY,
        room_id bigint NOT NULL,
        user_id bigint NOT NULL,
        content text NOT NULL,
        type smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_live_messages_room_id ON live_messages(room_id)`);
    console.log('[OK] live_messages');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS live_gifts (
        id SERIAL PRIMARY KEY,
        name varchar(50) NOT NULL,
        icon varchar(20),
        price numeric(10,2) NOT NULL DEFAULT 0,
        points_price int NOT NULL DEFAULT 0,
        asset_type_id int NOT NULL DEFAULT 1,
        sort_order int NOT NULL DEFAULT 0,
        status smallint NOT NULL DEFAULT 1
      );
    `);
    console.log('[OK] live_gifts');

    // ========== 15. 活动与成就模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id bigint PRIMARY KEY,
        name varchar(100) NOT NULL,
        description varchar(500),
        type smallint NOT NULL DEFAULT 1,
        start_time timestamp NOT NULL,
        end_time timestamp NOT NULL,
        reward_config jsonb,
        status smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] campaigns');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_campaign_progress (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        campaign_id bigint NOT NULL,
        current_progress int NOT NULL DEFAULT 0,
        is_completed smallint NOT NULL DEFAULT 0,
        completed_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, campaign_id)
      );
    `);
    console.log('[OK] user_campaign_progress');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id bigint PRIMARY KEY,
        name varchar(100) NOT NULL,
        icon varchar(20),
        condition jsonb,
        reward jsonb,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] achievements');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        achievement_id bigint NOT NULL,
        unlocked_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, achievement_id)
      );
    `);
    console.log('[OK] user_achievements');

    // ========== 16. 主题资产模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS themes (
        id SERIAL PRIMARY KEY,
        name varchar(100) NOT NULL,
        description varchar(500),
        preview_image varchar(200),
        type smallint NOT NULL DEFAULT 1,
        config jsonb,
        price numeric(10,2) NOT NULL DEFAULT 0,
        points_price int NOT NULL DEFAULT 0,
        is_default smallint NOT NULL DEFAULT 0,
        sort_order int NOT NULL DEFAULT 0,
        status smallint NOT NULL DEFAULT 1
      );
    `);
    console.log('[OK] themes');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_themes (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        theme_id int NOT NULL,
        is_active smallint NOT NULL DEFAULT 0,
        purchased_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, theme_id)
      );
    `);
    console.log('[OK] user_themes');

    // ========== 17. AI 模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ai_profiles (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL UNIQUE,
        capabilities jsonb,
        influence_score numeric(10,4) DEFAULT 0,
        trust_level smallint DEFAULT 1,
        total_contributions bigint DEFAULT 0,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] ai_profiles');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ai_memories (
        id bigint PRIMARY KEY,
        ai_user_id bigint NOT NULL,
        content text NOT NULL,
        type smallint NOT NULL DEFAULT 1,
        importance numeric(5,2) DEFAULT 1.0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_ai_memories_ai_user_id ON ai_memories(ai_user_id)`);
    console.log('[OK] ai_memories');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        key_hash char(60) NOT NULL,
        key_prefix varchar(10) NOT NULL UNIQUE,
        permissions jsonb,
        rate_limit_per_minute int DEFAULT 60,
        last_used_at timestamp,
        expires_at timestamp,
        status smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`);
    console.log('[OK] api_keys');

    // ========== 18. 安全模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id bigint PRIMARY KEY,
        identifier varchar(100) NOT NULL,
        ip_address varchar(45),
        device_fingerprint varchar(200),
        is_success smallint NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier)`);
    console.log('[OK] login_attempts');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ip_blacklist (
        id bigint PRIMARY KEY,
        ip_address varchar(45) NOT NULL UNIQUE,
        reason varchar(200),
        blocked_by bigint,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at timestamp
      );
    `);
    console.log('[OK] ip_blacklist');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS device_blacklist (
        id bigint PRIMARY KEY,
        device_fingerprint varchar(200) NOT NULL UNIQUE,
        reason varchar(200),
        blocked_by bigint,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at timestamp
      );
    `);
    console.log('[OK] device_blacklist');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        risk_type varchar(50) NOT NULL,
        risk_score numeric(5,2) NOT NULL DEFAULT 0,
        risk_factors jsonb,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, risk_type)
      );
    `);
    console.log('[OK] risk_assessments');

    // ========== 19. 字典模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS dict_types (
        id SERIAL PRIMARY KEY,
        name varchar(100) NOT NULL UNIQUE,
        code varchar(50) NOT NULL UNIQUE,
        description varchar(200),
        status smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] dict_types');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS dict_items (
        id bigint PRIMARY KEY,
        type_id int NOT NULL,
        label varchar(100) NOT NULL,
        value varchar(200) NOT NULL,
        sort_order int NOT NULL DEFAULT 0,
        status smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_dict_items_type_id ON dict_items(type_id)`);
    console.log('[OK] dict_items');

    // ========== 20. 文件元数据 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS file_metadata (
        id bigint PRIMARY KEY,
        user_id bigint NOT NULL,
        original_name varchar(200) NOT NULL,
        stored_name varchar(200) NOT NULL,
        file_path varchar(500) NOT NULL,
        file_size bigint NOT NULL DEFAULT 0,
        mime_type varchar(100),
        width int,
        height int,
        duration int,
        hash varchar(64),
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_file_metadata_user_id ON file_metadata(user_id)`);
    console.log('[OK] file_metadata');

    // ========== 21. 系统配置 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS sys_config (
        id SERIAL PRIMARY KEY,
        config_key varchar(100) NOT NULL UNIQUE,
        config_value jsonb NOT NULL,
        description varchar(200),
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] sys_config');

    await conn.query('COMMIT');
    console.log('\nMigration completed successfully!');

  } catch (err) {
    await conn.query('ROLLBACK');
    console.error('\nMigration failed:', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

// 运行迁移（仅当直接执行此文件时运行，import 时不自动执行）
// 运行: node src/data/migrate.js
if (process.argv[1] && process.argv[1].includes('migrate.js')) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

// ========== 列迁移：对齐 service 层与 schema 的字段名 ==========
// 由 init-db.js 在 PG 模式启动时自动调用

const COLUMN_MIGRATIONS = [
  // users
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_level int DEFAULT 0",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_level_name varchar(50) DEFAULT ''",

  // user_assets — service 用 asset_type_id
  "ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS asset_type_id int",
  "UPDATE user_assets SET asset_type_id = type_id WHERE asset_type_id IS NULL",
  "ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS frozen numeric(20,4) DEFAULT 0",
  "ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()",
  "ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS expired_at timestamptz",

  // asset_transactions — service 用 asset_type_id, transaction_type, balance_after, related_biz_id
  "ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS asset_type_id int",
  "UPDATE asset_transactions SET asset_type_id = type_id WHERE asset_type_id IS NULL",
  "ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS transaction_type int",
  "UPDATE asset_transactions SET transaction_type = CASE WHEN type = 'earn' THEN 1 WHEN type = 'consume' THEN 2 ELSE 1 END WHERE transaction_type IS NULL",
  "ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS balance_after numeric(20,4) DEFAULT 0",
  "ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS frozen_after numeric(20,4) DEFAULT 0",
  "ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS related_biz_id text",
  "UPDATE asset_transactions SET related_biz_id = related_id WHERE related_biz_id IS NULL",
  "ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS status int DEFAULT 1",

  // user_contributions
  "ALTER TABLE user_contributions ADD COLUMN IF NOT EXISTS contribution_type int",
  "UPDATE user_contributions SET contribution_type = type WHERE contribution_type IS NULL",
  "ALTER TABLE user_contributions ADD COLUMN IF NOT EXISTS source_id text",
  "UPDATE user_contributions SET source_id = related_id WHERE source_id IS NULL",
  "ALTER TABLE user_contributions ADD COLUMN IF NOT EXISTS score int DEFAULT 0",
  "UPDATE user_contributions SET score = points WHERE score IS NULL OR score = 0",

  // user_relationships — service 用 integer type/status
  "ALTER TABLE user_relationships ADD COLUMN IF NOT EXISTS status int DEFAULT 1",
  "ALTER TABLE user_relationships ALTER COLUMN status DROP DEFAULT",
  "ALTER TABLE user_relationships ALTER COLUMN status TYPE int USING status::int",
  "ALTER TABLE user_relationships ALTER COLUMN status SET DEFAULT 1",
  "ALTER TABLE user_relationships ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()",
  "ALTER TABLE user_relationships ADD COLUMN IF NOT EXISTS deleted_at timestamptz",
  "ALTER TABLE user_relationships ALTER COLUMN type TYPE int USING type::int",
  "UPDATE user_relationships SET status = 1 WHERE status IS NULL",

  // user_blocks — service 用 blocked_user_id, deleted_at
  "ALTER TABLE user_blocks ADD COLUMN IF NOT EXISTS blocked_user_id text",
  "UPDATE user_blocks SET blocked_user_id = target_user_id WHERE blocked_user_id IS NULL",
  "ALTER TABLE user_blocks ADD COLUMN IF NOT EXISTS deleted_at timestamptz",

  // notifications — service 用 integer type/is_read, source_user_id, target_type, target_id, read_at
  "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_user_id text",
  "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_type int",
  "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_id text",
  "UPDATE notifications SET target_id = related_id WHERE target_id IS NULL",
  "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at timestamptz",
  "ALTER TABLE notifications ALTER COLUMN type DROP DEFAULT",
  "ALTER TABLE notifications ALTER COLUMN type TYPE int USING type::int",
  "ALTER TABLE notifications ALTER COLUMN is_read DROP DEFAULT",
  "ALTER TABLE notifications ALTER COLUMN is_read TYPE int USING CASE WHEN is_read THEN 1 ELSE 0 END",
  "ALTER TABLE notifications ALTER COLUMN is_read SET DEFAULT 0",

  // conversations
  "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()",

  // conversations — service 用 integer type
  "ALTER TABLE conversations ALTER COLUMN type TYPE int USING type::int",

  // conversation_participants
  "ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS last_read_at timestamptz",

  // favorites — service 用 integer target_type
  "ALTER TABLE favorites ALTER COLUMN target_type TYPE int USING target_type::int",

  // messages — service 用 integer type/is_read
  "ALTER TABLE messages ALTER COLUMN type TYPE int USING type::int",
  "ALTER TABLE messages ALTER COLUMN is_read DROP DEFAULT",
  "ALTER TABLE messages ALTER COLUMN is_read TYPE int USING CASE WHEN is_read THEN 1 ELSE 0 END",
  "ALTER TABLE messages ALTER COLUMN is_read SET DEFAULT 0",

  // favorite_folders
  "ALTER TABLE favorite_folders ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true",

  // feedbacks
  "ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS target_type int",
  "ALTER TABLE feedbacks ALTER COLUMN type TYPE int USING type::int",
  "ALTER TABLE feedbacks ALTER COLUMN status TYPE int USING CASE WHEN status = 'pending' THEN 1 WHEN status = 'processing' THEN 2 WHEN status = 'resolved' THEN 3 WHEN status = 'closed' THEN 4 ELSE 1 END",
  "ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS target_id text",
  "ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'",
  "ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS handler_id text",
  "ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS handler_comment text",

  // moderation_rules — service 用 rule_type, rule_content, name 等
  "ALTER TABLE moderation_rules ADD COLUMN IF NOT EXISTS name varchar(100)",
  "ALTER TABLE moderation_rules ADD COLUMN IF NOT EXISTS rule_type int",
  "UPDATE moderation_rules SET rule_type = type::int WHERE rule_type IS NULL AND type ~ '^[0-9]+$'",
  "ALTER TABLE moderation_rules ADD COLUMN IF NOT EXISTS rule_content text",
  "UPDATE moderation_rules SET rule_content = pattern WHERE rule_content IS NULL",
  "ALTER TABLE moderation_rules ADD COLUMN IF NOT EXISTS risk_level int DEFAULT 0",
  "ALTER TABLE moderation_rules ADD COLUMN IF NOT EXISTS replacement text",
  "ALTER TABLE moderation_rules ADD COLUMN IF NOT EXISTS effective_time timestamptz",
  "ALTER TABLE moderation_rules ADD COLUMN IF NOT EXISTS expired_time timestamptz",
  "ALTER TABLE moderation_rules ADD COLUMN IF NOT EXISTS priority int DEFAULT 0",
  "ALTER TABLE moderation_rules ADD COLUMN IF NOT EXISTS target_audience jsonb",

  // moderation_records — service 用 content_type, content_id, submitter_id 等
  "ALTER TABLE moderation_records ADD COLUMN IF NOT EXISTS content_type int",
  "UPDATE moderation_records SET content_type = target_type WHERE content_type IS NULL",
  "ALTER TABLE moderation_records ADD COLUMN IF NOT EXISTS content_id text",
  "UPDATE moderation_records SET content_id = target_id WHERE content_id IS NULL",
  "ALTER TABLE moderation_records ADD COLUMN IF NOT EXISTS submitter_id text",
  "UPDATE moderation_records SET submitter_id = user_id WHERE submitter_id IS NULL",
  "ALTER TABLE moderation_records ADD COLUMN IF NOT EXISTS submitted_at timestamptz",
  "UPDATE moderation_records SET submitted_at = created_at WHERE submitted_at IS NULL",
  "ALTER TABLE moderation_records ADD COLUMN IF NOT EXISTS auto_result jsonb",
  "ALTER TABLE moderation_records ADD COLUMN IF NOT EXISTS auto_status int",
  "ALTER TABLE moderation_records ADD COLUMN IF NOT EXISTS reviewer_id text",
  "ALTER TABLE moderation_records ADD COLUMN IF NOT EXISTS reviewed_at timestamptz",
  "ALTER TABLE moderation_records ADD COLUMN IF NOT EXISTS review_comment text",
  "ALTER TABLE moderation_records ADD COLUMN IF NOT EXISTS final_status int",

  // live_rooms
  "ALTER TABLE live_rooms ADD COLUMN IF NOT EXISTS post_id text",
  "ALTER TABLE live_rooms ADD COLUMN IF NOT EXISTS push_url text DEFAULT ''",
  "ALTER TABLE live_rooms ADD COLUMN IF NOT EXISTS pull_url text DEFAULT ''",
  "ALTER TABLE live_rooms ADD COLUMN IF NOT EXISTS comment_count int DEFAULT 0",
  "ALTER TABLE live_rooms ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()",

  // live_messages — service 用 integer type
  "ALTER TABLE live_messages ALTER COLUMN type TYPE int USING type::int",
  "ALTER TABLE live_messages ADD COLUMN IF NOT EXISTS gift_id text",
  "ALTER TABLE live_messages ADD COLUMN IF NOT EXISTS amount int DEFAULT 0",

  // collections — service 用 user_id, name
  "ALTER TABLE collections ADD COLUMN IF NOT EXISTS user_id text",
  "UPDATE collections SET user_id = author_id WHERE user_id IS NULL",
  "ALTER TABLE collections ADD COLUMN IF NOT EXISTS name varchar(100)",
  "UPDATE collections SET name = title WHERE name IS NULL",
  "ALTER TABLE collections ADD COLUMN IF NOT EXISTS note text DEFAULT ''",
  "ALTER TABLE collections ADD COLUMN IF NOT EXISTS type int DEFAULT 1",
  "ALTER TABLE collections ADD COLUMN IF NOT EXISTS visibility int DEFAULT 0",

  // collection_posts
  "ALTER TABLE collection_posts ADD COLUMN IF NOT EXISTS note text DEFAULT ''",
  "ALTER TABLE collection_posts ADD COLUMN IF NOT EXISTS deleted_at timestamptz",

  // collection_tags — service 用 tag_id
  "ALTER TABLE collection_tags ADD COLUMN IF NOT EXISTS tag_id text",
  "ALTER TABLE collection_tags ADD COLUMN IF NOT EXISTS deleted_at timestamptz",

  // orders
  "ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_no varchar(50)",

  // rankings — service 用 integer target_type
  "ALTER TABLE rankings ALTER COLUMN target_type TYPE int USING target_type::int",

  // carts
  "ALTER TABLE carts ADD COLUMN IF NOT EXISTS deleted_at timestamptz",

  // must_see_list — service 用 post_id, created_by, integer target_type
  "ALTER TABLE must_see_list ALTER COLUMN target_type TYPE int USING target_type::int",
  "ALTER TABLE must_see_list ADD COLUMN IF NOT EXISTS post_id text",
  "UPDATE must_see_list SET post_id = target_id WHERE post_id IS NULL",
  "ALTER TABLE must_see_list ADD COLUMN IF NOT EXISTS created_by text",
  "UPDATE must_see_list SET created_by = added_by WHERE created_by IS NULL",
  "ALTER TABLE must_see_list ADD COLUMN IF NOT EXISTS reason text",
  "ALTER TABLE must_see_list ADD COLUMN IF NOT EXISTS start_time timestamptz",
  "ALTER TABLE must_see_list ADD COLUMN IF NOT EXISTS end_time timestamptz",

  // audit_logs — service 用 detail, integer target_type
  "ALTER TABLE audit_logs ALTER COLUMN target_type TYPE int USING target_type::int",
  "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS detail text",
  "UPDATE audit_logs SET detail = description WHERE detail IS NULL",

  // login_attempts — service 用 ip_address, attempt_time
  "ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS attempt_time timestamptz",
  "UPDATE login_attempts SET attempt_time = created_at WHERE attempt_time IS NULL",
  "ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS ip_address varchar(45)",
  "UPDATE login_attempts SET ip_address = ip WHERE ip_address IS NULL",

  // ip_blacklist — service 用 ip_address
  "ALTER TABLE ip_blacklist ADD COLUMN IF NOT EXISTS ip_address varchar(45)",
  "UPDATE ip_blacklist SET ip_address = ip WHERE ip_address IS NULL",

  // campaigns
  "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target int DEFAULT 1",
];

export async function runColumnMigration() {
  console.log('Running column migration to align schema with service layer...');
  let applied = 0;
  for (const sql of COLUMN_MIGRATIONS) {
    try {
      await pg.query(sql);
      applied++;
    } catch (err) {
      // IF NOT EXISTS 应该不会报错，但安全起见 catch
      if (!err.message.includes('already exists')) {
        console.warn('  Migration warning:', err.message);
      }
    }
  }
  console.log(`Column migration complete (${applied} statements applied)`);
}
