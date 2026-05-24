-- ============================================================================
-- Library Self-Checkout System — Consolidated schema baseline
-- ----------------------------------------------------------------------------
-- Generated 2026-05-08 from live Supabase project zjlebdnlquxkfcdycssy
-- (organization bjqytaomjxbmxhuvvliz, region ap-southeast-1, Postgres 17.6).
--
-- This file is a SNAPSHOT of the current production schema, including objects
-- created outside `supabase/migrations/` (most of the base tables were created
-- via Supabase Studio before the migration directory existed). To recreate the
-- database from scratch on a fresh project, run this file once, then apply any
-- newer files in `supabase/migrations/` in chronological order.
--
-- Naming convention (project-wide): tables PascalCase, columns/enums snake_case.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS vector;       -- pgvector for Books.embedding
CREATE EXTENSION IF NOT EXISTS pg_cron;      -- scheduled jobs (managed)
CREATE EXTENSION IF NOT EXISTS supabase_vault;


-- ---------------------------------------------------------------------------
-- 2. Enum types (PascalCase type names per current production)
-- ---------------------------------------------------------------------------
CREATE TYPE "UserRole" AS ENUM ('admin', 'staff', 'user');

CREATE TYPE "CopyStatus" AS ENUM (
    'available', 'on_loan', 'lost', 'damaged', 'processing', 'hold_shelf'
);

CREATE TYPE "HoldStatus" AS ENUM (
    'queued', 'ready', 'fulfilled', 'canceled', 'expired'
);

CREATE TYPE "NotificationType" AS ENUM (
    'hold_ready', 'hold_expired', 'loan_due_soon', 'loan_overdue', 'generic'
);

CREATE TYPE "NotificationChannel" AS ENUM ('email', 'in_app');

CREATE TYPE "NotificationStatus" AS ENUM (
    'pending', 'sending', 'sent', 'failed', 'cancelled'
);

CREATE TYPE "ProfileVisibility" AS ENUM ('public', 'campus', 'private');

CREATE TYPE "PreferredLanguage" AS ENUM ('english', 'chinese', 'malay');

CREATE TYPE "InterestType" AS ENUM (
    'computer_science', 'engineering', 'design', 'business'
);

CREATE TYPE "FriendStatus" AS ENUM (
    'pending', 'accepted', 'declined', 'blocked', 'muted'
);

CREATE TYPE "CommunityVisibility" AS ENUM ('public', 'campus', 'private');

CREATE TYPE "CommunityMemberRole" AS ENUM ('owner', 'moderator', 'member');

CREATE TYPE "CommunityMemberStatus" AS ENUM (
    'active', 'pending', 'banned', 'left'
);

CREATE TYPE "CommunityPostType" AS ENUM (
    'discussion', 'event', 'announcement', 'recommendation'
);


-- ---------------------------------------------------------------------------
-- 3. Core identity tables
-- ---------------------------------------------------------------------------

CREATE TABLE "Users" (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email             text NOT NULL UNIQUE,
    display_name      text,
    role              "UserRole" NOT NULL DEFAULT 'user',
    primary_identity  uuid,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "UserIdentities" (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL DEFAULT gen_random_uuid(),
    provider          text NOT NULL,
    provider_subject  text,
    email             text,
    metadata          jsonb,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "UserProfile" (
    user_id             uuid PRIMARY KEY
                        REFERENCES "Users"(id) ON DELETE CASCADE,
    username            text UNIQUE,
    display_name        text,
    avatar_url          text,
    phone               text,
    preferred_language  text,
    bio                 text,
    faculty             text,
    department          text,
    intake_year         integer
                        CHECK (intake_year IS NULL
                               OR (intake_year >= 1990
                                   AND intake_year <= EXTRACT(year FROM now())::integer + 1)),
    student_id          text,
    links               jsonb,
    visibility          "ProfileVisibility" DEFAULT 'campus',
    updated_at          timestamptz NOT NULL DEFAULT now(),
    followers_count     integer NOT NULL DEFAULT 0,
    following_count     integer NOT NULL DEFAULT 0,
    interest            "InterestType"
);

CREATE TABLE "UserInterests" (
    user_id     uuid PRIMARY KEY
                REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    interests   text NOT NULL DEFAULT ''::text,
    updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE "UserInterests" IS
    'Stores user-selected interests for personalization and recommendations';
COMMENT ON COLUMN "UserInterests".user_id IS 'References the user ID from public.Users';
COMMENT ON COLUMN "UserInterests".interests IS
    'Array of user-selected interest class keys such as computer_science, engineering, design_and_arts, business';

CREATE INDEX idx_user_interests_user_id ON "UserInterests"(user_id);
CREATE INDEX idx_userinterests_user_id  ON "UserInterests"(user_id);


-- ---------------------------------------------------------------------------
-- 4. Catalogue: books, copies, tags
-- ---------------------------------------------------------------------------

CREATE TABLE "Books" (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title             text,
    author            text,
    publisher         text DEFAULT '',
    isbn              text,
    classification    text,
    cover_image_url   text,
    publication_year  text,
    created_at        timestamptz,
    updated_at        timestamptz,
    hashtag           text,
    level             smallint,
    category          text
                      CHECK (category = ANY (ARRAY[
                          'Computer Science', 'Art & Design', 'Business',
                          'Engineering', 'Psychology', 'Self-help', 'History'])),
    embedding         vector
);

CREATE INDEX books_title_trgm_idx     ON "Books" USING gin (title  gin_trgm_ops);
CREATE INDEX books_author_trgm_idx    ON "Books" USING gin (author gin_trgm_ops);
CREATE INDEX books_embedding_idx      ON "Books"
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE "Copies" (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id     uuid NOT NULL REFERENCES "Books"(id),
    barcode     text,
    status      "CopyStatus" DEFAULT 'available',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "BookTags" (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "BookTagsLinks" (
    book_id  uuid NOT NULL REFERENCES "Books"(id),
    tag_id   uuid NOT NULL REFERENCES "BookTags"(id),
    PRIMARY KEY (book_id, tag_id)
);

-- Staging table for the initial CSV ingest of book inventory.
CREATE TABLE "StgBooksRows" (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title                 text,
    author                text,
    isbn                  text,
    barcode               text,
    classification        text,
    location              text,
    cover_image_url       text,
    total_copies          integer,
    avaliable_copies      integer,         -- sic — original column spelling
    status                text,
    last_transaction_at   timestamptz,
    created_at            timestamptz NOT NULL DEFAULT now(),
    update_at             timestamptz DEFAULT now(),
    avaliable             boolean,         -- sic
    copies_avaliable      integer          -- sic
);


-- ---------------------------------------------------------------------------
-- 5. Circulation: loans, holds, damage reports
-- ---------------------------------------------------------------------------

CREATE TABLE "Loans" (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    copy_id           uuid NOT NULL REFERENCES "Copies"(id),
    user_id           uuid NOT NULL REFERENCES "Users"(id),
    borrowed_at       timestamptz NOT NULL DEFAULT now(),
    due_at            timestamptz NOT NULL,
    returned_at       timestamptz,
    renewed_count     integer NOT NULL DEFAULT 0,
    handled_by        uuid REFERENCES "Users"(id),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    last_reminded_at  timestamptz,
    last_reminded_by  uuid REFERENCES "Users"(id) ON DELETE SET NULL
);

CREATE INDEX idx_loans_overdue_active ON "Loans"(due_at)
    WHERE returned_at IS NULL;

CREATE TABLE "Holds" (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patron_id             uuid REFERENCES "Users"(id) ON DELETE CASCADE,
    book_id               uuid REFERENCES "Books"(id),
    status                "HoldStatus" DEFAULT 'queued',
    placed_at             timestamptz,
    ready_at              timestamptz,
    expires_at            timestamptz,
    fulfilled_by_copy_id  uuid REFERENCES "Copies"(id),
    created_at            timestamptz NOT NULL,
    updated_at            timestamptz NOT NULL
);

CREATE TABLE "HoldHistory" (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hold_id     uuid NOT NULL REFERENCES "Holds"(id) ON DELETE CASCADE,
    action      text NOT NULL,
    actor_id    uuid REFERENCES "Users"(id) ON DELETE SET NULL,
    details     jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "DamageReports" (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id      uuid NOT NULL REFERENCES "Loans"(id) ON DELETE CASCADE,
    copy_id      uuid NOT NULL REFERENCES "Copies"(id) ON DELETE CASCADE,
    reported_by  uuid REFERENCES "Users"(id) ON DELETE SET NULL,
    severity     text NOT NULL
                 CHECK (severity = ANY (ARRAY['damaged','lost','needs_inspection'])),
    notes        text,
    photo_urls   jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "DamageReports" ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_damage_reports_copy        ON "DamageReports"(copy_id);
CREATE INDEX idx_damage_reports_created_at  ON "DamageReports"(created_at DESC);


-- ---------------------------------------------------------------------------
-- 6. Notifications
--    Note: two notification table families exist in the live DB. The app
--    primarily uses `Notifications` (plural, text-typed type column).
--    `Notification` (singular) and `NotificationQueue` belong to an earlier
--    enum-typed design that is still present.
-- ---------------------------------------------------------------------------

CREATE TABLE "Notifications" (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type            text NOT NULL
                    CHECK (type = ANY (ARRAY[
                        'checkout','checkin','loan_confirmed',
                        'due_soon','hold_ready','hold_placed'])),
    title           text NOT NULL,
    message         text NOT NULL,
    target_roles    text[] NOT NULL DEFAULT '{staff,admin}',
    metadata        jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    target_user_id  text
);

CREATE INDEX idx_notifications_created_at ON "Notifications"(created_at DESC);
CREATE INDEX idx_notifications_target_user
    ON "Notifications"(target_user_id) WHERE target_user_id IS NOT NULL;

CREATE TABLE "NotificationReads" (
    notification_id  uuid NOT NULL,
    user_id          uuid NOT NULL REFERENCES "Users"(id),
    read_at          timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX idx_notification_reads_user ON "NotificationReads"(user_id);

-- Legacy enum-typed notification table (kept for compatibility).
CREATE TABLE "Notification" (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type            "NotificationType" NOT NULL DEFAULT 'hold_ready',
    title           text NOT NULL,
    message         text,
    target_roles    jsonb,
    metadata        jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    target_user_id  uuid DEFAULT gen_random_uuid()
);

CREATE TABLE "NotificationQueue" (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patron_id      uuid NOT NULL REFERENCES "Users"(id),
    hold_id        uuid REFERENCES "Holds"(id),
    loan_id        uuid REFERENCES "Loans"(id),
    type           "NotificationType" NOT NULL,
    channel        "NotificationChannel" NOT NULL,
    title          text NOT NULL,
    body           text,
    payload        jsonb,
    status         "NotificationStatus" NOT NULL DEFAULT 'pending',
    scheduled_for  timestamptz NOT NULL DEFAULT now(),
    sent_at        timestamptz,
    error_message  text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 7. Social: friends, recommendations, communities
-- ---------------------------------------------------------------------------

CREATE TABLE "Friends" (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id  uuid NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    followed_id  uuid NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    status       "FriendStatus" NOT NULL DEFAULT 'pending',
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    approved_at  timestamptz,
    blocked_at   timestamptz,
    actioned_by  uuid REFERENCES "Users"(id)
);
ALTER TABLE "Friends" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friend connections"
    ON "Friends" FOR SELECT TO authenticated
    USING (auth.uid() = follower_id OR auth.uid() = followed_id);

CREATE POLICY "Users can create friend requests"
    ON "Friends" FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can update their own friend requests"
    ON "Friends" FOR UPDATE TO authenticated
    USING (auth.uid() = follower_id OR auth.uid() = followed_id);

CREATE TABLE "BookRecommendation" (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id  uuid NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    to_user_id    uuid NOT NULL REFERENCES "Users"(id) ON DELETE RESTRICT,
    book_id       uuid NOT NULL REFERENCES "Books"(id) ON DELETE CASCADE,
    message       text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    update_at     timestamptz NOT NULL DEFAULT now()      -- sic, "update_at"
);
ALTER TABLE "BookRecommendation" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "Community" (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             text NOT NULL,
    name             text NOT NULL,
    description      text,
    cover_image_url  text,
    visibility       "CommunityVisibility" NOT NULL,
    tags             text,
    created_by       uuid NOT NULL REFERENCES "Users"(id),
    created_at       timestamptz NOT NULL,
    updated_at       timestamptz NOT NULL
);

CREATE TABLE "CommunityMembers" (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id  uuid NOT NULL REFERENCES "Community"(id),
    user_id       uuid NOT NULL REFERENCES "Users"(id),
    role          "CommunityMemberRole"   NOT NULL DEFAULT 'member',
    status        "CommunityMemberStatus" NOT NULL DEFAULT 'active',
    joined_at     timestamptz NOT NULL DEFAULT now(),
    invited_by    uuid REFERENCES "Users"(id)
);

CREATE TABLE "CommunityPosts" (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id  uuid NOT NULL REFERENCES "Community"(id),
    author_id     uuid NOT NULL REFERENCES "Users"(id),
    type          "CommunityPostType",
    title         text NOT NULL,
    body          text,
    metadata      text,
    pinned        boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "CommunityPostComments" (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id            uuid NOT NULL REFERENCES "CommunityPosts"(id),
    author_id          uuid NOT NULL REFERENCES "Users"(id),
    body               text,
    parent_comment_id  uuid,
    created_at         timestamptz NOT NULL DEFAULT now(),
    update_at          timestamptz NOT NULL DEFAULT now()    -- sic
);

CREATE TABLE "CommunityBookRecommendations" (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id    uuid NOT NULL REFERENCES "Community"(id),
    post_id         uuid NOT NULL REFERENCES "CommunityPosts"(id),
    book_id         uuid NOT NULL REFERENCES "Books"(id),
    recommended_by  uuid NOT NULL REFERENCES "Users"(id),
    note            text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "CommunityRecommendationVotes" (
    recommendation_id  uuid NOT NULL
                       REFERENCES "CommunityBookRecommendations"(id) ON DELETE CASCADE,
    user_id            uuid NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    value              smallint NOT NULL DEFAULT 1,
    created_at         timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (recommendation_id, user_id)
);


-- ---------------------------------------------------------------------------
-- 8. Chat / AI assistance
-- ---------------------------------------------------------------------------

CREATE TABLE "AiChatHistory" (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL,
    message_id       text,
    sender           text,
    text             text,
    recommendations  jsonb,
    created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "AiChatHistory" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "GeneralChatHistory" (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    message_id  text,
    sender      text NOT NULL CHECK (sender = ANY (ARRAY['user','assistant'])),
    text        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_general_chat_history_user_created
    ON "GeneralChatHistory"(user_id, created_at);


-- ---------------------------------------------------------------------------
-- 9. Operational / audit
-- ---------------------------------------------------------------------------

CREATE TABLE "AuditLog" (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  text NOT NULL,
    entity      text NOT NULL,
    entity_id   text,
    actor_id    uuid REFERENCES "Users"(id),
    actor_role  text,
    source      text,
    success     boolean,
    diff        jsonb,
    context     text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "SipLogs" (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message     text,
    created_at  timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 10. Views
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW "ActiveLoans" AS
    SELECT id, copy_id, user_id, borrowed_at, due_at, returned_at,
           renewed_count, handled_by, created_at, updated_at
    FROM "Loans"
    WHERE returned_at IS NULL;

CREATE OR REPLACE VIEW "AvailableCopies" AS
    SELECT id, book_id, barcode, status, created_at, updated_at
    FROM "Copies" c
    WHERE status = 'available'::"CopyStatus"
      AND NOT EXISTS (
            SELECT 1 FROM "Loans" l
            WHERE l.copy_id = c.id AND l.returned_at IS NULL);

CREATE OR REPLACE VIEW "MyProfile" AS
    SELECT u.id AS user_id, u.email, u.role,
           p.username,
           COALESCE(p.display_name, u.display_name) AS display_name,
           p.avatar_url, p.phone, p.preferred_language, p.bio,
           p.faculty, p.department, p.intake_year, p.student_id,
           p.links, p.visibility, p.updated_at
    FROM "Users" u
    LEFT JOIN "UserProfile" p ON p.user_id = u.id;

CREATE OR REPLACE VIEW "PublicProfile" AS
    SELECT u.id AS user_id,
           COALESCE(p.username, split_part(u.email, '@', 1)) AS username,
           COALESCE(p.display_name, u.display_name) AS display_name,
           p.avatar_url, p.bio, p.faculty, p.department, p.intake_year,
           CASE WHEN p.visibility = 'public'::"ProfileVisibility"
                THEN p.links ELSE NULL::jsonb END AS links,
           p.visibility
    FROM "Users" u
    LEFT JOIN "UserProfile" p ON p.user_id = u.id;

CREATE OR REPLACE VIEW "FriendList" AS
    SELECT f.id,
           f.follower_id AS user_id,
           f.followed_id AS friend_id,
           f.status,
           up.username      AS friend_username,
           COALESCE(up.display_name, u.display_name) AS friend_display_name,
           up.avatar_url    AS friend_avatar_url,
           f.created_at, f.updated_at
    FROM "Friends" f
    JOIN "Users" u ON u.id = f.followed_id
    LEFT JOIN "UserProfile" up ON up.user_id = f.followed_id;

CREATE OR REPLACE VIEW "InventoryByTag" AS
    WITH base AS (
        SELECT bt.name AS tag, b.id AS book_id
        FROM "BookTagsLinks" btl
        JOIN "BookTags" bt ON bt.id = btl.tag_id
        JOIN "Books"    b  ON b.id  = btl.book_id
    ),
    totals AS (
        SELECT base.tag, count(*)::integer AS total_copies
        FROM base
        JOIN "Copies" c ON c.book_id = base.book_id
        GROUP BY base.tag
    ),
    avail AS (
        SELECT base.tag, count(*)::integer AS available_copies
        FROM base
        JOIN "Copies" c ON c.book_id = base.book_id
        WHERE c.status = 'available'::"CopyStatus"
          AND NOT EXISTS (
                SELECT 1 FROM "Loans" l
                WHERE l.copy_id = c.id AND l.returned_at IS NULL)
        GROUP BY base.tag
    )
    SELECT t.tag, t.total_copies,
           COALESCE(a.available_copies, 0) AS "AvailableCopies"
    FROM totals t
    LEFT JOIN avail a USING (tag);


-- ---------------------------------------------------------------------------
-- 11. Functions (project-defined RPCs)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_books(q text)
    RETURNS TABLE(id uuid)
    LANGUAGE sql STABLE
AS $$
    SELECT b.id FROM "Books" b
    WHERE word_similarity(q, b.title) > 0.3
       OR word_similarity(q, COALESCE(b.author, '')) > 0.3
       OR b.title                       ILIKE '%' || q || '%'
       OR COALESCE(b.author, '')        ILIKE '%' || q || '%'
       OR COALESCE(b.isbn, '')          ILIKE '%' || q || '%'
       OR COALESCE(b.classification,'') ILIKE '%' || q || '%'
       OR COALESCE(b.publisher, '')     ILIKE '%' || q || '%'
    ORDER BY GREATEST(
        word_similarity(q, b.title),
        word_similarity(q, COALESCE(b.author, ''))
    ) DESC
    LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.match_books(
    query_embedding vector,
    match_count     integer DEFAULT 12
)
    RETURNS TABLE(id uuid, score double precision)
    LANGUAGE sql STABLE
AS $$
    SELECT id, 1 - (embedding <=> query_embedding) AS score
    FROM "Books"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;


-- ---------------------------------------------------------------------------
-- 12. Storage buckets
--     Buckets cannot always be created via SQL on managed Supabase; if the
--     INSERT fails, create them via the Supabase dashboard:
--       - avatars        : public, no size/MIME limits
--       - damage-reports : private, no size/MIME limits (used by staff)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('avatars',        'avatars',        true),
    ('damage-reports', 'damage-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Avatars bucket policies (storage.objects)
CREATE POLICY "Avatar read access 1oj01fe_0"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'avatars');

CREATE POLICY "Avatar write access 1oj01fe_1"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

CREATE POLICY "Avatar write access 1oj01fe_2"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid() = owner);

CREATE POLICY "Avatar write access 1oj01fe_3"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid() = owner);


-- ---------------------------------------------------------------------------
-- 13. Outstanding security advisory (Supabase advisor, 2026-05-08)
-- ---------------------------------------------------------------------------
-- Row Level Security is currently DISABLED on 25 tables in production:
--   Users, Books, Copies, BookTags, BookTagsLinks, Loans, Community,
--   CommunityMembers, CommunityPosts, CommunityPostComments,
--   CommunityBookRecommendations, Holds, NotificationQueue, NotificationReads,
--   Notification, AuditLog, CommunityRecommendationVotes, SipLogs, UserProfile,
--   HoldHistory, StgBooksRows, UserIdentities, UserInterests, Notifications,
--   GeneralChatHistory.
-- These tables are reachable by the anon and authenticated roles via the
-- Supabase client libraries. The app currently relies on the service-role key
-- (server-only) for safe access, which masks the issue from the application's
-- perspective. Before exposing the anon key to additional clients, enable RLS
-- and add policies. A baseline `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
-- block is intentionally omitted from this file because enabling RLS without
-- policies will block legitimate service-role traffic.
