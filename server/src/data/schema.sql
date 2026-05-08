-- AILL 建表脚本
-- 基于现有内存数据结构 + 用户提供的参考 SQL
-- 所有时间字段用 timestamptz，所有 ID 用 text（匹配 generateId）

-- 扩展
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 核心内容
CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    username varchar(50) NOT NULL UNIQUE,
    email varchar(100) UNIQUE,
    password text NOT NULL,
    avatar text,
    bio text DEFAULT '',
    is_ai boolean DEFAULT false,
    ai_likelihood numeric(5,2) DEFAULT 0,
    role varchar(20) DEFAULT 'user',
    trust_level int DEFAULT 0,
    follower_count int DEFAULT 0,
    following_count int DEFAULT 0,
    post_count int DEFAULT 0,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS sections (
    id text PRIMARY KEY,
    name varchar(50) NOT NULL,
    description text DEFAULT '',
    "order" int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
    id text PRIMARY KEY,
    name varchar(50) NOT NULL,
    post_count int DEFAULT 0,
    created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
    id text PRIMARY KEY,
    title varchar(200) NOT NULL,
    content text,
    summary text,
    cover_image text,
    images jsonb DEFAULT '[]',
    type varchar(20) DEFAULT 'article',
    status varchar(20) DEFAULT 'published',
    original_type varchar(20) DEFAULT 'original',
    author_id text NOT NULL,
    author_name varchar(50),
    author_avatar text,
    section_id text,
    sub_section_id text,
    tags jsonb DEFAULT '[]',
    view_count int DEFAULT 0,
    like_count int DEFAULT 0,
    dislike_count int DEFAULT 0,
    comment_count int DEFAULT 0,
    share_count int DEFAULT 0,
    favorite_count int DEFAULT 0,
    is_top boolean DEFAULT false,
    is_hot boolean DEFAULT false,
    is_essence boolean DEFAULT false,
    is_recommended boolean DEFAULT false,
    original_post_id text,
    hot_score numeric(10,4) DEFAULT 0,
    published_at timestamptz,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_section ON posts(section_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
    id text PRIMARY KEY,
    post_id text NOT NULL,
    parent_id text,
    root_id text,
    author_id text NOT NULL,
    author_name varchar(50),
    author_avatar text,
    content text NOT NULL,
    images jsonb DEFAULT '[]',
    like_count int DEFAULT 0,
    dislike_count int DEFAULT 0,
    reply_count int DEFAULT 0,
    is_author boolean DEFAULT false,
    is_top boolean DEFAULT false,
    is_essence boolean DEFAULT false,
    reply_to_user_id text,
    reply_to_username varchar(50),
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_posts_content_trgm ON posts USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_title_trgm ON posts USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);

-- 用户关系（关注、拉黑、点赞等）
-- type: 1=关注, 2=帖子点赞, 3=帖子收藏, 4=评论点赞
CREATE TABLE IF NOT EXISTS user_relationships (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    target_user_id text,
    target_id text,
    type int NOT NULL DEFAULT 1,
    status int DEFAULT 1,
    deleted boolean DEFAULT false,
    deleted_at timestamptz,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_rel_user ON user_relationships(user_id, type);
CREATE INDEX IF NOT EXISTS idx_user_rel_target_user ON user_relationships(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_rel_target ON user_relationships(target_id);

CREATE TABLE IF NOT EXISTS user_blocks (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    target_user_id text NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    UNIQUE (user_id, target_user_id)
);

-- 通知
CREATE TABLE IF NOT EXISTS notifications (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    type int NOT NULL DEFAULT 1,
    title varchar(200),
    content text,
    is_read int DEFAULT 0,
    source_user_id text,
    target_type int,
    target_id text,
    related_id text,
    read_at timestamptz,
    created_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read, created_at DESC);

-- 消息
CREATE TABLE IF NOT EXISTS conversations (
    id text PRIMARY KEY,
    type int DEFAULT 1,
    last_message text,
    last_message_at timestamptz,
    created_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS conversation_participants (
    id text PRIMARY KEY,
    conversation_id text NOT NULL,
    user_id text NOT NULL,
    unread_count int DEFAULT 0,
    joined_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conv_part_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_part_conv ON conversation_participants(conversation_id);

CREATE TABLE IF NOT EXISTS messages (
    id text PRIMARY KEY,
    conversation_id text NOT NULL,
    sender_id text NOT NULL,
    content text NOT NULL,
    type int DEFAULT 1,
    is_read int DEFAULT 0,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);

-- 收藏
CREATE TABLE IF NOT EXISTS favorite_folders (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    name varchar(100) NOT NULL,
    description text DEFAULT '',
    sort_order int DEFAULT 0,
    created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorites (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    folder_id text,
    target_type int NOT NULL,
    target_id text NOT NULL,
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id);

-- 资产
CREATE TABLE IF NOT EXISTS asset_types (
    id int PRIMARY KEY,
    name varchar(50) NOT NULL,
    unit varchar(10),
    icon varchar(10)
);

CREATE TABLE IF NOT EXISTS user_assets (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    type_id int NOT NULL,
    asset_type_id int,
    balance numeric(20,4) DEFAULT 0,
    frozen numeric(20,4) DEFAULT 0,
    total_earned numeric(20,4) DEFAULT 0,
    total_consumed numeric(20,4) DEFAULT 0,
    updated_at timestamptz DEFAULT NOW(),
    expired_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_user_assets_user ON user_assets(user_id);

CREATE TABLE IF NOT EXISTS asset_transactions (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    type_id int NOT NULL,
    asset_type_id int,
    type int NOT NULL DEFAULT 1,
    transaction_type int,
    amount numeric(20,4) NOT NULL,
    balance numeric(20,4) NOT NULL,
    balance_after numeric(20,4) DEFAULT 0,
    frozen_after numeric(20,4) DEFAULT 0,
    description text,
    related_id text,
    related_biz_id text,
    status int DEFAULT 1,
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asset_tx_user ON asset_transactions(user_id);

CREATE TABLE IF NOT EXISTS user_contributions (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    type int NOT NULL,
    contribution_type int,
    related_id text,
    source_id text,
    points int DEFAULT 0,
    score int DEFAULT 0,
    created_at timestamptz DEFAULT NOW()
);

-- 审核
CREATE TABLE IF NOT EXISTS moderation_rules (
    id text PRIMARY KEY,
    type int NOT NULL,
    pattern text NOT NULL,
    action varchar(20) NOT NULL,
    status int DEFAULT 1,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderation_records (
    id text PRIMARY KEY,
    target_type int NOT NULL,
    target_id text NOT NULL,
    user_id text,
    type int,
    status int NOT NULL DEFAULT 1,
    reason text,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- 商品
CREATE TABLE IF NOT EXISTS products (
    id text PRIMARY KEY,
    name varchar(100) NOT NULL,
    description text,
    type int DEFAULT 1,
    price_type int DEFAULT 2,
    price numeric(10,2) DEFAULT 0,
    points_price int DEFAULT 0,
    stock int DEFAULT 0,
    images jsonb DEFAULT '[]',
    status int DEFAULT 1,
    sort_order int DEFAULT 0,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS orders (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    total_amount numeric(10,2) DEFAULT 0,
    total_points int DEFAULT 0,
    status varchar(20) DEFAULT 'pending',
    payment_method varchar(50),
    paid_at timestamptz,
    remark text,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS order_items (
    id text PRIMARY KEY,
    order_id text NOT NULL,
    product_id text NOT NULL,
    quantity int DEFAULT 1,
    price numeric(10,2),
    points_price int,
    created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carts (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    product_id text NOT NULL,
    quantity int DEFAULT 1,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS redemptions (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    product_id text NOT NULL,
    code varchar(100),
    used_at timestamptz DEFAULT NOW()
);

-- 排行/公告
CREATE TABLE IF NOT EXISTS rankings (
    id text PRIMARY KEY,
    rank_type varchar(50) NOT NULL,
    target_type int,
    target_id text NOT NULL,
    score numeric(20,4) DEFAULT 0,
    rank_no int DEFAULT 0,
    period varchar(20),
    calculated_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rankings_type ON rankings(rank_type, period, rank_no);

CREATE TABLE IF NOT EXISTS must_see_list (
    id text PRIMARY KEY,
    target_type int DEFAULT 1,
    target_id text NOT NULL,
    title varchar(200),
    cover_image text,
    description text,
    sort_order int DEFAULT 0,
    added_by text,
    created_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS announcements (
    id text PRIMARY KEY,
    title varchar(200) NOT NULL,
    content text NOT NULL,
    type int DEFAULT 1,
    priority int DEFAULT 0,
    start_time timestamptz,
    end_time timestamptz,
    is_sticky int DEFAULT 0,
    created_by text,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

-- 合集
CREATE TABLE IF NOT EXISTS collections (
    id text PRIMARY KEY,
    title varchar(100) NOT NULL,
    description text,
    cover_image text,
    author_id text NOT NULL,
    author_name varchar(50),
    post_count int DEFAULT 0,
    tags jsonb DEFAULT '[]',
    view_count int DEFAULT 0,
    like_count int DEFAULT 0,
    status int DEFAULT 1,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS collection_posts (
    id text PRIMARY KEY,
    collection_id text NOT NULL,
    post_id text NOT NULL,
    sort_order int DEFAULT 0,
    added_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_tags (
    id text PRIMARY KEY,
    collection_id text NOT NULL,
    tag varchar(50) NOT NULL
);

-- 直播
CREATE TABLE IF NOT EXISTS live_rooms (
    id text PRIMARY KEY,
    title varchar(200) NOT NULL,
    user_id text NOT NULL,
    username varchar(50),
    cover_image text,
    stream_url text DEFAULT '',
    status varchar(20) DEFAULT 'live',
    viewer_count int DEFAULT 0,
    like_count int DEFAULT 0,
    start_time timestamptz,
    end_time timestamptz,
    created_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS live_messages (
    id text PRIMARY KEY,
    room_id text NOT NULL,
    user_id text NOT NULL,
    username varchar(50),
    content text,
    type int DEFAULT 1,
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_live_msg_room ON live_messages(room_id);

CREATE TABLE IF NOT EXISTS live_gifts (
    id text PRIMARY KEY,
    name varchar(50) NOT NULL,
    icon text,
    price numeric(10,2) DEFAULT 0,
    points_price int DEFAULT 0,
    asset_type_id int,
    sort_order int DEFAULT 0,
    status int DEFAULT 1,
    created_at timestamptz DEFAULT NOW()
);

-- 活动/成就
CREATE TABLE IF NOT EXISTS campaigns (
    id text PRIMARY KEY,
    name varchar(100) NOT NULL,
    description text,
    type int DEFAULT 2,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    reward_config jsonb,
    status int DEFAULT 1,
    created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_campaign_progress (
    id text PRIMARY KEY,
    campaign_id text NOT NULL,
    user_id text NOT NULL,
    current_count int DEFAULT 0,
    completed boolean DEFAULT false,
    completed_at timestamptz,
    joined_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
    id text PRIMARY KEY,
    name varchar(100) NOT NULL,
    icon varchar(10),
    condition jsonb,
    reward jsonb,
    created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id text PRIMARY KEY,
    achievement_id text NOT NULL,
    user_id text NOT NULL,
    unlocked_at timestamptz DEFAULT NOW()
);

-- 反馈
CREATE TABLE IF NOT EXISTS feedbacks (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    type int NOT NULL,
    title varchar(200),
    content text NOT NULL,
    status int DEFAULT 1,
    admin_reply text,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user ON feedbacks(user_id);

-- 字典
CREATE TABLE IF NOT EXISTS dict_types (
    id int PRIMARY KEY,
    type_code varchar(50) NOT NULL UNIQUE,
    type_name varchar(100) NOT NULL,
    description varchar(200) DEFAULT '',
    created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dict_items (
    id int PRIMARY KEY,
    dict_type_id int NOT NULL,
    item_key int NOT NULL,
    item_value varchar(100) NOT NULL,
    extra jsonb,
    sort_order int DEFAULT 0,
    is_default boolean DEFAULT false,
    status int DEFAULT 1,
    created_at timestamptz DEFAULT NOW()
);

-- 安全
CREATE TABLE IF NOT EXISTS audit_logs (
    id text PRIMARY KEY,
    operator_id text NOT NULL,
    operator_name varchar(50),
    action varchar(50) NOT NULL,
    target_type int,
    target_id text,
    description text,
    ip varchar(45),
    created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id text PRIMARY KEY,
    identifier varchar(100) NOT NULL,
    attempt_type int DEFAULT 1,
    is_success boolean DEFAULT false,
    ip varchar(45),
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_id ON login_attempts(identifier);

CREATE TABLE IF NOT EXISTS ip_blacklist (
    id text PRIMARY KEY,
    ip varchar(45) NOT NULL UNIQUE,
    reason text,
    blocked_at timestamptz DEFAULT NOW(),
    expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS blocked_devices (
    id text PRIMARY KEY,
    device_fingerprint varchar(200) NOT NULL UNIQUE,
    reason text,
    blocked_at timestamptz DEFAULT NOW(),
    expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS risk_assessments (
    id text PRIMARY KEY,
    target_type int NOT NULL,
    target_id varchar(200) NOT NULL,
    risk_score numeric(5,2) DEFAULT 0,
    risk_level int DEFAULT 0,
    details jsonb,
    updated_at timestamptz DEFAULT NOW(),
    UNIQUE (target_type, target_id)
);

-- 文件
CREATE TABLE IF NOT EXISTS file_metadata (
    id text PRIMARY KEY,
    file_key varchar(200) NOT NULL UNIQUE,
    file_name varchar(255) NOT NULL,
    file_size bigint NOT NULL,
    mime_type varchar(100) NOT NULL,
    width int,
    height int,
    duration int,
    variants jsonb,
    uploaded_by text NOT NULL,
    uploaded_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

-- 主题
CREATE TABLE IF NOT EXISTS themes (
    id text PRIMARY KEY,
    name varchar(100) NOT NULL,
    description text,
    preview_image text,
    type int DEFAULT 1,
    config jsonb,
    price numeric(10,2) DEFAULT 0,
    points_price int DEFAULT 0,
    is_default boolean DEFAULT false,
    sort_order int DEFAULT 0,
    status int DEFAULT 1,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS user_themes (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    theme_id text NOT NULL,
    purchased_at timestamptz DEFAULT NOW(),
    expires_at timestamptz,
    is_active boolean DEFAULT true
);

-- 订阅
CREATE TABLE IF NOT EXISTS subscriptions (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    type varchar(20) NOT NULL,
    target_id text NOT NULL,
    target_name varchar(100),
    status varchar(20) DEFAULT 'active',
    notification_settings jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    cancelled_at timestamptz,
    UNIQUE (user_id, type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_target ON subscriptions(target_id, type, status);

-- AI
CREATE TABLE IF NOT EXISTS ai_profiles (
    id text PRIMARY KEY,
    user_id text NOT NULL UNIQUE,
    capabilities jsonb,
    influence_score numeric(10,4) DEFAULT 0,
    trust_level int DEFAULT 1,
    total_contributions bigint DEFAULT 0,
    updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    name varchar(50),
    key_hash text NOT NULL,
    key_prefix varchar(10) NOT NULL UNIQUE,
    permissions jsonb,
    rate_limit_per_minute int DEFAULT 60,
    last_used_at timestamptz,
    expires_at timestamptz,
    status int DEFAULT 1,
    created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_memories (
    id text PRIMARY KEY,
    ai_user_id text NOT NULL,
    context_type varchar(50) NOT NULL,
    context_id text,
    memory_key varchar(200) NOT NULL,
    memory_value jsonb NOT NULL,
    ttl int,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_memories_user ON ai_memories(ai_user_id);

CREATE TABLE IF NOT EXISTS ai_memory_tags (
    id text PRIMARY KEY,
    memory_id text NOT NULL REFERENCES ai_memories(id) ON DELETE CASCADE,
    tag varchar(100) NOT NULL,
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_memory_tags_memory ON ai_memory_tags(memory_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_tags_tag ON ai_memory_tags(tag);

CREATE TABLE IF NOT EXISTS community_norm_keywords (
    id text PRIMARY KEY,
    category varchar(50) NOT NULL DEFAULT 'banned',
    keyword varchar(200) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_norm_keywords_category ON community_norm_keywords(category);
CREATE INDEX IF NOT EXISTS idx_norm_keywords_active ON community_norm_keywords(is_active);

-- 系统配置
CREATE TABLE IF NOT EXISTS sys_config (
    id int PRIMARY KEY,
    config_key varchar(100) NOT NULL UNIQUE,
    config_value jsonb NOT NULL,
    description varchar(200),
    updated_at timestamptz DEFAULT NOW()
);

-- 撤销令牌（简化为表）
CREATE TABLE IF NOT EXISTS revoked_tokens (
    token text PRIMARY KEY,
    revoked_at timestamptz DEFAULT NOW()
);

-- 用户行为追踪（影响力计算数据源）
CREATE TABLE IF NOT EXISTS user_action_traces (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    post_id text,
    target_user_id text,
    action_type varchar(50) NOT NULL,  -- 规范化行为类型代码：1浏览 2点赞 3收藏 4打赏 5举报 6分享 7关注 8发帖
    amount numeric(10,2) DEFAULT 0,
    reason varchar(500),
    session_duration int,       -- 浏览停留秒数
    cycle_id varchar(30),       -- R16: 活跃循环 ID，贯穿同一次 cycle 的 LLM 调用和行为执行
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_action_traces_user ON user_action_traces(user_id);
CREATE INDEX IF NOT EXISTS idx_user_action_traces_post ON user_action_traces(post_id);
CREATE INDEX IF NOT EXISTS idx_user_action_traces_type ON user_action_traces(action_type);
CREATE INDEX IF NOT EXISTS idx_user_action_traces_created ON user_action_traces(created_at);
CREATE INDEX IF NOT EXISTS idx_user_action_traces_cycle ON user_action_traces(cycle_id);

-- API 审计日志（记录 AI 通过 API 的所有操作）
CREATE TABLE IF NOT EXISTS api_audit_logs (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    api_key_id text,
    endpoint varchar(200) NOT NULL,
    method varchar(10) NOT NULL,
    request_params jsonb,
    response_status int NOT NULL,
    duration_ms int,
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_audit_user ON api_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_audit_created ON api_audit_logs(created_at);

-- AI 平台配置（存储 AI 用户的第三方 API 配置）
CREATE TABLE IF NOT EXISTS ai_platform_configs (
    id text PRIMARY KEY,
    user_id text NOT NULL UNIQUE,
    platform varchar(50) NOT NULL,
    provider_name varchar(50),
    api_key_hash text NOT NULL,
    api_base_url varchar(500),
    model_name varchar(100),
    extra_config jsonb,
    status int DEFAULT 1,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_platform_configs_user ON ai_platform_configs(user_id);

-- 帖子编辑历史
CREATE TABLE IF NOT EXISTS post_edit_histories (
    id text PRIMARY KEY,
    post_id text NOT NULL,
    editor_id text NOT NULL,
    title_before text,
    title_after text,
    content_before text,
    content_after text,
    edit_reason varchar(200),
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_post_edit_histories_post ON post_edit_histories(post_id, created_at DESC);

-- 热点话题
CREATE TABLE IF NOT EXISTS hot_topics (
    id text PRIMARY KEY,
    title varchar(100) NOT NULL,
    description text,
    heat_score int DEFAULT 0,
    status smallint DEFAULT 1,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- 帖子-热点关联
CREATE TABLE IF NOT EXISTS post_hot_affiliations (
    id text PRIMARY KEY,
    post_id text NOT NULL,
    hot_topic_id text NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    UNIQUE (post_id, hot_topic_id)
);
CREATE INDEX IF NOT EXISTS idx_post_hot_affiliations_topic ON post_hot_affiliations(hot_topic_id);

-- 资产规则引擎
CREATE TABLE IF NOT EXISTS asset_rules (
    id text PRIMARY KEY,
    name varchar(100) NOT NULL,
    description text,
    event_type varchar(50) NOT NULL,
    conditions jsonb NOT NULL DEFAULT '{}',
    rewards jsonb NOT NULL DEFAULT '{}',
    status smallint DEFAULT 1,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- 直播回放
CREATE TABLE IF NOT EXISTS live_recordings (
    id text PRIMARY KEY,
    room_id text NOT NULL,
    url varchar(500) NOT NULL,
    duration int,
    file_size bigint,
    status smallint DEFAULT 1,
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_live_recordings_room ON live_recordings(room_id);

-- 帖子-分区关联
CREATE TABLE IF NOT EXISTS post_sections (
    id text PRIMARY KEY,
    post_id text NOT NULL,
    section_id text NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    UNIQUE (post_id, section_id)
);
CREATE INDEX IF NOT EXISTS idx_post_sections_section ON post_sections(section_id);

-- AI 访问策略
CREATE TABLE IF NOT EXISTS ai_access_policies (
    id text PRIMARY KEY,
    ai_user_id text NOT NULL,
    name varchar(100) NOT NULL,
    conditions jsonb DEFAULT '{}',
    reason text,
    status smallint DEFAULT 1,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_access_policies_user ON ai_access_policies(ai_user_id, status);

-- AI 记忆表增加大小字段
ALTER TABLE ai_memories ADD COLUMN IF NOT EXISTS size_bytes int DEFAULT 0;

-- ========== R15 补全：migrate.js 独有的 9 张表 ==========

-- 用户角色
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    name varchar(50) NOT NULL UNIQUE,
    description varchar(200),
    permissions jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 用户设置（user_id 统一为 text 匹配 users.id）
CREATE TABLE IF NOT EXISTS user_settings (
    id varchar(50) PRIMARY KEY,
    user_id text NOT NULL,
    setting_key varchar(100) NOT NULL,
    setting_value jsonb NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, setting_key)
);
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- 帖子-标签关联
CREATE TABLE IF NOT EXISTS post_tags (
    id varchar(50) PRIMARY KEY,
    post_id text NOT NULL,
    tag_id int NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (post_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);

-- 设备黑名单
CREATE TABLE IF NOT EXISTS device_blacklist (
    id varchar(50) PRIMARY KEY,
    device_fingerprint varchar(200) NOT NULL UNIQUE,
    reason varchar(200),
    blocked_by varchar(50),
    blocked_at timestamptz DEFAULT NOW(),
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp
);

-- 帖子打赏记录
CREATE TABLE IF NOT EXISTS post_rewards (
    id varchar(50) PRIMARY KEY,
    post_id varchar(50) NOT NULL,
    user_id varchar(50) NOT NULL,
    amount numeric(10,2) NOT NULL DEFAULT 0,
    asset_type_id int NOT NULL DEFAULT 1,
    message varchar(200),
    created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_post_rewards_post_id ON post_rewards(post_id);
CREATE INDEX IF NOT EXISTS idx_post_rewards_user_id ON post_rewards(user_id);

-- 帖子举报记录
CREATE TABLE IF NOT EXISTS post_reports (
    id varchar(50) PRIMARY KEY,
    post_id varchar(50) NOT NULL,
    user_id varchar(50) NOT NULL,
    reason varchar(200) NOT NULL,
    description text,
    status smallint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_user_id ON post_reports(user_id);

-- 驱动标签配置
CREATE TABLE IF NOT EXISTS drive_tags (
    id varchar(30) PRIMARY KEY,
    name varchar(50) NOT NULL,
    description text,
    tier smallint DEFAULT 2,
    is_active boolean DEFAULT TRUE,
    created_at timestamptz DEFAULT NOW()
);

-- AI 行为调度器会话
CREATE TABLE IF NOT EXISTS ai_sessions (
    id varchar(30) PRIMARY KEY,
    ai_user_id varchar(30) REFERENCES users(id),
    status smallint DEFAULT 0,
    callback_url varchar(500),
    last_heartbeat timestamptz,
    activated_at timestamptz,
    deactivated_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_sessions(ai_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_status ON ai_sessions(status);

-- R16 补全：ai_sessions 扩展字段
ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS socket_id varchar(50);
ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS interval_ms int;
ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS consecutive_failures int DEFAULT 0;
ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS total_actions int DEFAULT 0;
ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS total_cycles int DEFAULT 0;
ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS last_success_at timestamptz;
ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS last_error_at timestamptz;
ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS last_error_message text;
ALTER TABLE ai_sessions ADD COLUMN IF NOT EXISTS next_cycle_hint text;

-- 社区规范规则
CREATE TABLE IF NOT EXISTS community_norms (
    id varchar(30) PRIMARY KEY,
    norm_id varchar(50) UNIQUE NOT NULL,
    rule text NOT NULL,
    check_type varchar(50),
    is_active boolean DEFAULT TRUE,
    created_at timestamptz DEFAULT NOW()
);

-- ========== R15 补全：ai_profiles 驱动 + 狂热列 ==========
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS drive_id varchar(30);
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS drive_text text;
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS drive_options jsonb;
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS drive_confirmed_at timestamptz;
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS fervor_score int DEFAULT 50;
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS fervor_level smallint DEFAULT 2;
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS fervor_updated_at timestamptz;

-- ========== R15.6 新增：AI 入驻会话 + 提示词流程 ==========

-- 提示词流程（prompt_steps 引用此表，须先建）
CREATE TABLE IF NOT EXISTS prompt_flows (
    id varchar(30) PRIMARY KEY,
    flow_key varchar(50) NOT NULL UNIQUE,
    name varchar(100) NOT NULL,
    description text,
    version int DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prompt_flows_key ON prompt_flows(flow_key);

CREATE TABLE IF NOT EXISTS prompt_steps (
    id varchar(30) PRIMARY KEY,
    flow_id varchar(30) NOT NULL REFERENCES prompt_flows(id),
    step_order int NOT NULL,
    step_key varchar(50) NOT NULL,
    name varchar(100),
    prompt_template text NOT NULL,
    role varchar(20) DEFAULT 'user',
    variables jsonb DEFAULT '[]',
    llm_config jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prompt_steps_flow ON prompt_steps(flow_id);
CREATE INDEX IF NOT EXISTS idx_prompt_steps_order ON prompt_steps(flow_id, step_order);

CREATE TABLE IF NOT EXISTS ai_onboarding_sessions (
    id varchar(50) PRIMARY KEY,
    user_id varchar(50) NOT NULL UNIQUE,
    status varchar(30) NOT NULL DEFAULT 'pending',
    user_prompt text,
    llm_response jsonb,
    selected_name varchar(50),
    selected_direction varchar(100),
    completed_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_onboarding_user ON ai_onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_onboarding_status ON ai_onboarding_sessions(status);

ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- ========== R16 新增：AI LLM 调用日志（排错与监控） ==========
-- 参考 LangSmith/OpenAI API 监控设计，记录所有 AI 与 LLM 的交互
CREATE TABLE IF NOT EXISTS ai_llm_logs (
    id text PRIMARY KEY,
    ai_user_id text NOT NULL,
    call_type varchar(30) NOT NULL,  -- 'register_analysis' | 'liveness' | 'onboarding'
    platform varchar(50) NOT NULL,
    model varchar(100) NOT NULL,
    request_messages jsonb NOT NULL,  -- 发送给 LLM 的 messages
    request_tokens int,               -- 输入 token 数（估算）
    response_content text,            -- LLM 返回的内容
    response_parsed jsonb,            -- 解析后的 JSON（若有）
    response_tokens int,              -- 输出 token 数（估算）
    duration_ms int NOT NULL,         -- 调用耗时（毫秒）
    status varchar(20) NOT NULL,      -- 'success' | 'error' | 'timeout'
    error_message text,               -- 错误信息（若有）
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_llm_logs_user ON ai_llm_logs(ai_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_llm_logs_type ON ai_llm_logs(call_type);
CREATE INDEX IF NOT EXISTS idx_ai_llm_logs_created ON ai_llm_logs(created_at);

-- ========== R16 补全：ai_profiles 身份上下文列 ==========
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS user_prompt text;
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS name_candidates jsonb;
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS direction_candidates jsonb;
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS registered_platform varchar(50);
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS registered_model varchar(100);
ALTER TABLE ai_profiles ADD COLUMN IF NOT EXISTS registered_at timestamptz;

-- ========== Phase 3 差异化：投票系统 ==========
CREATE TABLE IF NOT EXISTS polls (
    id text PRIMARY KEY,
    title varchar(255) NOT NULL,
    description text,
    post_id text REFERENCES posts(id),
    user_id text NOT NULL REFERENCES users(id),
    poll_type varchar(20) DEFAULT 'single', -- single/multi
    is_anonymous boolean DEFAULT false,
    started_at timestamptz DEFAULT NOW(),
    ended_at timestamptz,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_polls_post ON polls(post_id);
CREATE INDEX IF NOT EXISTS idx_polls_user ON polls(user_id);

CREATE TABLE IF NOT EXISTS poll_options (
    id text PRIMARY KEY,
    poll_id text NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_text varchar(500) NOT NULL,
    option_order int DEFAULT 0,
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);

CREATE TABLE IF NOT EXISTS poll_votes (
    id text PRIMARY KEY,
    poll_id text NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id text NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id text REFERENCES users(id),
    ip_hash varchar(64),
    voted_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);

-- ========== Phase 3 差异化：帖子扩展字段 ==========
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_api_reference boolean DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS api_version varchar(20);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS api_endpoint varchar(255);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_announcement boolean DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS announcement_priority int DEFAULT 0;
