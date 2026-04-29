-- AILL 建表脚本
-- 基于现有内存数据结构 + 用户提供的参考 SQL
-- 所有时间字段用 timestamptz，所有 ID 用 text（匹配 generateId）

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
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

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
