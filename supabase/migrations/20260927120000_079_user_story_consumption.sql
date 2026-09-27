-- 079 Personalized Unread / Unheard Queue & Story Consumption Tracking
-- Maintains authoritative server-side consumption state per authenticated user.
-- Columns: user_id, story_id, read, played, consumed, first_consumed_at, last_consumed_at, created_at, updated_at

CREATE TABLE IF NOT EXISTS public.user_story_consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  story_id text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  played boolean NOT NULL DEFAULT false,
  consumed boolean NOT NULL DEFAULT false,
  first_consumed_at timestamptz,
  last_consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_story_consumption_unique UNIQUE (user_id, story_id)
);

COMMENT ON TABLE public.user_story_consumption IS
  'Persistent personal news consumption tracking for authenticated and client readers';

CREATE INDEX IF NOT EXISTS idx_user_story_consumption_user
  ON public.user_story_consumption (user_id);

CREATE INDEX IF NOT EXISTS idx_user_story_consumption_story
  ON public.user_story_consumption (story_id);

CREATE INDEX IF NOT EXISTS idx_user_story_consumption_user_consumed
  ON public.user_story_consumption (user_id, consumed);

ALTER TABLE public.user_story_consumption ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_story_consumption_read_public" ON public.user_story_consumption;
CREATE POLICY "user_story_consumption_read_public"
  ON public.user_story_consumption FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "user_story_consumption_insert_public" ON public.user_story_consumption;
CREATE POLICY "user_story_consumption_insert_public"
  ON public.user_story_consumption FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "user_story_consumption_update_public" ON public.user_story_consumption;
CREATE POLICY "user_story_consumption_update_public"
  ON public.user_story_consumption FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user_story_consumption_service" ON public.user_story_consumption;
CREATE POLICY "user_story_consumption_service"
  ON public.user_story_consumption FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Atomic RPC: record_story_consumption
CREATE OR REPLACE FUNCTION public.record_story_consumption(
  p_user_id text,
  p_story_id text,
  p_action text -- 'consumed', 'played', 'read'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec public.user_story_consumption;
  v_now timestamptz := now();
  v_consumed boolean := (p_action = 'consumed' OR p_action = 'read');
  v_read boolean := (p_action = 'read');
  v_played boolean := (p_action = 'played' OR p_action = 'consumed');
BEGIN
  INSERT INTO public.user_story_consumption (
    user_id,
    story_id,
    read,
    played,
    consumed,
    first_consumed_at,
    last_consumed_at,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_story_id,
    v_read,
    v_played,
    v_consumed,
    CASE WHEN v_consumed THEN v_now ELSE NULL END,
    CASE WHEN v_consumed THEN v_now ELSE NULL END,
    v_now,
    v_now
  )
  ON CONFLICT (user_id, story_id) DO UPDATE
  SET
    read = public.user_story_consumption.read OR v_read,
    played = public.user_story_consumption.played OR v_played,
    consumed = public.user_story_consumption.consumed OR v_consumed,
    first_consumed_at = COALESCE(public.user_story_consumption.first_consumed_at, CASE WHEN v_consumed THEN v_now ELSE NULL END),
    last_consumed_at = CASE WHEN v_consumed THEN v_now ELSE public.user_story_consumption.last_consumed_at END,
    updated_at = v_now
  RETURNING * INTO v_rec;

  RETURN jsonb_build_object(
    'user_id', v_rec.user_id,
    'story_id', v_rec.story_id,
    'read', v_rec.read,
    'played', v_rec.played,
    'consumed', v_rec.consumed,
    'first_consumed_at', v_rec.first_consumed_at,
    'last_consumed_at', v_rec.last_consumed_at
  );
END;
$$;

-- Atomic RPC: get_user_consumption_batch
CREATE OR REPLACE FUNCTION public.get_user_consumption_batch(
  p_user_id text,
  p_story_ids text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_story_ids IS NOT NULL AND array_length(p_story_ids, 1) > 0 THEN
    SELECT jsonb_object_agg(
      c.story_id,
      jsonb_build_object(
        'read', c.read,
        'played', c.played,
        'consumed', c.consumed,
        'first_consumed_at', c.first_consumed_at,
        'last_consumed_at', c.last_consumed_at
      )
    )
    INTO v_result
    FROM public.user_story_consumption c
    WHERE c.user_id = p_user_id
      AND c.story_id = ANY(p_story_ids);
  ELSE
    SELECT jsonb_object_agg(
      c.story_id,
      jsonb_build_object(
        'read', c.read,
        'played', c.played,
        'consumed', c.consumed,
        'first_consumed_at', c.first_consumed_at,
        'last_consumed_at', c.last_consumed_at
      )
    )
    INTO v_result
    FROM public.user_story_consumption c
    WHERE c.user_id = p_user_id;
  END IF;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT SELECT, INSERT, UPDATE ON public.user_story_consumption TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_story_consumption(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_consumption_batch(text, text[]) TO anon, authenticated;
