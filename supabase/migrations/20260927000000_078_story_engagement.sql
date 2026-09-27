-- 078 Story Engagement: Views, Likes, Comments
-- Authoritative server-side counters, idempotent story play tracking, and tenant/story-safe constraints.

CREATE TABLE IF NOT EXISTS public.story_engagement_counts (
  story_id text PRIMARY KEY,
  views_count bigint NOT NULL DEFAULT 0 CHECK (views_count >= 0),
  likes_count bigint NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  comments_count bigint NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.story_engagement_counts IS
  'Authoritative aggregate engagement counters for stories and broadcast segments';

CREATE INDEX IF NOT EXISTS idx_story_engagement_counts_updated
  ON public.story_engagement_counts (updated_at DESC);

ALTER TABLE public.story_engagement_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "story_engagement_counts_read_public" ON public.story_engagement_counts;
CREATE POLICY "story_engagement_counts_read_public"
  ON public.story_engagement_counts FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "story_engagement_counts_service" ON public.story_engagement_counts;
CREATE POLICY "story_engagement_counts_service"
  ON public.story_engagement_counts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 1. Idempotent Story Play Logging (Views)
CREATE TABLE IF NOT EXISTS public.story_views_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id text NOT NULL,
  play_cycle_id text NOT NULL UNIQUE,
  user_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.story_views_log IS
  'Idempotent log of genuine story plays (runs on active TV agent with browser visible)';

CREATE INDEX IF NOT EXISTS idx_story_views_log_story
  ON public.story_views_log (story_id, created_at DESC);

ALTER TABLE public.story_views_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "story_views_log_insert_public" ON public.story_views_log;
CREATE POLICY "story_views_log_insert_public"
  ON public.story_views_log FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "story_views_log_select_service" ON public.story_views_log;
CREATE POLICY "story_views_log_select_service"
  ON public.story_views_log FOR SELECT TO service_role
  USING (true);

-- 2. Authoritative Likes
CREATE TABLE IF NOT EXISTS public.story_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id text NOT NULL,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT story_likes_unique UNIQUE (story_id, user_id)
);

COMMENT ON TABLE public.story_likes IS
  'Persistent story likes keyed by story and user';

CREATE INDEX IF NOT EXISTS idx_story_likes_story
  ON public.story_likes (story_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_story_likes_user
  ON public.story_likes (user_id);

ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "story_likes_read_public" ON public.story_likes;
CREATE POLICY "story_likes_read_public"
  ON public.story_likes FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "story_likes_manage_public" ON public.story_likes;
CREATE POLICY "story_likes_manage_public"
  ON public.story_likes FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 3. Authoritative Comments
CREATE TABLE IF NOT EXISTS public.story_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  comment_text text NOT NULL CHECK (char_length(trim(comment_text)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.story_comments IS
  'Public comments on stories';

CREATE INDEX IF NOT EXISTS idx_story_comments_story
  ON public.story_comments (story_id, created_at DESC);

ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "story_comments_read_public" ON public.story_comments;
CREATE POLICY "story_comments_read_public"
  ON public.story_comments FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "story_comments_insert_public" ON public.story_comments;
CREATE POLICY "story_comments_insert_public"
  ON public.story_comments FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 4. Atomic RPC Functions

-- Record story play idempotently
CREATE OR REPLACE FUNCTION public.record_story_play(
  p_story_id text,
  p_play_cycle_id text,
  p_user_id text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted boolean := false;
  v_count bigint;
BEGIN
  -- Insert into log with ON CONFLICT DO NOTHING for exact idempotency
  INSERT INTO public.story_views_log (story_id, play_cycle_id, user_id)
  VALUES (p_story_id, p_play_cycle_id, p_user_id)
  ON CONFLICT (play_cycle_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted THEN
    INSERT INTO public.story_engagement_counts (story_id, views_count, updated_at)
    VALUES (p_story_id, 1, now())
    ON CONFLICT (story_id) DO UPDATE
    SET views_count = public.story_engagement_counts.views_count + 1,
        updated_at = now()
    RETURNING views_count INTO v_count;
  ELSE
    SELECT views_count INTO v_count
    FROM public.story_engagement_counts
    WHERE story_id = p_story_id;
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Toggle like atomically
CREATE OR REPLACE FUNCTION public.toggle_story_like(
  p_story_id text,
  p_user_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
  v_liked boolean;
  v_count bigint;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.story_likes
    WHERE story_id = p_story_id AND user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.story_likes
    WHERE story_id = p_story_id AND user_id = p_user_id;

    UPDATE public.story_engagement_counts
    SET likes_count = GREATEST(0, likes_count - 1),
        updated_at = now()
    WHERE story_id = p_story_id
    RETURNING likes_count INTO v_count;

    v_liked := false;
  ELSE
    INSERT INTO public.story_likes (story_id, user_id)
    VALUES (p_story_id, p_user_id)
    ON CONFLICT (story_id, user_id) DO NOTHING;

    INSERT INTO public.story_engagement_counts (story_id, likes_count, updated_at)
    VALUES (p_story_id, 1, now())
    ON CONFLICT (story_id) DO UPDATE
    SET likes_count = public.story_engagement_counts.likes_count + 1,
        updated_at = now()
    RETURNING likes_count INTO v_count;

    v_liked := true;
  END IF;

  RETURN jsonb_build_object('liked', v_liked, 'likes_count', COALESCE(v_count, 0));
END;
$$;

-- Add comment atomically
CREATE OR REPLACE FUNCTION public.add_story_comment(
  p_story_id text,
  p_user_id text,
  p_user_name text,
  p_comment_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comment_id uuid;
  v_created_at timestamptz;
  v_count bigint;
BEGIN
  INSERT INTO public.story_comments (story_id, user_id, user_name, comment_text)
  VALUES (p_story_id, p_user_id, p_user_name, trim(p_comment_text))
  RETURNING id, created_at INTO v_comment_id, v_created_at;

  INSERT INTO public.story_engagement_counts (story_id, comments_count, updated_at)
  VALUES (p_story_id, 1, now())
  ON CONFLICT (story_id) DO UPDATE
  SET comments_count = public.story_engagement_counts.comments_count + 1,
      updated_at = now()
  RETURNING comments_count INTO v_count;

  RETURN jsonb_build_object(
    'id', v_comment_id,
    'story_id', p_story_id,
    'user_name', p_user_name,
    'comment_text', trim(p_comment_text),
    'created_at', v_created_at,
    'comments_count', COALESCE(v_count, 1)
  );
END;
$$;

-- Batch query engagement for multiple stories
CREATE OR REPLACE FUNCTION public.get_stories_engagement(
  p_story_ids text[],
  p_user_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_object_agg(
    sub.story_id,
    jsonb_build_object(
      'views', COALESCE(e.views_count, 0),
      'likes', COALESCE(e.likes_count, 0),
      'comments', COALESCE(e.comments_count, 0),
      'user_liked', CASE WHEN p_user_id IS NOT NULL AND l.id IS NOT NULL THEN true ELSE false END
    )
  )
  INTO v_result
  FROM unnest(p_story_ids) AS sub(story_id)
  LEFT JOIN public.story_engagement_counts e ON e.story_id = sub.story_id
  LEFT JOIN public.story_likes l ON l.story_id = sub.story_id AND l.user_id = p_user_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- Grant permissions to anon & authenticated
GRANT SELECT, INSERT ON public.story_engagement_counts TO anon, authenticated;
GRANT SELECT, INSERT ON public.story_views_log TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.story_likes TO anon, authenticated;
GRANT SELECT, INSERT ON public.story_comments TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_story_play(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_story_like(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_story_comment(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_stories_engagement(text[], text) TO anon, authenticated;
