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

    // 先清除所有现有表（开发环境）
    if (process.env.NODE_ENV !== 'production') {
      const tables = [
        'user_achievements', 'user_campaign_progress', 'achievements', 'campaigns',
        'must_see_list', 'audit_logs', 'feedbacks',
        'live_messages', 'live_rooms', 'live_gifts',
        'collection_tags', 'collection_posts', 'collections',
        'favorites', 'favorite_folders',
        'subscriptions',
        'notifications',
        'messages', 'conversation_participants', 'conversations',
        'asset_transactions', 'user_assets', 'asset_types', 'user_contributions',
        'user_blocks', 'user_relationships',
        'moderation_records', 'moderation_rules',
        'comments', 'post_tags', 'posts', 'tags', 'sections',
        'products', 'orders', 'order_items', 'carts', 'redemptions',
        'rankings', 'announcements',
        'api_audit_logs', 'user_action_traces', 'ai_memories', 'api_keys', 'ai_profiles', 'ai_platform_configs',
        'sys_config', 'users', 'user_settings', 'user_roles', 'revoked_tokens', 'audit_logs', 'asset_rules',
        'dict_items', 'dict_types',
        'risk_assessments', 'device_blacklist', 'ip_blacklist', 'login_attempts',
        'user_themes', 'themes',
        'file_metadata',
        'hot_topics', 'post_hot_affiliations', 'post_rewards', 'post_reports',
        'drive_tags', 'ai_sessions', 'community_norms',
        'prompt_steps', 'prompt_flows', 'ai_onboarding_sessions',
      ];
      for (const table of tables) {
        try {
          await conn.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        } catch (e) {
          // 忽略删除失败（表可能不存在）
        }
      }
      console.log('Dropped existing tables');
    }

    // ========== 1. 核心内容模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id varchar(50) PRIMARY KEY,
        visible_id varchar(32) UNIQUE,
        user_id varchar(50) NOT NULL,
        title varchar(200) NOT NULL,
        summary varchar(500),
        content text,
        cover_image varchar(500),
        images jsonb,
        type smallint NOT NULL DEFAULT 1,
        original_type smallint NOT NULL DEFAULT 0,
        original_post_id varchar(50),
        source_url varchar(500),
        source_author varchar(100),
        section_id varchar(50),
        tags jsonb,
        status varchar(20) NOT NULL DEFAULT 'published',
        view_count int NOT NULL DEFAULT 0,
        like_count int NOT NULL DEFAULT 0,
        dislike_count int NOT NULL DEFAULT 0,
        favorite_count int NOT NULL DEFAULT 0,
        comment_count int NOT NULL DEFAULT 0,
        share_count int NOT NULL DEFAULT 0,
        hot_score numeric(10,4) DEFAULT 0,
        is_sticky smallint NOT NULL DEFAULT 0,
        is_hot boolean NOT NULL DEFAULT false,
        is_essence boolean NOT NULL DEFAULT false,
        is_top boolean NOT NULL DEFAULT false,
        is_recommended boolean NOT NULL DEFAULT false,
        scheduled_publish_at timestamp,
        published_at timestamp,
        author_id varchar(50),
        author_name varchar(50),
        author_avatar varchar(200),
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
        post_id varchar(50) NOT NULL,
        user_id varchar(50) NOT NULL,
        parent_id varchar(50),
        root_id varchar(50),
        content text NOT NULL,
        images jsonb,
        type smallint NOT NULL DEFAULT 1,
        like_count int NOT NULL DEFAULT 0,
        dislike_count int NOT NULL DEFAULT 0,
        reply_count int NOT NULL DEFAULT 0,
        is_author boolean NOT NULL DEFAULT false,
        is_top boolean NOT NULL DEFAULT false,
        is_essence boolean NOT NULL DEFAULT false,
        reply_to_user_id varchar(50),
        reply_to_username varchar(50),
        author_id varchar(50),
        author_name varchar(50),
        author_avatar varchar(200),
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
        id text PRIMARY KEY,
        username varchar(50) NOT NULL UNIQUE,
        email varchar(100) UNIQUE,
        password_hash text NOT NULL,
        avatar text,
        bio text DEFAULT '',
        is_ai boolean DEFAULT false,
        ai_likelihood numeric(5,2) DEFAULT 0,
        role varchar(20) DEFAULT 'user',
        trust_level int DEFAULT 0,
        status smallint NOT NULL DEFAULT 1,
        follower_count int NOT NULL DEFAULT 0,
        following_count int NOT NULL DEFAULT 0,
        post_count int NOT NULL DEFAULT 0,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW(),
        deleted_at timestamptz
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
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
        id varchar(50) PRIMARY KEY,
        user_id text NOT NULL,
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
        id varchar(50) PRIMARY KEY,
        user_id varchar(50) NOT NULL,
        target_id varchar(50) NOT NULL,
        target_user_id varchar(50),
        type smallint NOT NULL DEFAULT 1,
        status smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_user_relationships_user_id ON user_relationships(user_id)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_user_relationships_target_id ON user_relationships(target_id)`);
    console.log('[OK] user_relationships');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        id varchar(50) PRIMARY KEY,
        user_id varchar(50) NOT NULL,
        target_user_id varchar(50),
        blocked_user_id varchar(50) NOT NULL,
        reason varchar(200),
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp,
        UNIQUE (user_id, blocked_user_id)
      );
    `);
    console.log('[OK] user_blocks');

    // ========== 4. 通知模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id varchar(50) PRIMARY KEY,
        user_id varchar(50) NOT NULL,
        type varchar(30) NOT NULL,
        title varchar(200),
        content text,
        source_id varchar(50),
        source_type varchar(30),
        source_user_id varchar(50),
        target_type int,
        target_id text,
        is_read smallint NOT NULL DEFAULT 0,
        read_at timestamptz,
        deleted_at timestamptz,
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
        type smallint NOT NULL DEFAULT 1,
        name varchar(100),
        last_message_id varchar(50),
        last_message_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    console.log('[OK] conversations');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id varchar(50) PRIMARY KEY,
        conversation_id varchar(50) NOT NULL,
        user_id varchar(50) NOT NULL,
        last_read_at timestamp,
        unread_count int NOT NULL DEFAULT 0,
        joined_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (conversation_id, user_id)
      );
    `);
    console.log('[OK] conversation_participants');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id varchar(50) PRIMARY KEY,
        conversation_id varchar(50) NOT NULL,
        sender_id varchar(50) NOT NULL,
        content text NOT NULL,
        type smallint NOT NULL DEFAULT 1,
        is_read smallint NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`);
    console.log('[OK] messages');

    // ========== 7. 收藏模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS favorite_folders (
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
        target_id varchar(100) NOT NULL,
        target_type smallint NOT NULL,
        rule_id varchar(50),
        status smallint NOT NULL DEFAULT 0,
        moderator_id varchar(50),
        reason varchar(500),
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] moderation_records');

    // ========== 9. 反馈模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id varchar(50) PRIMARY KEY,
        user_id varchar(50) NOT NULL,
        type smallint NOT NULL,
        title varchar(200) NOT NULL,
        content text NOT NULL,
        status smallint NOT NULL DEFAULT 0,
        admin_reply text,
        replied_by varchar(50),
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
        post_id varchar(50) NOT NULL,
        reason varchar(200),
        sort_order int NOT NULL DEFAULT 0,
        start_time timestamp,
        end_time timestamp,
        created_by varchar(50) NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    console.log('[OK] must_see_list');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id varchar(50) PRIMARY KEY,
        title varchar(200) NOT NULL,
        content text NOT NULL,
        type smallint NOT NULL DEFAULT 1,
        priority int NOT NULL DEFAULT 0,
        start_time timestamp,
        end_time timestamp,
        is_sticky smallint NOT NULL DEFAULT 0,
        created_by varchar(50) NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at timestamp
      );
    `);
    console.log('[OK] announcements');

    // ========== 12. 合集模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id varchar(50) PRIMARY KEY,
        user_id varchar(50) NOT NULL,
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
        order_no varchar(50) NOT NULL UNIQUE,
        user_id bigint NOT NULL,
        total_amount numeric(10,2) NOT NULL DEFAULT 0,
        total_points int NOT NULL DEFAULT 0,
        status varchar(20) NOT NULL DEFAULT 'pending',
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
        user_id varchar(50) NOT NULL,
        title varchar(200) NOT NULL,
        cover_image varchar(200),
        status varchar(20) NOT NULL DEFAULT 'live',
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
        id varchar(50) PRIMARY KEY,
        room_id varchar(50) NOT NULL,
        user_id varchar(50) NOT NULL,
        content text NOT NULL,
        type smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_live_messages_room_id ON live_messages(room_id)`);
    console.log('[OK] live_messages');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS live_gifts (
        id varchar(50) PRIMARY KEY,
        name varchar(50) NOT NULL,
        icon varchar(20),
        price numeric(10,2) NOT NULL DEFAULT 0,
        points_price int NOT NULL DEFAULT 0,
        asset_type_id int NOT NULL DEFAULT 1,
        sort_order int NOT NULL DEFAULT 0,
        status smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] live_gifts');

    // ========== 15. 活动与成就模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
        user_id varchar(50) NOT NULL,
        campaign_id varchar(50) NOT NULL,
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
        name varchar(100) NOT NULL,
        description varchar(500),
        preview_image varchar(200),
        type smallint NOT NULL DEFAULT 1,
        config jsonb,
        price numeric(10,2) NOT NULL DEFAULT 0,
        points_price int NOT NULL DEFAULT 0,
        is_default smallint NOT NULL DEFAULT 0,
        sort_order int NOT NULL DEFAULT 0,
        status smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[OK] themes');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_themes (
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
        user_id varchar(50) NOT NULL UNIQUE,
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
        id varchar(50) PRIMARY KEY,
        ai_user_id varchar(50) NOT NULL,
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
        id varchar(50) PRIMARY KEY,
        user_id varchar(50) NOT NULL,
        key_hash char(60) NOT NULL,
        prefix varchar(10) NOT NULL,
        permissions jsonb,
        rate_limit_per_minute int DEFAULT 60,
        last_used_at timestamp,
        expires_at timestamp,
        status smallint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`);
    console.log('[OK] api_keys');

    // ========== 18. 安全模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
        ip_address varchar(45) NOT NULL UNIQUE,
        reason varchar(200),
        blocked_by varchar(50),
        blocked_at timestamptz DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at timestamp
      );
    `);
    console.log('[OK] ip_blacklist');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS device_blacklist (
        id varchar(50) PRIMARY KEY,
        device_fingerprint varchar(200) NOT NULL UNIQUE,
        reason varchar(200),
        blocked_by varchar(50),
        blocked_at timestamptz DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at timestamp
      );
    `);
    console.log('[OK] device_blacklist');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
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
        id varchar(50) PRIMARY KEY,
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

    // ========== 21. 热点话题模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS hot_topics (
        id varchar(50) PRIMARY KEY,
        title varchar(200) NOT NULL,
        description varchar(500),
        heat_score numeric(10,4) DEFAULT 0,
        status smallint NOT NULL DEFAULT 1,
        deleted_at timestamptz,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_hot_topics_status ON hot_topics(status)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_hot_topics_heat_score ON hot_topics(heat_score)`);
    console.log('[OK] hot_topics');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS post_hot_affiliations (
        id varchar(50) PRIMARY KEY,
        post_id bigint NOT NULL,
        hot_topic_id varchar(50) NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (post_id, hot_topic_id)
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_post_hot_affiliations_post_id ON post_hot_affiliations(post_id)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_post_hot_affiliations_topic_id ON post_hot_affiliations(hot_topic_id)`);
    console.log('[OK] post_hot_affiliations');

    // ========== 打赏模块 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS post_rewards (
        id varchar(50) PRIMARY KEY,
        post_id varchar(50) NOT NULL,
        user_id varchar(50) NOT NULL,
        amount numeric(10,2) NOT NULL DEFAULT 0,
        asset_type_id int NOT NULL DEFAULT 1,
        message varchar(200),
        created_at timestamptz NOT NULL DEFAULT NOW()
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_post_rewards_post_id ON post_rewards(post_id)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_post_rewards_user_id ON post_rewards(user_id)`);
    console.log('[OK] post_rewards');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS post_reports (
        id varchar(50) PRIMARY KEY,
        post_id varchar(50) NOT NULL,
        user_id varchar(50) NOT NULL,
        reason varchar(200) NOT NULL,
        description text,
        status smallint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON post_reports(post_id)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_post_reports_user_id ON post_reports(user_id)`);
    console.log('[OK] post_reports');

    // ========== 22. 系统配置 ==========

    await conn.query(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        token text PRIMARY KEY,
        revoked_at timestamptz DEFAULT NOW()
      );
    `);
    console.log('[OK] revoked_tokens');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id varchar(50) PRIMARY KEY,
        operator_id varchar(50) NOT NULL,
        operator_name varchar(50),
        action varchar(100) NOT NULL,
        target_type int,
        target_id varchar(100),
        detail text,
        ip varchar(45),
        created_at timestamptz NOT NULL DEFAULT NOW()
      );
    `);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_operator ON audit_logs(operator_id)`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`);
    console.log('[OK] audit_logs');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS asset_rules (
        id varchar(50) PRIMARY KEY,
        name varchar(100) NOT NULL,
        description varchar(200),
        event_type varchar(50) NOT NULL,
        conditions jsonb DEFAULT '{}',
        rewards jsonb DEFAULT '{}',
        status smallint NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );
    `);
    console.log('[OK] asset_rules');

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
  // users — 新表使用 password_hash（对齐 service 层 passwordHash → toSnakeCase → password_hash）
  // 旧表可能使用 password 列名，需要补齐 password_hash 并迁移数据
  // 以下迁移补齐旧表与新表的差异列
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_level int DEFAULT 0",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_level_name varchar(50) DEFAULT ''",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text DEFAULT ''",
  // 若旧表有 password 但无 password_hash，则补列（数据需迁移）
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text",
  "UPDATE users SET password_hash = password WHERE password_hash IS NULL AND password IS NOT NULL",
  // status 列：service 层使用 status (smallint default 1)
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS status smallint NOT NULL DEFAULT 1",

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

  // notifications — service 用 integer type/is_read, source_user_id, target_type, target_id, related_id, read_at
  "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_user_id text",
  "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_type int",
  "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_id text",
  "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id text",
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

  // subscriptions
  "CREATE TABLE IF NOT EXISTS subscriptions (id text PRIMARY KEY, user_id text NOT NULL, type varchar(20) NOT NULL, target_id text NOT NULL, target_name varchar(100), status varchar(20) DEFAULT 'active', notification_settings jsonb DEFAULT '{}', created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW(), cancelled_at timestamptz, UNIQUE (user_id, type, target_id))",
  "CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, status)",
  "CREATE INDEX IF NOT EXISTS idx_subscriptions_target ON subscriptions(target_id, type, status)",
  "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS target_name varchar(100)",

  // api_keys — name 字段用于用户自定义密钥名称
  "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS name varchar(50)",

  // api_keys — 修复 user_id 类型 (bigint → varchar) 与 users.id 保持一致
  "ALTER TABLE api_keys ALTER COLUMN user_id TYPE varchar(50)",

  // ========== 23. 性能索引补充（R7 P0） ==========

  // api_keys — key_hash 索引：API Key 认证高频查询路径
  "CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)",

  // user_assets — 复合索引：按用户+资产类型查询
  "CREATE INDEX IF NOT EXISTS idx_user_assets_user_type ON user_assets(user_id, asset_type_id)",

  // ai_profiles — user_id 已有 UNIQUE 约束隐含索引，显式补加以防万一
  "CREATE INDEX IF NOT EXISTS idx_ai_profiles_user_id ON ai_profiles(user_id)",

  // ai_platform_configs — AI 用户平台配置表
  "CREATE TABLE IF NOT EXISTS ai_platform_configs (id text PRIMARY KEY, user_id text NOT NULL, platform varchar(50) NOT NULL, api_key_hash text NOT NULL, api_base_url varchar(500), model_name varchar(100), extra_config jsonb, status int DEFAULT 1, created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW())",
  "CREATE INDEX IF NOT EXISTS idx_ai_platform_configs_user ON ai_platform_configs(user_id)",

  // user_action_traces — 用户行为追踪表
  "CREATE TABLE IF NOT EXISTS user_action_traces (id text PRIMARY KEY, user_id text NOT NULL, post_id text, target_user_id text, action_type varchar(50) NOT NULL, metadata jsonb, amount numeric(10,2) DEFAULT 0, reason varchar(500), session_duration int, cycle_id varchar(30), created_at timestamptz DEFAULT NOW())",
  "CREATE INDEX IF NOT EXISTS idx_user_action_traces_user ON user_action_traces(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_user_action_traces_post ON user_action_traces(post_id)",
  "CREATE INDEX IF NOT EXISTS idx_user_action_traces_type ON user_action_traces(action_type)",
  "CREATE INDEX IF NOT EXISTS idx_user_action_traces_created ON user_action_traces(created_at)",
  "ALTER TABLE user_action_traces ADD COLUMN IF NOT EXISTS cycle_id varchar(30)",
  "CREATE INDEX IF NOT EXISTS idx_user_action_traces_cycle ON user_action_traces(cycle_id)",

  // api_audit_logs — API 审计日志表
  "CREATE TABLE IF NOT EXISTS api_audit_logs (id text PRIMARY KEY, user_id text NOT NULL, api_key_id text, endpoint varchar(200) NOT NULL, method varchar(10) NOT NULL, request_params jsonb, response_status int NOT NULL, duration_ms int, created_at timestamptz DEFAULT NOW())",
  "CREATE INDEX IF NOT EXISTS idx_api_audit_user ON api_audit_logs(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_api_audit_created ON api_audit_logs(created_at)",

  // ========== 24. Phase 1 前置：驱动/狂热/调度/规范 ==========

  // ai_profiles — 驱动系统 4 列
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS drive_id varchar(30)",
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS drive_text text",
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS drive_options jsonb",
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS drive_confirmed_at timestamptz",

  // ai_profiles — 狂热系统 3 列（占位，不做动态计算）
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS fervor_score int DEFAULT 50",
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS fervor_level smallint DEFAULT 2",
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS fervor_updated_at timestamptz",

  // ai_profiles — 修复 user_id 类型 (bigint → varchar) 与 users.id 保持一致
  "ALTER TABLE ai_profiles ALTER COLUMN user_id TYPE varchar(50)",

  // ai_memories — 修复 ai_user_id 类型 (bigint → varchar) 与 users.id 保持一致
  "ALTER TABLE ai_memories ALTER COLUMN ai_user_id TYPE varchar(50)",

  // drive_tags — 驱动标签配置表（开放可配置）
  "CREATE TABLE IF NOT EXISTS drive_tags (id varchar(30) PRIMARY KEY, name varchar(50) NOT NULL, description text, tier smallint DEFAULT 2, is_active boolean DEFAULT TRUE, created_at timestamptz DEFAULT NOW())",

  // ai_sessions — 行为调度器会话表
  "CREATE TABLE IF NOT EXISTS ai_sessions (id varchar(30) PRIMARY KEY, ai_user_id varchar(30) REFERENCES users(id), status smallint DEFAULT 0, callback_url varchar(500), last_heartbeat timestamptz, activated_at timestamptz, deactivated_at timestamptz)",
  "CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_sessions(ai_user_id)",
  "CREATE INDEX IF NOT EXISTS idx_ai_sessions_status ON ai_sessions(status)",

  // community_norms — 社区规范规则表
  "CREATE TABLE IF NOT EXISTS community_norms (id varchar(30) PRIMARY KEY, norm_id varchar(50) UNIQUE NOT NULL, rule text NOT NULL, check_type varchar(50), is_active boolean DEFAULT TRUE, created_at timestamptz DEFAULT NOW())",

  // file_metadata — 多尺寸图片 variants 字段 (R14)
  "ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS variants jsonb",

  // ========== R15.6: AI 注册重做与入驻会话 ==========

  // ai_profiles — 入驻完成状态
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false",

  // ai_onboarding_sessions — AI 入驻会话状态机表
  "CREATE TABLE IF NOT EXISTS ai_onboarding_sessions (id varchar(50) PRIMARY KEY, user_id varchar(50) NOT NULL UNIQUE, status varchar(30) NOT NULL DEFAULT 'pending', user_prompt text, llm_response jsonb, selected_name varchar(50), selected_direction varchar(100), completed_at timestamptz, expires_at timestamptz, created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW())",
  "CREATE INDEX IF NOT EXISTS idx_ai_onboarding_user ON ai_onboarding_sessions(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_ai_onboarding_status ON ai_onboarding_sessions(status)",

  // prompt_flows — 提示词流程定义表
  "CREATE TABLE IF NOT EXISTS prompt_flows (id varchar(30) PRIMARY KEY, flow_key varchar(100) NOT NULL UNIQUE, name varchar(100) NOT NULL, description text, version int DEFAULT 1, is_active boolean DEFAULT true, config jsonb, created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW())",
  "CREATE INDEX IF NOT EXISTS idx_prompt_flows_key ON prompt_flows(flow_key)",
  // prompt_steps — 提示词步骤定义表
  "CREATE TABLE IF NOT EXISTS prompt_steps (id varchar(30) PRIMARY KEY, flow_id varchar(30) NOT NULL REFERENCES prompt_flows(id), step_key varchar(50) NOT NULL, step_order int NOT NULL, role varchar(20) DEFAULT 'user', content text, prompt_template text, name varchar(100), output_format varchar(20), output_schema jsonb, fallback_strategy varchar(20), is_required boolean DEFAULT true, variables jsonb DEFAULT '[]', llm_config jsonb, is_active boolean DEFAULT true, created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW())",
  "CREATE INDEX IF NOT EXISTS idx_prompt_steps_flow ON prompt_steps(flow_id)",
  "CREATE INDEX IF NOT EXISTS idx_prompt_steps_order ON prompt_steps(flow_id, step_order)",
  // prompt_flows — 补充 config 列（已存在数据库）
  "ALTER TABLE prompt_flows ADD COLUMN IF NOT EXISTS config jsonb",
  // prompt_flows — 扩展 flow_key 长度
  "ALTER TABLE prompt_flows ALTER COLUMN flow_key TYPE varchar(100)",
  // prompt_steps — 补充新列（已存在数据库）
  "ALTER TABLE prompt_steps ADD COLUMN IF NOT EXISTS content text",
  "ALTER TABLE prompt_steps ADD COLUMN IF NOT EXISTS output_format varchar(20)",
  "ALTER TABLE prompt_steps ADD COLUMN IF NOT EXISTS output_schema jsonb",
  "ALTER TABLE prompt_steps ADD COLUMN IF NOT EXISTS fallback_strategy varchar(20)",
  "ALTER TABLE prompt_steps ADD COLUMN IF NOT EXISTS is_required boolean DEFAULT true",
  // prompt_steps — 迁移 prompt_template → content
  "UPDATE prompt_steps SET content = prompt_template WHERE content IS NULL AND prompt_template IS NOT NULL",

  // ========== 25. 修复 user_id 类型：bigint → text，对齐 users.id = text ==========
  // AI 注册使用 generateId() 生成 text 类型 ID，旧表 user_id 为 bigint 导致类型不匹配 500

  // user_assets — user_id bigint → text
  "ALTER TABLE user_assets ALTER COLUMN user_id TYPE text",

  // asset_transactions — user_id bigint → text
  "ALTER TABLE asset_transactions ALTER COLUMN user_id TYPE text",

  // favorite_folders — user_id bigint → text
  "ALTER TABLE favorite_folders ALTER COLUMN user_id TYPE text",

  // favorites — user_id bigint → text
  "ALTER TABLE favorites ALTER COLUMN user_id TYPE text",

  // user_achievements — user_id bigint → text
  "ALTER TABLE user_achievements ALTER COLUMN user_id TYPE text",

  // user_themes — user_id bigint → text
  "ALTER TABLE user_themes ALTER COLUMN user_id TYPE text",

  // carts — user_id bigint → text
  "ALTER TABLE carts ALTER COLUMN user_id TYPE text",

  // orders — user_id bigint → text
  "ALTER TABLE orders ALTER COLUMN user_id TYPE text",

  // risk_assessments — user_id bigint → text
  "ALTER TABLE risk_assessments ALTER COLUMN user_id TYPE text",

  // file_metadata — user_id bigint → text
  "ALTER TABLE file_metadata ALTER COLUMN user_id TYPE text",

  // user_blocks — 补齐 target_user_id / blocked_user_id 类型
  "ALTER TABLE user_blocks ALTER COLUMN target_user_id TYPE text",
  "ALTER TABLE user_blocks ALTER COLUMN blocked_user_id TYPE text",

  // favorites — folder_id bigint → text（收藏夹 ID 也是 text 类型）
  "ALTER TABLE favorites ALTER COLUMN folder_id TYPE text USING folder_id::text",

  // ========== R16: AI LLM 调用日志表 ==========
  "CREATE TABLE IF NOT EXISTS ai_llm_logs (id text PRIMARY KEY, ai_user_id text NOT NULL, call_type varchar(30) NOT NULL, platform varchar(50) NOT NULL, model varchar(100) NOT NULL, request_messages jsonb NOT NULL, request_tokens int, response_content text, response_parsed jsonb, response_tokens int, duration_ms int NOT NULL, status varchar(20) NOT NULL, error_message text, created_at timestamptz DEFAULT NOW())",
  "CREATE INDEX IF NOT EXISTS idx_ai_llm_logs_user ON ai_llm_logs(ai_user_id)",
  "CREATE INDEX IF NOT EXISTS idx_ai_llm_logs_type ON ai_llm_logs(call_type)",
  "CREATE INDEX IF NOT EXISTS idx_ai_llm_logs_created ON ai_llm_logs(created_at)",

  // ========== R16: ai_profiles 身份上下文补全 ==========
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS user_prompt text",
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS name_candidates jsonb",
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS direction_candidates jsonb",
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS registered_platform varchar(50)",
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS registered_model varchar(100)",
  "ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS registered_at timestamptz",

  // ========== R16: ai_sessions 扩展字段 ==========
  "ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS socket_id varchar(50)",
  "ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS interval_ms int",
  "ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS consecutive_failures int DEFAULT 0",
  "ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS total_actions int DEFAULT 0",
  "ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS total_cycles int DEFAULT 0",
  "ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS last_success_at timestamptz",
  "ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS last_error_at timestamptz",
  "ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS last_error_message text",
  // R17: nextCycleHint 持久化（AI 活跃循环行为连续性）
  "ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS next_cycle_hint text",

  // ========== Phase 3: P3-T6 API 参考帖子 ==========
  "ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_api_reference boolean DEFAULT false",
  "ALTER TABLE posts ADD COLUMN IF NOT EXISTS api_version varchar(20)",
  "ALTER TABLE posts ADD COLUMN IF NOT EXISTS api_endpoint varchar(255)",

  // ========== Phase 3: P3-T3 社区规范公告 ==========
  "ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_announcement boolean DEFAULT false",
  "ALTER TABLE posts ADD COLUMN IF NOT EXISTS announcement_priority int DEFAULT 0",

  // ========== Phase 3: P3-T5 AI 记忆增强（扩展现有 ai_memories） ==========
  // 现有表结构: ai_user_id, content, type, importance
  // 扩展: context_type, memory_key, memory_value, context_id, size_bytes, ttl
  "ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS context_type varchar(50)",
  "ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS memory_key varchar(200)",
  "ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS memory_value jsonb",
  "ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS context_id text",
  "ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS size_bytes int DEFAULT 0",
  "ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS ttl int",
  "ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()",

  // ========== Phase 3: P3-T5 AI 记忆标签表 ==========
  `CREATE TABLE IF NOT EXISTS ai_memory_tags (
    id text PRIMARY KEY,
    memory_id text NOT NULL REFERENCES ai_memories(id) ON DELETE CASCADE,
    tag varchar(100) NOT NULL,
    created_at timestamptz DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ai_memory_tags_memory ON ai_memory_tags(memory_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ai_memory_tags_tag ON ai_memory_tags(tag)`,

  // ========== Phase 3: TD-1 关键词迁移到数据库 ==========
  `CREATE TABLE IF NOT EXISTS community_norm_keywords (
    id text PRIMARY KEY,
    category varchar(50) NOT NULL DEFAULT 'banned',
    keyword varchar(200) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_norm_keywords_category ON community_norm_keywords(category)`,
  `CREATE INDEX IF NOT EXISTS idx_norm_keywords_active ON community_norm_keywords(is_active)`,
  // 迁移硬编码关键词到数据库
  `INSERT INTO community_norm_keywords (id, category, keyword, is_active) VALUES
    ('kw_1', 'banned', '傻逼', true),
    ('kw_2', 'banned', '垃圾', true),
    ('kw_3', 'banned', '去死', true),
    ('kw_4', 'banned', '白痴', true),
    ('kw_5', 'banned', '废物', true),
    ('kw_6', 'banned', '弱智', true)
  ON CONFLICT (id) DO NOTHING`,

  // ========== Phase 3: TD-2 供应方绑定 ==========
  "ALTER TABLE ai_platform_configs ADD COLUMN IF NOT EXISTS provider_name varchar(50)",

  // ========== R18: 历史枚举/布尔字段兼容收敛 ==========
  `ALTER TABLE posts
    ALTER COLUMN status TYPE varchar(20) USING CASE
      WHEN status::text IN ('0', 'draft') THEN 'draft'
      WHEN status::text IN ('1', 'pending_review') THEN 'pending_review'
      WHEN status::text IN ('2', 'published') THEN 'published'
      WHEN status::text IN ('3', 'rejected') THEN 'rejected'
      ELSE COALESCE(NULLIF(status::text, ''), 'published')
    END,
    ALTER COLUMN is_hot TYPE boolean USING CASE
      WHEN is_hot::text IN ('1', 'true', 't', 'yes', 'y') THEN true
      ELSE false
    END,
    ALTER COLUMN is_top TYPE boolean USING CASE
      WHEN is_top::text IN ('1', 'true', 't', 'yes', 'y') THEN true
      ELSE false
    END,
    ALTER COLUMN is_essence TYPE boolean USING CASE
      WHEN is_essence::text IN ('1', 'true', 't', 'yes', 'y') THEN true
      ELSE false
    END,
    ALTER COLUMN is_recommended TYPE boolean USING CASE
      WHEN is_recommended::text IN ('1', 'true', 't', 'yes', 'y') THEN true
      ELSE false
    END`,
  `ALTER TABLE comments
    ALTER COLUMN is_author TYPE boolean USING CASE
      WHEN is_author::text IN ('1', 'true', 't', 'yes', 'y') THEN true
      ELSE false
    END,
    ALTER COLUMN is_top TYPE boolean USING CASE
      WHEN is_top::text IN ('1', 'true', 't', 'yes', 'y') THEN true
      ELSE false
    END,
    ALTER COLUMN is_essence TYPE boolean USING CASE
      WHEN is_essence::text IN ('1', 'true', 't', 'yes', 'y') THEN true
      ELSE false
    END`,
  `ALTER TABLE orders
    ALTER COLUMN status TYPE varchar(20) USING CASE
      WHEN status::text IN ('1', 'pending') THEN 'pending'
      WHEN status::text IN ('2', 'paid') THEN 'paid'
      WHEN status::text IN ('3', 'completed') THEN 'completed'
      WHEN status::text IN ('4', 'cancelled') THEN 'cancelled'
      ELSE COALESCE(NULLIF(status::text, ''), 'pending')
    END`,
  `ALTER TABLE live_rooms
    ALTER COLUMN status TYPE varchar(20) USING CASE
      WHEN status::text IN ('1', 'pending') THEN 'pending'
      WHEN status::text IN ('2', 'live') THEN 'live'
      WHEN status::text IN ('3', 'ended') THEN 'ended'
      ELSE COALESCE(NULLIF(status::text, ''), 'live')
    END`,
  `ALTER TABLE user_action_traces
    ALTER COLUMN action_type TYPE varchar(50) USING action_type::text`,
  `ALTER TABLE themes
    ALTER COLUMN is_default TYPE boolean USING CASE
      WHEN is_default::text IN ('1', 'true', 't', 'yes', 'y') THEN true
      ELSE false
    END`,
];

export { migrate };

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
